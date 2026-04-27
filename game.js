const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const comboEl = document.getElementById("combo");
const buildingNameEl = document.getElementById("buildingName");
const screenEl = document.getElementById("screen");
const screenTitle = document.getElementById("screenTitle");
const screenText = document.getElementById("screenText");
const startBtn = document.getElementById("startBtn");
const soundBtn = document.getElementById("soundBtn");
const panelCat = document.getElementById("panelCat");
const catChips = Array.from(document.querySelectorAll(".cat-chip"));

const CAT_DATA = [{"id": "xiaoba", "name": "校霸", "src": "assets/cats/xiaoba.png"}, {"id": "aohei", "name": "澳黑", "src": "assets/cats/aohei.png"}, {"id": "linlin", "name": "琳琳", "src": "assets/cats/linlin.png"}, {"id": "meilimao", "name": "没礼貌", "src": "assets/cats/meilimao.png"}];
const BUILDING_DATA = [{"id": "shipai_gate", "campus": "石牌校区", "name": "暨南大学校门", "src": "assets/buildings/shipai_gate.svg", "color": "#00a6b8"}, {"id": "shipai_library", "campus": "石牌校区", "name": "图书馆", "src": "assets/buildings/shipai_library.svg", "color": "#56c7d8"}, {"id": "panyu_library", "campus": "番禺校区", "name": "番禺图书馆", "src": "assets/buildings/panyu_library.svg", "color": "#80d6c8"}, {"id": "panyu_teaching", "campus": "番禺校区", "name": "教学楼群", "src": "assets/buildings/panyu_teaching.svg", "color": "#96c7ff"}, {"id": "zhuhai_library", "campus": "珠海校区", "name": "珠海图书馆", "src": "assets/buildings/zhuhai_library.svg", "color": "#ffd36e"}, {"id": "zhuhai_gate", "campus": "珠海校区", "name": "校园牌坊", "src": "assets/buildings/zhuhai_gate.svg", "color": "#ffb0c9"}, {"id": "shenzhen_college", "campus": "深圳校区", "name": "深圳学院楼", "src": "assets/buildings/shenzhen_college.svg", "color": "#b9a5ff"}, {"id": "hwy_college", "campus": "华文学院", "name": "华文学院楼", "src": "assets/buildings/hwy_college.svg", "color": "#aee58b"}];

const cats = CAT_DATA.map((cat) => {
  const image = new Image();
  image.src = cat.src;
  return { ...cat, image };
});

const buildings = BUILDING_DATA.map((b) => {
  const image = new Image();
  image.src = b.src;
  return { ...b, image };
});

const state = {
  mode: "ready",
  last: performance.now(),
  score: 0,
  combo: 0,
  best: Number(localStorage.getItem("jnuCampusCatJumpBest") || 0),
  activeCat: 0,
  charge: 0,
  chargeDir: 1,
  camera: { x: 0, y: 0 },
  cameraTarget: { x: 0, y: 0 },
  jump: null,
  particles: [],
  clouds: [],
  pawPrints: [],
  hearts: [],
  shake: 0,
  muted: true,
  audioCtx: null,
  lastAction: performance.now(),
  idleTrick: 0,
  landTimer: 0,
};

const player = {
  x: 0,
  y: 0,
  visualY: 0,
  visualX: 0,
  rotation: 0,
  squashX: 1,
  squashY: 1,
  facing: 1,
  trail: [],
  blink: 0,
  tailWave: 0,
};

