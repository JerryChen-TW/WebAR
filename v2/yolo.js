// YOLOv8 pre/post processing + ONNX inference

// Quantized model (~6MB vs ~12MB full). Swap URL for full precision if needed.
const MODEL_URL =
  "https://huggingface.co/Xenova/yolov8n/resolve/main/onnx/model_quantized.onnx";

const INPUT_SIZE   = 640;
const CONF_THRESH  = 0.35;
const IOU_THRESH   = 0.45;
const NUM_CLASSES  = 80;

let session = null;

// ── Load model ──────────────────────────────────────────────────────────────
export async function loadModel(onProgress) {
  const ort = await import(
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.mjs"
  );
  ort.env.wasm.wasmPaths =
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/";

  onProgress?.("Downloading YOLOv8 model…");

  // Fetch with progress tracking
  const resp = await fetch(MODEL_URL);
  const total = parseInt(resp.headers.get("content-length") || "0");
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
  const modelBuffer = new Uint8Array(chunks.reduce((acc, c) => {
    const merged = new Uint8Array(acc.length + c.length);
    merged.set(acc); merged.set(c, acc.length);
    return merged;
  }, new Uint8Array(0)));

  onProgress?.("Initialising model…");
  session = await ort.InferenceSession.create(modelBuffer.buffer, {
    executionProviders: ["webgl", "wasm"]
  });
  return session;
}

// ── Pre-process ─────────────────────────────────────────────────────────────
// Returns { tensor, scaleX, scaleY, padLeft, padTop }
export function preprocess(videoEl) {
  const ort_ns = window.__ort__;          // set after import
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;

  // Letterbox: keep aspect ratio, pad to 640×640
  const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
  const nw    = Math.round(vw * scale);
  const nh    = Math.round(vh * scale);
  const padL  = Math.floor((INPUT_SIZE - nw) / 2);
  const padT  = Math.floor((INPUT_SIZE - nh) / 2);

  const offscreen = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const g = offscreen.getContext("2d");
  g.fillStyle = "#808080";
  g.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  g.drawImage(videoEl, padL, padT, nw, nh);

  const imgData = g.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = imgData;

  // NHWC → NCHW, normalize to [0,1]
  const float32 = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const area    = INPUT_SIZE * INPUT_SIZE;
  for (let i = 0; i < area; i++) {
    float32[i]          = data[i * 4]     / 255; // R
    float32[area + i]   = data[i * 4 + 1] / 255; // G
    float32[area*2 + i] = data[i * 4 + 2] / 255; // B
  }

  return {
    float32,
    scaleX: 1 / scale,
    scaleY: 1 / scale,
    padL,
    padT
  };
}

// ── Run inference ────────────────────────────────────────────────────────────
export async function runInference(float32) {
  const ort = await import(
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.mjs"
  );
  const tensor = new ort.Tensor("float32", float32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const feeds  = { images: tensor };
  const result = await session.run(feeds);
  // YOLOv8 output key is "output0"
  return result["output0"].data; // shape [1, 84, 8400]
}

// ── Post-process ─────────────────────────────────────────────────────────────
export function postprocess(rawOutput, { scaleX, scaleY, padL, padT }, origW, origH) {
  // rawOutput: Float32Array of shape [84 × 8400] (batch dim stripped)
  const numBoxes = 8400;
  const detections = [];

  for (let i = 0; i < numBoxes; i++) {
    // Find best class score
    let maxScore = 0, maxClass = 0;
    for (let c = 0; c < NUM_CLASSES; c++) {
      const score = rawOutput[(4 + c) * numBoxes + i];
      if (score > maxScore) { maxScore = score; maxClass = c; }
    }
    if (maxScore < CONF_THRESH) continue;

    // cx, cy, w, h in INPUT_SIZE space
    const cx = rawOutput[0 * numBoxes + i];
    const cy = rawOutput[1 * numBoxes + i];
    const bw = rawOutput[2 * numBoxes + i];
    const bh = rawOutput[3 * numBoxes + i];

    // Remove letterbox padding, scale back to original video coords
    const x1 = Math.max(0, ((cx - bw / 2) - padL) * scaleX);
    const y1 = Math.max(0, ((cy - bh / 2) - padT) * scaleY);
    const x2 = Math.min(origW, ((cx + bw / 2) - padL) * scaleX);
    const y2 = Math.min(origH, ((cy + bh / 2) - padT) * scaleY);

    detections.push({ x1, y1, x2, y2, score: maxScore, classIdx: maxClass });
  }

  return nms(detections);
}

// ── NMS ──────────────────────────────────────────────────────────────────────
function nms(dets) {
  dets.sort((a, b) => b.score - a.score);
  const keep = [];
  const suppressed = new Uint8Array(dets.length);

  for (let i = 0; i < dets.length; i++) {
    if (suppressed[i]) continue;
    keep.push(dets[i]);
    for (let j = i + 1; j < dets.length; j++) {
      if (suppressed[j]) continue;
      if (iou(dets[i], dets[j]) > IOU_THRESH) suppressed[j] = 1;
    }
  }
  return keep;
}

function iou(a, b) {
  const ix1 = Math.max(a.x1, b.x1), iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2), iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const aA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const bA = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (aA + bA - inter + 1e-6);
}
