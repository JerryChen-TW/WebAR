// YOLOv8n ONNX inference — iOS compatible

const MODEL_URL = "./yolov8n.onnx";

const INPUT_SIZE  = 640;
const CONF_THRESH = 0.35;
const IOU_THRESH  = 0.45;
const NUM_CLASSES = 80;

// ort is loaded via <script> tag in index.html as window.ort (UMD bundle)
let session = null;

// Reusable off-screen canvas (OffscreenCanvas not supported on iOS)
let _canvas = null;
let _ctx    = null;
function getCanvas() {
  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _canvas.width  = INPUT_SIZE;
    _canvas.height = INPUT_SIZE;
    _ctx = _canvas.getContext("2d");
  }
  return { canvas: _canvas, ctx: _ctx };
}

// ── Load model ──────────────────────────────────────────────────────────────
export async function loadModel(onProgress) {
  onProgress?.("Loading ONNX runtime…");

  const ort = window.ort;
  if (!ort) throw new Error("ONNX Runtime not loaded — check network");

  // iOS: no SharedArrayBuffer, must use single thread
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths =
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/";

  onProgress?.("Downloading YOLOv8 model…");

  let modelBuffer;
  try {
    const resp = await fetch(MODEL_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const total  = parseInt(resp.headers.get("content-length") || "0");
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total > 0) {
        const pct = Math.round((received / total) * 100);
        onProgress?.(`Downloading model… ${pct}%`);
      }
    }

    // Merge chunks
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    modelBuffer = merged.buffer;
  } catch (e) {
    throw new Error(`Model download failed: ${e.message}`);
  }

  onProgress?.("Initialising model…");
  try {
    session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ["webgl", "wasm"]
    });
  } catch (e) {
    throw new Error(`Model init failed: ${e.message}`);
  }
}

function getOrt() {
  const ort = window.ort;
  if (!ort) throw new Error("ONNX Runtime not available");
  return ort;
}

// ── Pre-process video frame → Float32Array ──────────────────────────────────
export function preprocess(videoEl) {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;

  // Letterbox scale + centre-pad to INPUT_SIZE×INPUT_SIZE
  const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
  const nw    = Math.round(vw * scale);
  const nh    = Math.round(vh * scale);
  const padL  = Math.floor((INPUT_SIZE - nw) / 2);
  const padT  = Math.floor((INPUT_SIZE - nh) / 2);

  const { ctx } = getCanvas();
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.drawImage(videoEl, padL, padT, nw, nh);

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

  // NHWC → NCHW float32 [0,1]
  const float32 = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const area    = INPUT_SIZE * INPUT_SIZE;
  for (let i = 0; i < area; i++) {
    float32[i]          = data[i * 4]     / 255; // R
    float32[area + i]   = data[i * 4 + 1] / 255; // G
    float32[area*2 + i] = data[i * 4 + 2] / 255; // B
  }

  return { float32, scaleX: 1 / scale, scaleY: 1 / scale, padL, padT };
}

// ── Inference ───────────────────────────────────────────────────────────────
export async function runInference(float32) {
  const ort    = getOrt();
  const tensor = new ort.Tensor("float32", float32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const result = await session.run({ images: tensor });
  // YOLOv8 ONNX output: key "output0", shape [1, 84, 8400]
  return result["output0"].data;
}

// ── Post-process ─────────────────────────────────────────────────────────────
export function postprocess(raw, { scaleX, scaleY, padL, padT }, origW, origH) {
  const N    = 8400;
  const dets = [];

  for (let i = 0; i < N; i++) {
    let maxScore = 0, maxClass = 0;
    for (let c = 0; c < NUM_CLASSES; c++) {
      const s = raw[(4 + c) * N + i];
      if (s > maxScore) { maxScore = s; maxClass = c; }
    }
    if (maxScore < CONF_THRESH) continue;

    const cx = raw[0 * N + i], cy = raw[1 * N + i];
    const bw = raw[2 * N + i], bh = raw[3 * N + i];

    dets.push({
      x1: Math.max(0,     ((cx - bw / 2) - padL) * scaleX),
      y1: Math.max(0,     ((cy - bh / 2) - padT) * scaleY),
      x2: Math.min(origW, ((cx + bw / 2) - padL) * scaleX),
      y2: Math.min(origH, ((cy + bh / 2) - padT) * scaleY),
      score: maxScore, classIdx: maxClass
    });
  }
  return nms(dets);
}

function nms(dets) {
  dets.sort((a, b) => b.score - a.score);
  const keep = [], sup = new Uint8Array(dets.length);
  for (let i = 0; i < dets.length; i++) {
    if (sup[i]) continue;
    keep.push(dets[i]);
    for (let j = i + 1; j < dets.length; j++) {
      if (!sup[j] && iou(dets[i], dets[j]) > IOU_THRESH) sup[j] = 1;
    }
  }
  return keep;
}

function iou(a, b) {
  const ix1 = Math.max(a.x1, b.x1), iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2), iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  return inter / ((a.x2-a.x1)*(a.y2-a.y1) + (b.x2-b.x1)*(b.y2-b.y1) - inter + 1e-6);
}