let canvasCssWidth = 390;
let canvasCssHeight = 640;
let platforms = [];
let currentPlatform = null;
let nextPlatform = null;

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvasCssWidth = Math.max(320, rect.width);
  canvasCssHeight = Math.max(440, rect.height);
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.round(canvasCssWidth * dpr);
  canvas.height = Math.round(canvasCssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function updateHud() {
  scoreEl.textContent = state.score;
  bestEl.textContent = state.best;
  comboEl.textContent = state.combo;
  buildingNameEl.textContent = nextPlatform?.building?.name || "校门";
}

function worldToScreen(p) {
  return {
    x: p.x - state.camera.x + canvasCssWidth / 2,
    y: p.y - state.camera.y + canvasCssHeight * 0.66,
  };
}

function platformBuilding(index) {
  return buildings[index % buildings.length];
}

function createPlatform(x, y, index = 0) {
  return {
    x, y, index,
    building: platformBuilding(index),
    rx: rand(48, 64),
    ry: rand(24, 32),
    h: rand(18, 28),
    pulse: rand(0, Math.PI * 2),
  };
}

function createNextPlatform(from) {
  const direction = Math.random() < 0.52 ? 1 : -1;
  const xDistance = rand(150, 250) * direction;
  const yDistance = rand(-205, -130);
  return createPlatform(from.x + xDistance, from.y + yDistance, from.index + 1);
}

function resetGame() {
  state.mode = "play";
  state.score = 0;
  state.combo = 0;
  state.charge = 0;
  state.chargeDir = 1;
  state.jump = null;
  state.particles = [];
  state.pawPrints = [];
  state.hearts = [];
  state.shake = 0;
  state.lastAction = performance.now();
  state.idleTrick = 0;
  state.landTimer = 0;

  currentPlatform = createPlatform(0, 0, 0);
  currentPlatform.rx = 66;
  currentPlatform.ry = 31;
  nextPlatform = createNextPlatform(currentPlatform);
  platforms = [currentPlatform, nextPlatform];

  player.x = currentPlatform.x;
  player.y = currentPlatform.y;
  player.visualX = currentPlatform.x;
  player.visualY = currentPlatform.y;
  player.rotation = 0;
  player.squashX = 1;
  player.squashY = 1;
  player.facing = 1;
  player.trail = [];

  state.camera.x = currentPlatform.x;
  state.camera.y = currentPlatform.y;
  state.cameraTarget.x = currentPlatform.x;
  state.cameraTarget.y = currentPlatform.y;

  updateHud();
  hideScreen();
  playTone("start");
}

function showScreen(title, text, buttonText) {
  screenTitle.textContent = title;
  screenText.textContent = text;
  startBtn.textContent = buttonText;
  panelCat.src = cats[state.activeCat].src;
  screenEl.classList.remove("hidden");
}

function hideScreen() {
  screenEl.classList.add("hidden");
}

function setActiveCat(index) {
  state.activeCat = index;
  panelCat.src = cats[index].src;
  catChips.forEach((chip, i) => chip.classList.toggle("active", i === index));
}

function addParticles(x, y, color, count = 18) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: rand(-125, 125),
      vy: rand(-170, -40),
      g: rand(140, 255),
      r: rand(2, 5),
      life: rand(0.45, 0.95),
      maxLife: 0.95,
      color,
    });
  }
}

function addPaws(x, y, count = 4) {
  for (let i = 0; i < count; i++) {
    state.pawPrints.push({
      x: x + rand(-30, 30),
      y: y + rand(-8, 16),
      life: 1.25,
      size: rand(4, 7),
      rot: rand(-0.55, 0.55),
    });
  }
}

function addHearts(x, y) {
  for (let i = 0; i < 4; i++) {
    state.hearts.push({
      x: x + rand(-26, 26),
      y: y + rand(-50, -18),
      vy: rand(-22, -42),
      life: rand(0.75, 1.15),
      maxLife: 1.15,
      size: rand(8, 14),
    });
  }
}

function initClouds() {
  if (state.clouds.length) return;
  for (let i = 0; i < 12; i++) {
    state.clouds.push({
      x: rand(-70, canvasCssWidth + 70),
      y: rand(40, canvasCssHeight * 0.55),
      s: rand(0.55, 1.25),
      speed: rand(5, 14),
      alpha: rand(0.12, 0.3),
    });
  }
}

