/* global LABELS, LANGUAGE_NAMES, getLabel */

// ── State ──────────────────────────────────────────────────────────────────
let currentLang = "en";
let detector = null;
let animFrame = null;
let lastDetections = [];

const video   = document.getElementById("video");
const canvas  = document.getElementById("canvas");
const ctx     = canvas.getContext("2d");
const loading = document.getElementById("loading");
const loadTxt = document.getElementById("loading-text");
const status  = document.getElementById("status");
const badge   = document.getElementById("count-badge");
const camErr  = document.getElementById("cam-error");
const langBtn = document.getElementById("lang-btn");
const langMenu= document.getElementById("lang-menu");

// ── Palette ────────────────────────────────────────────────────────────────
const COLORS = [
  "#FF3B30","#FF9500","#FFCC00","#34C759","#00C7BE",
  "#007AFF","#5856D6","#AF52DE","#FF2D55","#A2845E"
];
function colorFor(label) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) & 0xFFFF;
  return COLORS[h % COLORS.length];
}

// ── Language menu ──────────────────────────────────────────────────────────
function buildLangMenu() {
  langMenu.innerHTML = "";
  for (const [code, name] of Object.entries(LANGUAGE_NAMES)) {
    const div = document.createElement("div");
    div.className = "lang-option" + (code === currentLang ? " selected" : "");
    div.textContent = name;
    div.dataset.code = code;
    div.addEventListener("click", () => selectLang(code));
    langMenu.appendChild(div);
  }
}

function selectLang(code) {
  currentLang = code;
  langBtn.querySelector(".lang-label").textContent = LANGUAGE_NAMES[code];
  buildLangMenu();
  langMenu.classList.remove("open");
}

langBtn.addEventListener("click", e => {
  e.stopPropagation();
  langMenu.classList.toggle("open");
});
document.addEventListener("click", () => langMenu.classList.remove("open"));

// ── Canvas sizing ──────────────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
  canvas.height = canvas.offsetHeight * window.devicePixelRatio;
}
window.addEventListener("resize", resizeCanvas);

// ── Camera ─────────────────────────────────────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width:  { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    video.srcObject = stream;
    await new Promise(res => { video.onloadedmetadata = res; });
    await video.play();
    resizeCanvas();
  } catch (err) {
    console.error("Camera error:", err);
    camErr.style.display = "flex";
    loading.classList.add("hidden");
  }
}

document.getElementById("retry-btn").addEventListener("click", () => {
  camErr.style.display = "none";
  loading.classList.remove("hidden");
  init();
});

// ── MediaPipe Object Detection ─────────────────────────────────────────────
async function loadDetector() {
  loadTxt.textContent = "Loading AI model…";

  // Dynamically import MediaPipe Tasks Vision
  const { FilesetResolver, ObjectDetector } =
    await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/vision_bundle.mjs");

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
  );

  detector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
      delegate: "GPU"
    },
    scoreThreshold: 0.4,
    maxResults: 10,
    runningMode: "VIDEO"
  });
}

// ── Drawing ────────────────────────────────────────────────────────────────
const DPR = () => window.devicePixelRatio || 1;

function drawDetections(detections) {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const scaleX = W / (video.videoWidth  || 1);
  const scaleY = H / (video.videoHeight || 1);
  const dpr = DPR();

  for (const det of detections) {
    const cat   = det.categories[0];
    const key   = cat.categoryName.toLowerCase();
    const score = Math.round(cat.score * 100);
    const text  = getLabel(key, currentLang);
    const color = colorFor(key);

    const bb = det.boundingBox;
    const x  = bb.originX * scaleX;
    const y  = bb.originY * scaleY;
    const w  = bb.width   * scaleX;
    const h  = bb.height  * scaleY;

    // Glow border
    ctx.shadowColor = color;
    ctx.shadowBlur  = 12 * dpr;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5 * dpr;
    ctx.strokeRect(x, y, w, h);

    // Corner accents
    ctx.shadowBlur = 0;
    const cs = Math.min(w, h) * 0.18;
    ctx.lineWidth = 4 * dpr;
    for (const [cx, cy, dx, dy] of [
      [x,     y,     1,  1],
      [x+w,   y,    -1,  1],
      [x,     y+h,   1, -1],
      [x+w,   y+h,  -1, -1]
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * cs, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * cs);
      ctx.stroke();
    }

    // Label pill
    const fontSize = Math.max(13, Math.min(18, w * 0.12)) * dpr;
    ctx.font = `700 ${fontSize}px -apple-system, sans-serif`;
    const labelFull = `${text}  ${score}%`;
    const tw = ctx.measureText(labelFull).width;
    const ph = fontSize * 1.6;
    const pw = tw + 20 * dpr;
    const px = Math.min(x, W - pw);
    const py = y > ph + 4 * dpr ? y - ph - 4 * dpr : y + h + 4 * dpr;

    ctx.fillStyle = color;
    roundRect(ctx, px, py, pw, ph, 8 * dpr);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.shadowColor = "transparent";
    ctx.textBaseline = "middle";
    ctx.fillText(labelFull, px + 10 * dpr, py + ph / 2);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Detection loop ─────────────────────────────────────────────────────────
let lastTs = 0;

function detect(ts) {
  animFrame = requestAnimationFrame(detect);
  if (!detector || !video.videoWidth) return;
  if (ts - lastTs < 80) return; // ~12fps is enough for AR label
  lastTs = ts;

  const result = detector.detectForVideo(video, ts);
  lastDetections = result.detections || [];
  drawDetections(lastDetections);

  const n = lastDetections.length;
  badge.textContent = n === 0 ? "No objects detected" : `${n} object${n > 1 ? "s" : ""} detected`;
  badge.classList.toggle("visible", true);
}

// ── Boot ───────────────────────────────────────────────────────────────────
async function init() {
  buildLangMenu();
  langBtn.querySelector(".lang-label").textContent = LANGUAGE_NAMES[currentLang];

  await startCamera();
  if (camErr.style.display === "flex") return;

  try {
    await loadDetector();
  } catch (e) {
    console.error("Model load failed:", e);
    status.textContent = "⚠️ Failed to load AI model. Check network.";
    status.classList.remove("hidden");
    loading.classList.add("hidden");
    return;
  }

  loading.classList.add("hidden");
  requestAnimationFrame(detect);
}

// ── Service Worker ─────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

init();
