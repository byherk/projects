/* Hình dung 4D qua 6 bước · Seeing 4D in Six Steps
   Logic của trang: hình học 4D, vẽ canvas, lát cắt, tái dựng, phòng camera, thanh bên, chân trang và đổi ngôn ngữ.
   - Chữ tiếng Việt viết thẳng trong index.html; khi mở trang, file này chụp lại chúng để đổi qua lại không cần tải lại.
   - Chữ tiếng Anh và mọi chữ thay đổi khi chạy (trạng thái, nhãn nút, chữ vẽ trên canvas) nằm trong content.js.
   - Ngôn ngữ do script nhỏ trong <head> chọn và ghi vào html lang; file này đọc lại từ đó. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  /* ================= Ngôn ngữ: định dạng số ================= */
  const LANG_KEY = 'byherk-lang';
  const CANONICAL = 'https://byherk.github.io/projects/seeing-4d/';
  let lang = CONTENT[document.documentElement.lang] ? document.documentElement.lang : 'vi';
  const ui = () => CONTENT[lang].ui;

  // Tiếng Việt dùng dấu phẩy thập phân, tiếng Anh dùng dấu chấm; dấu trừ luôn là "−" (U+2212).
  const decimal = v => { const s = Math.abs(v).toFixed(2); return lang === 'vi' ? s.replace('.', ',') : s; };
  const signed = v => (v < 0 ? '−' : '') + decimal(v);
  const signedPlus = v => (v < 0 ? '−' : v > 0 ? '+' : '') + decimal(v);
  const degrees = v => (v < 0 ? '−' + Math.abs(v) : String(v)) + '°';

  /* ================= Hình học 4D ================= */
  const PLANES = { XY: [0, 1], XZ: [0, 2], YZ: [1, 2], XW: [0, 3], YW: [1, 3], ZW: [2, 3] };
  const PLANE_NAMES = Object.keys(PLANES);
  const DEFAULT_ANGLES = { XY: 12, XZ: -14, YZ: 18, XW: 35, YW: 25, ZW: -12 };
  const DEFAULT_YAW = -.48, DEFAULT_PITCH = .35;

  // Tesseract: 16 đỉnh (±1, ±1, ±1, ±1); cạnh nối hai đỉnh khác nhau đúng một tọa độ (axis 3 = cạnh theo W).
  const vertices = Array.from({ length: 16 }, (_, i) => Array.from({ length: 4 }, (_, bit) => ((i >> bit) & 1) ? 1 : -1));
  const edges = [];
  for (let i = 0; i < 16; i++) for (let bit = 0; bit < 4; bit++) {
    const j = i ^ (1 << bit);
    if (i < j) edges.push({ i, j, axis: bit });
  }

  // Trong 4D, phép xoay diễn ra trong một mặt phẳng; sáu mặt phẳng tọa độ được áp lần lượt theo thứ tự cố định.
  function rotate4(v, a) {
    const q = v.slice();
    for (const plane of PLANE_NAMES) {
      const [i, j] = PLANES[plane], t = a[plane] * DEG, c = Math.cos(t), s = Math.sin(t);
      const x = q[i], y = q[j];
      q[i] = c * x - s * y; q[j] = s * x + c * y;
    }
    return q;
  }

  // Lát cắt của khối cầu bán kính 1, cách tâm một khoảng s (định lý Pythagoras): bán kính √(1 − s²).
  const radiusAt = s => Math.abs(s) > 1 ? 0 : Math.sqrt(Math.max(0, 1 - s * s));

  // Chiếu phối cảnh 4D → 3D. Mọi đỉnh sau khi xoay có |w| ≤ 2 nên mẫu số luôn dương.
  const perspective4 = q => { const f = 3.15 / (4.1 - q[3]); return [q[0] * f, q[1] * f, q[2] * f]; };

  // Xoay camera 3D (yaw quanh trục đứng, rồi pitch); trả về x, y trên màn hình và độ sâu.
  function turn3(x, y, z, yaw, pitch) {
    const x1 = Math.cos(yaw) * x + Math.sin(yaw) * z;
    const z1 = -Math.sin(yaw) * x + Math.cos(yaw) * z;
    return [x1, Math.cos(pitch) * y - Math.sin(pitch) * z1, Math.sin(pitch) * y + Math.cos(pitch) * z1];
  }

  // 3D → màn hình, phối cảnh 4.8 / (6 − độ sâu).
  function toScreen(p, yaw, pitch, w, h, unit) {
    const [x1, y2, z2] = turn3(p[0], p[1], p[2], yaw, pitch);
    const f3 = 4.8 / (6 - z2);
    return { x: w * .5 + x1 * f3 * unit, y: h * .5 - y2 * f3 * unit, depth: z2 };
  }

  // Vẽ cạnh xa trước, gần sau.
  const byDepth = pts => edges.map(e => ({ ...e, z: (pts[e.i].depth + pts[e.j].depth) / 2 })).sort((a, b) => a.z - b.z);

  /* ================= Trạng thái dùng chung ================= */
  const angles = { ...DEFAULT_ANGLES };   // góc xoay 4D của vật: chung cho Bước 03 và Bước 04
  let yaw = DEFAULT_YAW, pitch = DEFAULT_PITCH;  // camera 3D của khung tesseract ở Bước 03
  let slicePos = -.45;                    // vị trí lát cắt: chung cho khối cầu và vật hình vòm ở Bước 02
  let autorotate = false, slicePlaying = false, cameraPlaying = false;

  /* ================= Canvas ================= */
  function canvasSize(canvas, maxDpr) {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height), dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function labBackground(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createRadialGradient(w * .52, h * .44, 7, w * .5, h * .5, w * .58);
    grad.addColorStop(0, '#19354b'); grad.addColorStop(1, '#0b192b');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(125,187,204,.09)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(105,226,207,.16)';
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * .105 * i, 0, TAU); ctx.stroke(); }
  }

  /* ================= Bước 03: tesseract ================= */
  const tesseractCanvas = $('tesseractCanvas');

  function projectTesseract(v, w, h) {
    return toScreen(perspective4(rotate4(v, angles)), yaw, pitch, w, h, Math.min(w * .19, h * .30));
  }

  function drawTesseract() {
    const { ctx, w, h } = canvasSize(tesseractCanvas, 2.5);
    labBackground(ctx, w, h);
    const pts = vertices.map(v => projectTesseract(v, w, h));
    for (const e of byDepth(pts)) {
      const a = pts[e.i], b = pts[e.j];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.lineCap = 'round';
      ctx.lineWidth = (e.axis === 3 ? 2.7 : 2.2) * (0.88 + Math.max(-1, Math.min(1, e.z)) * .13);
      ctx.strokeStyle = e.axis === 3 ? 'rgba(255,189,126,.93)' : 'rgba(114,230,211,.80)';
      ctx.stroke();
    }
    for (const p of pts) { ctx.fillStyle = '#d5fff7'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.7, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(192,218,233,.85)'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(ui().canvasProjection, 15, h - 18);
  }

  // Cập nhật thanh trượt và số đo của sáu mặt phẳng, rồi vẽ lại mọi hình phụ thuộc góc xoay.
  function refreshRotation() {
    for (const plane of PLANE_NAMES) {
      const val = Math.round(angles[plane]);
      $('angle' + plane).value = val;
      $('out' + plane).textContent = degrees(val);
    }
    drawTesseract();
    drawCameraRoom();
  }

  function stopRotate() { autorotate = false; renderPlayButtons(); }

  document.querySelectorAll('.rotation-input').forEach(slider => {
    slider.addEventListener('input', () => { stopRotate(); stopCamera(); angles[slider.dataset.plane] = Number(slider.value); refreshRotation(); });
  });
  $('rotatePlay').addEventListener('click', () => {
    stopCamera(); autorotate = !autorotate; renderPlayButtons(); animPrevious = 0;
    if (autorotate) startTick();
  });
  $('rotateReset').addEventListener('click', () => {
    stopRotate(); stopCamera(); Object.assign(angles, DEFAULT_ANGLES); yaw = DEFAULT_YAW; pitch = DEFAULT_PITCH; refreshRotation();
  });
  $('rotateZero').addEventListener('click', () => { stopRotate(); stopCamera(); zeroAngles(); });

  function zeroAngles() { for (const p of PLANE_NAMES) angles[p] = 0; refreshRotation(); }

  // Kéo trên hình chỉ xoay camera 3D, không đụng tới góc xoay 4D. Phím mũi tên làm việc tương tự cho người dùng bàn phím.
  let drag = null;
  const clampPitch = v => Math.max(-1.5, Math.min(1.5, v));
  tesseractCanvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY }; tesseractCanvas.classList.add('dragging'); tesseractCanvas.setPointerCapture(e.pointerId);
  });
  tesseractCanvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    yaw += dx * .009; pitch = clampPitch(pitch + dy * .009);
    drawTesseract();
  });
  const endDrag = () => { drag = null; tesseractCanvas.classList.remove('dragging'); };
  tesseractCanvas.addEventListener('pointerup', endDrag);
  tesseractCanvas.addEventListener('pointercancel', endDrag);
  tesseractCanvas.addEventListener('keydown', e => {
    const step = .09;  // tương đương kéo 10px
    if (e.key === 'ArrowLeft') yaw -= step;
    else if (e.key === 'ArrowRight') yaw += step;
    else if (e.key === 'ArrowUp') pitch = clampPitch(pitch - step);
    else if (e.key === 'ArrowDown') pitch = clampPitch(pitch + step);
    else return;
    e.preventDefault();
    drawTesseract();
  });

  /* ================= Bước 04: phòng camera ================= */
  // Mỗi camera đọc cùng một tư thế 4D của vật, rồi áp thêm một phép xoay nhìn CỐ ĐỊNH khác nhau trước khi chiếu
  // 4D → 3D → màn hình. 38° là hướng đặt camera, không phải một phép xoay riêng của vật.
  const CAMERA_BASES = { cameraDefault: {}, cameraXW: { XW: 38 }, cameraYW: { YW: 38 }, cameraZW: { ZW: 38 }, cameraCenter: {} };
  const CAMERA_IDS = Object.keys(CAMERA_BASES);
  const CAMERA_VIEWS = Object.fromEntries(CAMERA_IDS.map(id => {
    const b = CAMERA_BASES[id];
    return [id, { XY: 0, XZ: 0, YZ: 0, XW: b.XW || 0, YW: b.YW || 0, ZW: b.ZW || 0 }];
  }));

  // Góc nhìn 3D giống nhau ở mọi camera, để khác biệt trên màn hình chỉ đến từ hướng chiếu 4D.
  function projectCamera(v, w, h, id) {
    const q = rotate4(rotate4(v, angles), CAMERA_VIEWS[id]);
    return toScreen(perspective4(q), DEFAULT_YAW, DEFAULT_PITCH, w, h, Math.min(w * .24, h * .31));
  }

  function drawCamera(id) {
    const { ctx, w, h } = canvasSize($(id), 2.5);
    labBackground(ctx, w, h);
    const pts = vertices.map(v => projectCamera(v, w, h, id));
    const center = id === 'cameraCenter', thick = center ? 2.2 : 1.7;
    for (const e of byDepth(pts)) {
      const a = pts[e.i], b = pts[e.j];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.lineCap = 'round'; ctx.lineWidth = e.axis === 3 ? thick * 1.2 : thick;
      ctx.strokeStyle = e.axis === 3 ? 'rgba(255,189,126,.90)' : 'rgba(114,230,211,.82)';
      ctx.stroke();
    }
    for (const p of pts) { ctx.fillStyle = '#e0fff6'; ctx.beginPath(); ctx.arc(p.x, p.y, center ? 2.5 : 1.8, 0, TAU); ctx.fill(); }
  }

  function drawCameraRoom() {
    const val = Math.round(angles.XW);
    $('cameraXWRange').value = val;
    $('cameraXWOut').textContent = degrees(val);
    CAMERA_IDS.forEach(drawCamera);
  }

  function stopCamera() { cameraPlaying = false; renderPlayButtons(); }

  // Thanh XW ở đây và ở Bước 03 cùng ghi vào angles.XW, nên hai nơi luôn khớp nhau.
  $('cameraXWRange').addEventListener('input', e => { stopRotate(); stopCamera(); angles.XW = Number(e.target.value); refreshRotation(); });
  $('cameraZero').addEventListener('click', () => { stopRotate(); stopCamera(); zeroAngles(); });
  $('cameraPlay').addEventListener('click', () => {
    stopRotate(); cameraPlaying = !cameraPlaying; renderPlayButtons(); animPrevious = 0;
    if (cameraPlaying) startTick();
  });

  /* ================= Bước 02: lát cắt khối cầu ================= */
  function drawSlice(id, threeD) {
    const { ctx, w, h } = canvasSize($(id), 2.5);
    const full = Math.min(w * .24, h * .33), rad = full * radiusAt(slicePos);
    labBackground(ctx, w, h);
    ctx.save(); ctx.translate(w * .5, h * .53);
    ctx.strokeStyle = 'rgba(198,233,241,.19)'; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.arc(0, 0, full, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (!threeD) {
      ctx.strokeStyle = 'rgba(120,206,209,.28)';
      ctx.beginPath(); ctx.moveTo(-w * .34, 0); ctx.lineTo(w * .34, 0); ctx.moveTo(0, -h * .36); ctx.lineTo(0, h * .36); ctx.stroke();
      if (rad > .01) { ctx.fillStyle = '#7de5d2'; ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill(); ctx.strokeStyle = '#d5fff8'; ctx.lineWidth = 2; ctx.stroke(); }
    } else if (rad > .01) {
      const grd = ctx.createRadialGradient(-rad * .32, -rad * .4, rad * .03, 0, 0, rad * 1.02);
      grd.addColorStop(0, '#e3fff8'); grd.addColorStop(.3, '#80e8d8'); grd.addColorStop(.68, '#378eb2'); grd.addColorStop(1, '#15365f');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(216,255,249,.64)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(227,255,249,.38)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, rad, rad * .28, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, rad * .37, rad, 0, 0, TAU); ctx.stroke();
    }
    if (Math.abs(slicePos) === 1) { ctx.fillStyle = '#b5fff1'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.textAlign = 'center'; ctx.font = '12px system-ui,sans-serif'; ctx.fillStyle = '#abc8db';
    ctx.fillText(threeD ? ui().canvasSlice3d : ui().canvasSlice2d, w / 2, h - 17);
  }

  // Cập nhật toàn bộ Bước 02 theo slicePos: khối cầu, chữ trạng thái, rồi vật hình vòm.
  function updateSlice() {
    const t = ui(), s = slicePos, r = radiusAt(s), none = Math.abs(s) > 1, touch = Math.abs(s) === 1;
    $('sliceRange').value = Math.round(s * 100);
    $('sliceOffset').textContent = signed(s);
    $('sliceStatus').textContent = none ? t.sliceNone : touch ? t.sliceTouch : Math.abs(s) < .011 ? t.sliceCenter : t.sliceCutting;
    const descr = none ? t.descrNone : touch ? t.descrPoint : t.descrRadius(decimal(r));
    $('slice2dText').textContent = t.disk(descr);
    $('slice3dText').textContent = t.ball(descr);
    drawSlice('slice2dCanvas', false);
    drawSlice('slice3dCanvas', true);
    updateRecon();
  }

  function stopSlice() { slicePlaying = false; renderPlayButtons(); }

  // Hai thanh trượt (khối cầu và vật hình vòm) cùng điều khiển một vị trí lát cắt.
  const onSliceInput = e => { stopSlice(); slicePos = Number(e.target.value) / 100; updateSlice(); };
  $('sliceRange').addEventListener('input', onSliceInput);
  $('reconWRange').addEventListener('input', onSliceInput);
  $('sliceCenter').addEventListener('click', () => { stopSlice(); slicePos = 0; updateSlice(); });
  $('slicePlay').addEventListener('click', () => {
    slicePlaying = !slicePlaying; renderPlayButtons(); animPrevious = 0;
    if (slicePlaying) startTick();
  });

  /* ================= Bước 02: tái dựng vật hình vòm ================= */
  // Vật 4D liền khối: hợp của 129 khối cầu 4D đóng, bán kính R, tâm nằm trên một vòng cung trong mặt phẳng XW (Y = Z = 0).
  const R = .34, A = 1.08, BASE = -.50, HEIGHT = 1.18;
  const centers = Array.from({ length: 129 }, (_, i) => { const t = Math.PI * i / 128; return { x: A * Math.cos(t), w: BASE + HEIGHT * Math.sin(t) }; });
  const planCanvas = $('reconPlanCanvas'), bodyCanvas = $('reconBodyCanvas');

  function activeBalls(w) {
    return centers.flatMap(c => { const d = w - c.w, r2 = R * R - d * d; return r2 > 0 ? [{ x: c.x, r: Math.sqrt(r2), r2 }] : []; });
  }
  // Đếm chính xác số phần liên thông: mọi khối cầu 3D của lát cắt có tâm trên trục X,
  // nên hợp của chúng liền khi và chỉ khi các đoạn [x − r, x + r] chồng lên nhau liên tiếp.
  function intervalsAt(w) {
    const list = activeBalls(w).map(c => [c.x - c.r, c.x + c.r]).sort((a, b) => a[0] - b[0]);
    const parts = [];
    for (const [l, h] of list) {
      const last = parts[parts.length - 1];
      if (last && l <= last[1] + 1e-9) last[1] = Math.max(last[1], h); else parts.push([l, h]);
    }
    return parts;
  }
  function rhoSquared(x, balls) {
    let best = -Infinity;
    for (const b of balls) { const d = x - b.x, r2 = b.r2 - d * d; if (r2 > best) best = r2; }
    return best;
  }

  function reconBackground(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#102d41'); g.addColorStop(1, '#0a1b2c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(127,187,204,.075)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 37) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 37) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }

  // Sơ đồ X–W là giao của vật với mặt phẳng Y = Z = 0, không phải ảnh chụp vật 4D.
  function drawPlan(W) {
    const t = ui(), { ctx, w, h } = canvasSize(planCanvas, 2.25);
    reconBackground(ctx, w, h);
    const k = Math.min((w - 43) / 3.25, (h - 37) / 2.34), px = x => w / 2 + k * x, py = v => h / 2 - k * v;
    const arch = () => { ctx.beginPath(); centers.forEach((c, i) => i ? ctx.lineTo(px(c.x), py(c.w)) : ctx.moveTo(px(c.x), py(c.w))); ctx.stroke(); };
    ctx.strokeStyle = 'rgba(98,230,210,.27)'; ctx.lineWidth = 2 * R * k; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; arch();
    ctx.strokeStyle = '#79e5d5'; ctx.lineWidth = 1.5; arch();
    ctx.strokeStyle = 'rgba(227,244,249,.44)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(-1.58), py(0)); ctx.lineTo(px(1.58), py(0)); ctx.moveTo(px(0), py(-1.10)); ctx.lineTo(px(0), py(1.10)); ctx.stroke();
    ctx.setLineDash([7, 5]); ctx.strokeStyle = '#ffbd7e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px(-1.58), py(W)); ctx.lineTo(px(1.58), py(W)); ctx.stroke(); ctx.setLineDash([]);
    // Các đoạn sáng trên đường quét là phần giao (một hoặc hai đoạn).
    ctx.strokeStyle = '#fff3cc'; ctx.lineCap = 'round'; ctx.lineWidth = 5;
    for (const [l, r] of intervalsAt(W)) { ctx.beginPath(); ctx.moveTo(px(l), py(W)); ctx.lineTo(px(r), py(W)); ctx.stroke(); }
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px system-ui,sans-serif'; ctx.fillStyle = '#b7d7e6';
    ctx.fillText('X →', w - 41, py(0) - 8); ctx.fillText('W ↑', px(0) + 9, 17);
    ctx.fillStyle = '#ffcf9c'; ctx.font = 'bold 11px system-ui,sans-serif'; ctx.fillText(t.canvasCurrentW, 10, 20);
    ctx.fillStyle = '#b8cbde'; ctx.font = '11px system-ui,sans-serif'; ctx.fillText(t.canvasPlane, 10, h - 9);
  }

  function drawBody(W) {
    const t = ui(), { ctx, w, h } = canvasSize(bodyCanvas, 2.25);
    reconBackground(ctx, w, h);
    const balls = activeBalls(W), parts = intervalsAt(W);
    const zoom = 1.30 * Math.min((w - 40) / 3.05, (h - 40) / 1.95), cy = h * .50;
    const proj = (x, y, z) => {
      const [x1, y1, z2] = turn3(x, y, z, -.30, .26), p = 4.8 / (5.8 - z2);
      return { x: w / 2 + x1 * zoom * p, y: cy - y1 * zoom * p, z: z2 };
    };
    // Trục tham chiếu, không ngụ ý hình học 4D nào.
    ctx.strokeStyle = 'rgba(127,207,199,.21)'; ctx.lineWidth = 1;
    for (const axis of [[-1.65, 0, 0, 1.65, 0, 0], [0, -.9, 0, 0, .9, 0], [0, 0, -.9, 0, 0, .9]]) {
      const p = proj(...axis.slice(0, 3)), q = proj(...axis.slice(3));
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    if (!balls.length) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#a9c4d4'; ctx.font = 'bold 15px system-ui,sans-serif';
      ctx.fillText(t.canvasNoSection, w / 2, cy); ctx.textAlign = 'left';
      return;
    }
    // Mặt tròn xoay quanh trục X: tại mỗi x, lát cắt 3D có bán kính đúng rho(x)² = max_i (R² − (W − wi)² − (x − xi)²).
    // Chia đa giác chỉ để vẽ; mỗi đoạn liền được lấy mẫu dày hơn ở hai đầu tròn để không sinh mũi nhọn giả.
    const m = 26, n = 112, patches = [];
    for (const [left, right] of parts) {
      const xx = Array.from({ length: n + 1 }, (_, i) => left + (right - left) * (1 - Math.cos(Math.PI * i / n)) / 2);
      const rho = xx.map(x => Math.sqrt(Math.max(0, rhoSquared(x, balls))));
      for (let i = 0; i < n; i++) {
        const ri = rho[i], rj = rho[i + 1];
        if (ri < .00001 && rj < .00001) continue;
        const x0 = xx[i], x1 = xx[i + 1], dx = x1 - x0;
        for (let j = 0; j < m; j++) {
          const t0 = j * TAU / m, t1 = (j + 1) * TAU / m;
          const p0 = proj(x0, ri * Math.cos(t0), ri * Math.sin(t0)), p1 = proj(x1, rj * Math.cos(t0), rj * Math.sin(t0));
          const p2 = proj(x1, rj * Math.cos(t1), rj * Math.sin(t1)), p3 = proj(x0, ri * Math.cos(t1), ri * Math.sin(t1));
          const dr = (rj - ri) / dx, mid = (t0 + t1) / 2, ny = Math.cos(mid), nz = Math.sin(mid), nx = -dr;
          const light = Math.max(0, (nx * .43 + ny * .68 + nz * .66) / Math.sqrt(nx * nx + 1));
          patches.push({ quad: [p0, p1, p2, p3], depth: (p0.z + p1.z + p2.z + p3.z) / 4, light });
        }
      }
    }
    patches.sort((a, b) => a.depth - b.depth);
    for (const p of patches) {
      const L = p.light;
      ctx.fillStyle = `rgb(${Math.round(14 + 60 * L)},${Math.round(93 + 115 * L)},${Math.round(115 + 105 * L)})`;
      ctx.beginPath(); p.quad.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .55; ctx.stroke();
    }
    // Đường dọc trục giữa cho thấy hai phần thẳng hàng nhau trong không gian.
    ctx.strokeStyle = 'rgba(204,255,244,.16)'; ctx.lineWidth = 1.2;
    const ax = proj(-1.48, 0, 0), bx = proj(1.48, 0, 0);
    ctx.beginPath(); ctx.moveTo(ax.x, ax.y); ctx.lineTo(bx.x, bx.y); ctx.stroke();
    ctx.fillStyle = '#c6eaf0'; ctx.font = '11px system-ui,sans-serif';
    ctx.fillText(t.canvasSection + signedPlus(W), 11, h - 10);
  }

  // Vẽ gộp trong một khung hình: kéo thanh nhanh không làm vẽ thừa.
  let reconPending = false;
  function scheduleRecon() {
    if (reconPending) return;
    reconPending = true;
    requestAnimationFrame(() => { reconPending = false; drawPlan(slicePos); drawBody(slicePos); });
  }

  function updateRecon() {
    const t = ui(), W = slicePos, count = intervalsAt(W).length;
    $('reconWRange').value = Math.round(W * 100);
    $('reconWOutput').textContent = signedPlus(W);
    $('reconStatus').textContent = t.reconStatus(count);
    $('reconBodyText').textContent = t.reconBody(count);
    $('reconPlanText').textContent = t.reconPlan(signedPlus(W));
    scheduleRecon();
  }

  /* ================= Vòng lặp chuyển động ================= */
  // Chỉ chạy khi người xem bấm một nút chạy; tự dừng khi không còn gì chuyển động.
  let animPrevious = 0, tickActive = false;
  function startTick() { if (tickActive) return; tickActive = true; animPrevious = 0; requestAnimationFrame(tick); }
  function tick(now) {
    if (!autorotate && !slicePlaying && !cameraPlaying) { tickActive = false; return; }
    const dt = animPrevious ? Math.min((now - animPrevious) / 1000, .055) : 0;
    animPrevious = now;
    if (autorotate) { angles.XW = ((angles.XW + dt * 25 + 180) % 360) - 180; angles.YW = ((angles.YW + dt * 12 + 180) % 360) - 180; refreshRotation(); }
    if (cameraPlaying) { angles.XW = ((angles.XW + dt * 24 + 180) % 360) - 180; refreshRotation(); }
    if (slicePlaying) { slicePos += dt * .37; if (slicePos > 1.15) slicePos = -1.15; updateSlice(); }
    requestAnimationFrame(tick);
  }

  function setToggle(id, on, offText, onText) {
    const btn = $(id);
    btn.textContent = on ? onText : offText;
    btn.setAttribute('aria-pressed', String(on));
  }
  function renderPlayButtons() {
    const t = ui();
    setToggle('rotatePlay', autorotate, t.rotatePlay, t.rotateStop);
    setToggle('slicePlay', slicePlaying, t.slicePlay, t.slicePause);
    setToggle('cameraPlay', cameraPlaying, t.cameraPlay, t.cameraStop);
  }

  /* ================= Thanh bên và ngăn kéo mobile ================= */
  const body = document.body, sidebar = $('lessonSidebar'), sideBtn = $('sidebarToggle'), menuBtn = $('menuButton');
  const mobile = window.matchMedia('(max-width:800px)');
  let expanded = true, mobileOpen = false;

  function updateSidebar() {
    const t = ui(), isMobile = mobile.matches;
    body.classList.toggle('sidebar-collapsed', !expanded && !isMobile);
    body.classList.toggle('sidebar-mobile-open', isMobile && mobileOpen);
    const label = isMobile ? t.closeMenu : expanded ? t.collapseSidebar : t.expandSidebar;
    sideBtn.setAttribute('aria-expanded', String(isMobile ? mobileOpen : expanded));
    sideBtn.setAttribute('aria-label', label);
    sideBtn.title = label;
    sideBtn.querySelector('span').textContent = isMobile ? '×' : '‹';
    menuBtn.setAttribute('aria-expanded', String(isMobile && mobileOpen));
    menuBtn.setAttribute('aria-label', isMobile && mobileOpen ? t.closeSteps : t.openSteps);
    // Ngăn kéo đang đóng thì các link ẩn không được nhận focus bàn phím.
    sidebar.setAttribute('aria-hidden', String(isMobile && !mobileOpen));
    sidebar.inert = isMobile && !mobileOpen;
  }
  function closeDrawer() { mobileOpen = false; updateSidebar(); menuBtn.focus(); }

  sideBtn.addEventListener('click', () => {
    if (mobile.matches) closeDrawer();
    else { expanded = !expanded; updateSidebar(); }
  });
  menuBtn.addEventListener('click', () => { mobileOpen = !mobileOpen; updateSidebar(); if (mobileOpen) sideBtn.focus(); });
  $('sidebarBackdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mobileOpen) closeDrawer(); });
  sidebar.querySelectorAll('nav a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      if (!mobile.matches) return;
      e.preventDefault();
      const hash = link.getAttribute('href'), section = document.getElementById(hash.slice(1));
      mobileOpen = false; updateSidebar();
      if (section) {
        history.pushState(null, '', hash);
        // Cuộn ngay lập tức, để không lạc đích khi trang vừa mở khóa cuộn.
        section.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
  });
  mobile.addEventListener('change', () => { mobileOpen = false; updateSidebar(); });

  /* ================= Chân trang thu gọn ================= */
  const creditBox = document.querySelector('.credit-box'), creditBtn = creditBox.querySelector('.credit-toggle'), creditBody = $('credit-body');
  const CREDIT_KEY = 'byherk-credit-collapsed';
  function renderCredit() {
    const collapsed = creditBox.classList.contains('is-collapsed'), label = collapsed ? ui().expand : ui().collapse;
    creditBody.hidden = collapsed;
    creditBtn.setAttribute('aria-expanded', String(!collapsed));
    creditBtn.setAttribute('aria-label', label);
    creditBtn.title = label;
  }
  try { if (localStorage.getItem(CREDIT_KEY) === '1') creditBox.classList.add('is-collapsed'); } catch (e) { /* trình duyệt chặn lưu trữ */ }
  creditBtn.addEventListener('click', () => {
    const collapsed = creditBox.classList.toggle('is-collapsed');
    renderCredit();
    try { localStorage.setItem(CREDIT_KEY, collapsed ? '1' : '0'); } catch (e) { /* trình duyệt chặn lưu trữ */ }
  });

  /* ================= Đổi ngôn ngữ ================= */
  const ATTRS = ['aria-label', 'title'];
  // Bản tiếng Việt chụp từ HTML lúc mở trang, trước khi có gì bị thay.
  const VI_PAGE = (() => {
    const s = {};
    document.querySelectorAll('[data-i18n]').forEach(el => { s[el.dataset.i18n] = el.textContent; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { s[el.dataset.i18nHtml] = el.innerHTML; });
    for (const attr of ATTRS) document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => { s[el.getAttribute(`data-i18n-${attr}`)] = el.getAttribute(attr); });
    return s;
  })();

  function applyStaticText() {
    const t = ui(), page = lang === 'vi' ? VI_PAGE : CONTENT.en.page;
    const text = key => page[key] ?? VI_PAGE[key];
    document.documentElement.lang = lang;
    document.title = t.pageTitle;
    document.querySelector('meta[name="description"]').setAttribute('content', t.metaDescription);
    document.querySelector('link[rel="canonical"]').setAttribute('href', lang === 'en' ? CANONICAL + '?lang=en' : CANONICAL);
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = text(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = text(el.dataset.i18nHtml); });
    for (const attr of ATTRS) document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => { el.setAttribute(attr, text(el.getAttribute(`data-i18n-${attr}`))); });
    // Link mục lục: tooltip và tên cho trình đọc màn hình lặp lại số bước và nhãn (cần khi thanh bên thu gọn).
    document.querySelectorAll('.navlinks a').forEach(a => {
      const name = a.querySelector('.step-no').textContent + ' · ' + a.querySelector('.step-label').textContent;
      a.title = name; a.setAttribute('aria-label', name);
    });
    // Nút ngôn ngữ hiện mã ngôn ngữ ĐÍCH, như trang danh mục.
    const next = lang === 'vi' ? 'en' : 'vi', btn = document.querySelector('.lang-toggle');
    btn.textContent = next.toUpperCase();
    btn.lang = next;
    btn.setAttribute('aria-label', CONTENT[next].ui.langName);
    btn.title = CONTENT[next].ui.langName;
  }

  // Vẽ lại mọi chữ phụ thuộc ngôn ngữ; không đụng tới trạng thái mô phỏng.
  function renderLanguage() {
    applyStaticText();
    renderPlayButtons();
    updateSidebar();
    renderCredit();
    drawTesseract();
    updateSlice();
  }

  // Đổi ngôn ngữ không tải lại trang; ghi vào localStorage và ?lang= trên URL (giữ tham số khác và #hash).
  function setLang(next) {
    if (!CONTENT[next] || next === lang) return;
    lang = next;
    try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* trình duyệt chặn lưu trữ: vẫn đổi được trong phiên này */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    history.replaceState(history.state, '', url);
    renderLanguage();
  }
  document.querySelector('.lang-toggle').addEventListener('click', () => setLang(lang === 'vi' ? 'en' : 'vi'));

  /* ================= Khởi động ================= */
  renderLanguage();
  refreshRotation();

  // ResizeObserver lo cả bố cục co giãn lẫn thu phóng trình duyệt.
  const redrawAll = () => { drawTesseract(); updateSlice(); drawCameraRoom(); };
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(redrawAll);
    [tesseractCanvas, $('slice2dCanvas'), $('slice3dCanvas'), ...CAMERA_IDS.map(id => $(id))].forEach(el => ro.observe(el));
    const roRecon = new ResizeObserver(scheduleRecon);
    roRecon.observe(planCanvas); roRecon.observe(bodyCanvas);
  } else {
    window.addEventListener('resize', () => { redrawAll(); scheduleRecon(); });
  }
})();