function playTone(type) {
  if (state.muted) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!state.audioCtx) state.audioCtx = new AudioCtx();
  const audio = state.audioCtx;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const freq = { start: 440, jump: 530, land: 660, perfect: 920, fail: 180, idle: 720 }[type] || 440;

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.72), now + 0.14);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(type === "fail" ? 0.075 : 0.052, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

function startCharge() {
  if (state.mode !== "play") return;
  state.mode = "charging";
  state.charge = 0;
  state.chargeDir = 1;
  state.lastAction = performance.now();
}

function releaseJump() {
  if (state.mode !== "charging") return;
  state.lastAction = performance.now();

  const dx = nextPlatform.x - currentPlatform.x;
  const dy = nextPlatform.y - currentPlatform.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const dir = { x: dx / len, y: dy / len };

  const jumpDistance = 74 + state.charge * 330;
  const end = {
    x: currentPlatform.x + dir.x * jumpDistance,
    y: currentPlatform.y + dir.y * jumpDistance,
  };

  player.facing = dir.x >= 0 ? 1 : -1;
  state.jump = {
    startX: player.x,
    startY: player.y,
    endX: end.x,
    endY: end.y,
    t: 0,
    duration: clamp(0.43 + state.charge * 0.47, 0.43, 0.95),
    peak: 118 + state.charge * 120,
  };

  player.squashX = 0.86;
  player.squashY = 1.22;
  player.trail = [];
  state.mode = "jumping";
  playTone("jump");
}

function finishJump() {
  const d = distance({ x: player.x, y: player.y }, nextPlatform);
  const safe = Math.min(nextPlatform.rx * 0.88, 52);

  if (d <= safe) {
    const perfect = d <= Math.max(11, nextPlatform.rx * 0.2);
    const gain = perfect ? 3 + state.combo : 1;
    state.score += gain;
    state.combo = perfect ? state.combo + 1 : 0;

    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("jnuCampusCatJumpBest", String(state.best));
    }

    player.x = nextPlatform.x;
    player.y = nextPlatform.y;
    player.visualX = nextPlatform.x;
    player.visualY = nextPlatform.y;
    player.rotation = 0;
    player.squashX = 1.20;
    player.squashY = 0.76;
    state.landTimer = 0.30;
    state.shake = perfect ? 9 : 5;

    addParticles(nextPlatform.x, nextPlatform.y - 12, perfect ? "#ffd76d" : "#00a6b8", perfect ? 40 : 23);
    addPaws(nextPlatform.x, nextPlatform.y + 18, perfect ? 5 : 3);
    if (perfect) addHearts(nextPlatform.x, nextPlatform.y);
    playTone(perfect ? "perfect" : "land");

    currentPlatform = nextPlatform;
    nextPlatform = createNextPlatform(currentPlatform);
    platforms.push(nextPlatform);
    platforms = platforms.slice(-8);

    state.cameraTarget.x = currentPlatform.x;
    state.cameraTarget.y = currentPlatform.y;
    state.mode = "play";
    state.charge = 0;
    state.lastAction = performance.now();
    updateHud();
  } else {
    state.mode = "gameover";
    state.combo = 0;
    state.shake = 15;
    addParticles(player.x, player.y, "#ff7c9d", 42);
    playTone("fail");
    updateHud();

    setTimeout(() => {
      showScreen("猫咪跳空啦", `本次得分 ${state.score}。注意蓄力条和蓝色轨迹，让猫咪落到建筑平台中心！`, "重新开始");
    }, 430);
  }
}

