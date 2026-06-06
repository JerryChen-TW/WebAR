import { loadModel, preprocess, runInference, postprocess } from "./yolo.js";
/* global COCO_CLASSES, LANGUAGE_NAMES, getLabel */

// ── State ──────────────────────────────────────────────────────────────────
let currentLang = "en";
let modelReady  = false;

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
function colorFor(idx) { return COLORS[idx % COLORS.length]; }

// ── Language menu ──────────────────────────────────────────────────────────
function buildLangMenu() {
  langMenu.innerHTML = "";
  for (const [code, name] of Object.entries(LANGUAGE_NAMES)) {
    const div = document.createElement("div");
    div.className = "lang-option" + (code === currentLang ? " selected" : "");
    div.textContent = name;
    div.addEventListener("click", () => {
      currentLang = code;
      langBtn.querySelector(".lang-label").textContent = name;
      buildLangMenu();
      langMenu.classList.remove("open");
    });
    langMenu.appendChild(div);
  }
}

langBtn.addEventListener("click", e => {
  e.stopPropagation();
  langMenu.classList.toggle("open");
});
document.addEventListener("click", () => langMenu.classList.remove("open"));

// ── Canvas resize ──────────────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = canvas.offsetWidth  * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
}
window.addEventListener("resize", resizeCanvas);

// ── Camera ─────────────────────────────────────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    await new Promise(r => { video.onloadedmetadata = r; });
    await video.play();
    resizeCanvas();
  } catch {
    camErr.style.display = "flex";
    loading.classList.add("hidden");
    throw new Error("camera");
  }
}

document.getElementById("retry-btn").addEventListener("click", () => {
  camErr.style.display = "none";
  loading.classList.remove("hidden");
  init();
});

// ── Drawing ────────────────────────────────────────────────────────────────
function drawDetections(dets) {
  const W = canvas.width, H = canvas.height;
  const dpr = devicePixelRatio;
  const scaleX = W / (video.videoWidth  || 1);
  const scaleY = H / (video.videoHeight || 1);

  ctx.clearRect(0, 0, W, H);

  for (const det of dets) {
    const color = colorFor(det.classIdx);
    const label = getLabel(det.classIdx, currentLang);
    const pct   = Math.round(det.score * 100);

    const x = det.x1 * scaleX, y  = det.y1 * scaleY;
    const w = (det.x2 - det.x1) * scaleX;
    const h = (det.y2 - det.y1) * scaleY;

    // Glow box
    ctx.shadowColor = color;
    ctx.shadowBlur  = 12 * dpr;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5 * dpr;
    ctx.strokeRect(x, y, w, h);

    // Corner accents
    ctx.shadowBlur = 0;
    const cs = Math.min(w, h) * 0.18;
    ctx.lineWidth = 4 * dpr;
    for (const [cx2, cy2, dx, dy] of [
      [x,   y,   1,  1], [x+w, y,  -1,  1],
      [x,   y+h, 1, -1], [x+w, y+h,-1, -1]
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx2 + dx * cs, cy2);
      ctx.lineTo(cx2, cy2);
      ctx.lineTo(cx2, cy2 + dy * cs);
      ctx.stroke();
    }

    // Label pill
    const fs   = Math.max(13, Math.min(18, w * 0.12)) * dpr;
    ctx.font   = `700 ${fs}px -apple-system,sans-serif`;
    const full = `${label}  ${pct}%`;
    const tw   = ctx.measureText(full).width;
    const ph   = fs * 1.6, pw = tw + 20 * dpr;
    const px   = Math.min(x, W - pw);
    const py   = y > ph + 4 * dpr ? y - ph - 4 * dpr : y + h + 4 * dpr;

    ctx.fillStyle = color;
    roundRect(ctx, px, py, pw, ph, 8 * dpr);
    ctx.fill();

    ctx.fillStyle    = "#fff";
    ctx.shadowColor  = "transparent";
    ctx.textBaseline = "middle";
    ctx.fillText(full, px + 10 * dpr, py + ph / 2);
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
}

// ── Detection loop ─────────────────────────────────────────────────────────
let lastTs = 0;
let running = false;

async function detectLoop(ts) {
  requestAnimationFrame(detectLoop);
  if (!modelReady || !video.videoWidth) return;
  if (ts - lastTs < 100) return; // ~10 fps
  lastTs = ts;
  if (running) return;
  running = true;

  try {
    const { float32, scaleX, scaleY, padL, padT } = preprocess(video);
    const raw  = await runInference(float32);
    const dets = postprocess(
      raw,
      { scaleX, scaleY, padL, padT },
      video.videoWidth,
      video.videoHeight
    );
    drawDetections(dets);

    const n = dets.length;
    badge.textContent = n === 0 ? "No objects detected" : `${n} object${n > 1 ? "s" : ""} detected`;
    badge.classList.add("visible");
  } catch (e) {
    console.error(e);
  } finally {
    running = false;
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────
async function init() {
  buildLangMenu();
  langBtn.querySelector(".lang-label").textContent = LANGUAGE_NAMES[currentLang];

  try { await startCamera(); } catch { return; }

  try {
    await loadModel(msg => { loadTxt.textContent = msg; });
  } catch (e) {
    console.error(e);
    status.textContent = "⚠️ Failed to load AI model.";
    status.classList.remove("hidden");
    loading.classList.add("hidden");
    return;
  }

  modelReady = true;
  loading.classList.add("hidden");
  requestAnimationFrame(detectLoop);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

init();