function update(dt) {
  initClouds();

  state.camera.x += (state.cameraTarget.x - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (state.cameraTarget.y - state.camera.y) * Math.min(1, dt * 5);
  state.shake = Math.max(0, state.shake - dt * 30);
  state.landTimer = Math.max(0, state.landTimer - dt);

  for (const c of state.clouds) {
    c.x += c.speed * dt;
    if (c.x > canvasCssWidth + 90) c.x = -110;
  }

  for (const p of platforms) p.pulse += dt;

  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.g * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  for (const p of state.pawPrints) p.life -= dt;
  state.pawPrints = state.pawPrints.filter((p) => p.life > 0);

  for (const h of state.hearts) {
    h.y += h.vy * dt;
    h.life -= dt;
  }
  state.hearts = state.hearts.filter((h) => h.life > 0);

  if (state.mode === "charging") {
    state.charge += state.chargeDir * dt / 1.06;
    if (state.charge >= 1) { state.charge = 1; state.chargeDir = -1; }
    if (state.charge <= 0) { state.charge = 0; state.chargeDir = 1; }

    const tremble = Math.sin(performance.now() / 40) * state.charge * 0.02;
    player.squashX = 1 + state.charge * 0.22 + tremble;
    player.squashY = 1 - state.charge * 0.24;
    player.visualX = player.x + Math.sin(performance.now() / 46) * state.charge * 1.8;
    player.visualY = player.y + state.charge * 9;
    player.rotation = Math.sin(performance.now() / 70) * state.charge * 0.035;
  }

  if (state.mode === "play") {
    const now = performance.now();
    const idleTime = now - state.lastAction;
    const breathe = Math.sin(now / 260) * 0.026;
    const bob = Math.sin(now / 360) * 2.2;
    const sway = Math.sin(now / 700) * 1.9;
    const tilt = Math.sin(now / 820) * 0.028;

    if (idleTime > 2600 && state.idleTrick <= 0) {
      state.idleTrick = 1.05;
      addPaws(player.x, player.y + 18, 2);
      playTone("idle");
    }

    if (state.idleTrick > 0) {
      state.idleTrick -= dt;
      const t = 1 - state.idleTrick / 1.05;
      const hop = Math.sin(Math.PI * t) * 18;
      player.visualY = player.y + bob - hop;
      player.visualX = player.x + sway + Math.sin(Math.PI * t * 2) * 6;
      player.rotation = tilt + Math.sin(Math.PI * t * 2) * 0.08;
      player.squashX += (1.03 - breathe - player.squashX) * Math.min(1, dt * 8);
      player.squashY += (0.98 + breathe - player.squashY) * Math.min(1, dt * 8);
      if (state.idleTrick <= 0) state.lastAction = performance.now();
    } else {
      player.visualX = player.x + sway;
      player.visualY = player.y + bob;
      player.rotation = tilt;
      player.squashX += (1 - breathe - player.squashX) * Math.min(1, dt * 7);
      player.squashY += (1 + breathe - player.squashY) * Math.min(1, dt * 7);
    }

    // 偶发眨眼
    if (Math.random() < dt * 0.25) player.blink = 0.16;
    player.blink = Math.max(0, player.blink - dt);
  }

  if (state.mode === "jumping" && state.jump) {
    const j = state.jump;
    j.t += dt / j.duration;
    const t = clamp(j.t, 0, 1);
    const e = easeInOut(t);
    const arc = Math.sin(Math.PI * t) * j.peak;

    player.x = lerp(j.startX, j.endX, e);
    player.y = lerp(j.startY, j.endY, e);
    player.visualX = player.x;
    player.visualY = player.y - arc;

    const spin = Math.sin(Math.PI * t) * 0.34 + (t - 0.5) * 0.18;
    player.rotation = spin * player.facing;

    const stretch = Math.sin(Math.PI * t);
    player.squashX = 0.94 + stretch * 0.10;
    player.squashY = 1.12 - stretch * 0.06;

    const last = player.trail[player.trail.length - 1];
    if (!last || Math.hypot(last.x - player.x, last.y - player.visualY) > 23) {
      player.trail.push({ x: player.x, y: player.visualY, rot: player.rotation, life: 0.34 });
      player.trail = player.trail.slice(-7);
    }

    state.cameraTarget.x += (player.x - state.cameraTarget.x) * dt * 1.18;
    state.cameraTarget.y += (player.y - state.cameraTarget.y) * dt * 1.18;

    if (t >= 1) {
      player.x = j.endX;
      player.y = j.endY;
      player.visualX = j.endX;
      player.visualY = j.endY;
      player.rotation = 0;
      state.jump = null;
      finishJump();
    }
  }

  for (const tr of player.trail) tr.life -= dt;
  player.trail = player.trail.filter((tr) => tr.life > 0);
}

function drawCloud(x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x, y, 32 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 23 * s, y + 2 * s, 26 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 22 * s, y + 4 * s, 24 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvasCssHeight);
  g.addColorStop(0, "#bdf4ff");
  g.addColorStop(0.54, "#f9fdff");
  g.addColorStop(1, "#fff0b8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasCssWidth, canvasCssHeight);

  for (const c of state.clouds) drawCloud(c.x, c.y, c.s, c.alpha);

  ctx.save();
  ctx.globalAlpha = 0.11;
  ctx.strokeStyle = "#087c8b";
  ctx.lineWidth = 16;
  const gateW = Math.min(canvasCssWidth * 0.82, 420);
  ctx.beginPath();
  ctx.arc(canvasCssWidth / 2, canvasCssHeight * 0.70, gateW / 2, Math.PI, 0);
  ctx.stroke();
  ctx.font = "700 14px serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#087c8b";
  ctx.fillText("JINAN UNIVERSITY", canvasCssWidth / 2, canvasCssHeight * 0.70 - gateW / 2 + 34);
  ctx.restore();
}

function shade(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + percent;
  let g = ((n >> 8) & 255) + percent;
  let b = (n & 255) + percent;
  r = clamp(Math.round(r), 0, 255);
  g = clamp(Math.round(g), 0, 255);
  b = clamp(Math.round(b), 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function roundRectPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawPlatform(p, isCurrent, isNext) {
  const s = worldToScreen(p);
  const b = p.building;

  ctx.save();

  ctx.fillStyle = "rgba(39,78,103,.13)";
  ctx.beginPath();
  ctx.ellipse(s.x + 8, s.y + p.h + 16, p.rx * 1.08, p.ry * .68, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shade(b.color, -32);
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + p.h, p.rx, p.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, p.rx, p.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createLinearGradient(s.x - p.rx, s.y - p.ry, s.x + p.rx, s.y + p.ry);
  grad.addColorStop(0, "rgba(255,255,255,.60)");
  grad.addColorStop(1, "rgba(255,255,255,.05)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(s.x - p.rx * .16, s.y - p.ry * .2, p.rx * .58, p.ry * .36, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = b.image;
  const imgW = 108;
  const imgH = 76;
  ctx.save();
  ctx.shadowColor = "rgba(36,77,105,.22)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 8;
  roundRectPath(s.x - imgW / 2, s.y - p.ry - imgH - 14, imgW, imgH, 15);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.clip();
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, s.x - imgW / 2, s.y - p.ry - imgH - 14, imgW, imgH);
  }
  ctx.restore();

  if (isNext) {
    ctx.strokeStyle = "rgba(0,166,184,.74)";
    ctx.lineWidth = 3;
    const pulse = 1 + Math.sin(p.pulse * 4) * .045;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, p.rx * pulse, p.ry * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (isCurrent) {
    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 1, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = "800 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(32,49,69,.76)";
  ctx.fillText(`${b.campus} · ${b.name}`, s.x, s.y + p.h + 36);

  ctx.restore();
}

function drawTrajectory() {
  if (state.mode !== "charging" && state.mode !== "play") return;

  const start = worldToScreen(currentPlatform);
  const dx = nextPlatform.x - currentPlatform.x;
  const dy = nextPlatform.y - currentPlatform.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const dir = { x: dx / len, y: dy / len };
  const jumpDistance = state.mode === "charging" ? 74 + state.charge * 330 : 74;
  const end = worldToScreen({ x: currentPlatform.x + dir.x * jumpDistance, y: currentPlatform.y + dir.y * jumpDistance });

  ctx.save();
  ctx.globalAlpha = state.mode === "charging" ? .88 : .20;
  ctx.strokeStyle = "#007c91";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y - 8);
  ctx.lineTo(end.x, end.y - 8);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#007c91";
  ctx.beginPath();
  ctx.arc(end.x, end.y - 8, state.mode === "charging" ? 7 : 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (state.mode === "charging") drawPowerBar();
}

function drawPowerBar() {
  const w = Math.min(270, canvasCssWidth * .70);
  const x = (canvasCssWidth - w) / 2;
  const y = 22;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.68)";
  roundRectPath(x, y, w, 17, 999);
  ctx.fill();

  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, "#7de9e5");
  g.addColorStop(.68, "#ffd76d");
  g.addColorStop(1, "#ff8eb8");

  ctx.fillStyle = g;
  roundRectPath(x, y, w * state.charge, 17, 999);
  ctx.fill();

  ctx.strokeStyle = "rgba(32,49,69,.12)";
  ctx.lineWidth = 1;
  roundRectPath(x, y, w, 17, 999);
  ctx.stroke();

  ctx.fillStyle = "rgba(32,49,69,.56)";
  ctx.font = "800 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("蓄力跳跃", canvasCssWidth / 2, y + 34);
  ctx.restore();
}

function drawPaws() {
  for (const p of state.pawPrints) {
    const s = worldToScreen(p);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = clamp(p.life / 1.25, 0, 1) * .35;
    ctx.fillStyle = "#203145";
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 1.4, p.size, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * p.size * .9, -p.size * 1.15, p.size * .42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const s = worldToScreen(p);
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHearts() {
  for (const h of state.hearts) {
    const s = worldToScreen(h);
    ctx.save();
    ctx.globalAlpha = clamp(h.life / h.maxLife, 0, 1);
    ctx.fillStyle = "#ff6f9d";
    ctx.translate(s.x, s.y);
    ctx.scale(h.size / 14, h.size / 14);
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-20, -6, -12, -23, 0, -10);
    ctx.bezierCurveTo(12, -23, 20, -6, 0, 8);
    ctx.fill();
    ctx.restore();
  }
}

function drawCatAt(worldX, worldY, options = {}) {
  const cat = cats[state.activeCat];
  const img = cat.image;
  const s = worldToScreen({ x: worldX, y: worldY });
  const alpha = options.alpha ?? 1;
  const rot = options.rot ?? player.rotation;
  const sx = options.sx ?? player.squashX;
  const sy = options.sy ?? player.squashY;

  const ground = worldToScreen({ x: player.x, y: player.y });
  const height = Math.max(0, player.y - player.visualY);
  const shadowScale = clamp(1 - height / 270, .34, 1);

  ctx.save();
  ctx.globalAlpha = .18 * alpha * shadowScale;
  ctx.fillStyle = "#203145";
  ctx.beginPath();
  ctx.ellipse(ground.x + 8, ground.y + 18, 38 * shadowScale, 13 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(s.x, s.y - 65);
  ctx.rotate(rot);
  ctx.scale(player.facing * sx, sy);

  const baseSize = clamp(canvasCssWidth * .255, 88, 132);
  const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : .76;
  const h = baseSize;
  const w = baseSize * ratio;

  ctx.shadowColor = "rgba(31,70,100,.24)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 10;

  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }

  // 待机眨眼与活动线条，增强“猫咪有活动”的感觉
  if (alpha > .9 && player.blink > 0 && state.mode === "play") {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(32,49,69,.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * .13, -h * .22);
    ctx.lineTo(-w * .02, -h * .22);
    ctx.moveTo(w * .03, -h * .22);
    ctx.lineTo(w * .14, -h * .22);
    ctx.stroke();
  }

  if (alpha > .9 && (state.mode === "charging" || state.idleTrick > 0)) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0,124,145,.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * .46 + i * 7, -h * .30 + i * 6);
      ctx.lineTo(w * .54 + i * 8, -h * .39 + i * 4);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCat() {
  for (const tr of player.trail) {
    drawCatAt(tr.x, tr.y, {
      alpha: clamp(tr.life / .34, 0, 1) * .23,
      rot: tr.rot,
      sx: .98,
      sy: 1.02,
    });
  }
  drawCatAt(player.visualX, player.visualY);
}

function drawGuideText() {
  if (state.mode !== "play") return;
  ctx.save();
  ctx.fillStyle = "rgba(32,49,69,.64)";
  ctx.font = "800 14px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("按住屏幕蓄力，松手起跳", canvasCssWidth / 2, canvasCssHeight - 25);
  ctx.restore();
}

function render() {
  ctx.save();

  if (state.shake > 0) {
    ctx.translate(rand(-state.shake, state.shake) * .22, rand(-state.shake, state.shake) * .22);
  }

  drawBackground();

  const ordered = [...platforms].sort((a, b) => a.y - b.y);
  for (const p of ordered) drawPlatform(p, p === currentPlatform, p === nextPlatform);

  drawTrajectory();
  drawPaws();
  drawParticles();
  drawHearts();
  drawCat();
  drawGuideText();

  ctx.restore();
}

function loop(now) {
  const dt = Math.min(.033, (now - state.last) / 1000 || 0);
  state.last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function pointerDown(e) {
  e.preventDefault();
  startCharge();
}

function pointerUp(e) {
  e.preventDefault();
  releaseJump();
}

canvas.addEventListener("pointerdown", pointerDown, { passive: false });
canvas.addEventListener("pointerup", pointerUp, { passive: false });
canvas.addEventListener("pointercancel", pointerUp, { passive: false });
canvas.addEventListener("pointerleave", (e) => {
  if (state.mode === "charging") pointerUp(e);
}, { passive: false });

startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  resetGame();
});

soundBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  state.muted = !state.muted;
  soundBtn.textContent = state.muted ? "🔇" : "🔊";
  if (!state.muted && state.audioCtx && state.audioCtx.state === "suspended") {
    await state.audioCtx.resume();
  }
  playTone("start");
});

catChips.forEach((chip) => {
  chip.addEventListener("click", (e) => {
    e.stopPropagation();
    setActiveCat(Number(chip.dataset.cat || 0));
  });
});

window.addEventListener("resize", resize);
window.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("visibilitychange", () => {
  state.last = performance.now();
});

resize();
setActiveCat(0);
updateHud();
showScreen("准备起跳", "四只暨南猫咪可切换；猫咪会待机呼吸、眨眼、摆动、蹲下蓄力、空中翻动、落地回弹。", "开始游戏");
requestAnimationFrame(loop);
