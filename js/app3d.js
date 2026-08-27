/* ============================================================
 * JifaWork · app3d.js —— 智能家居 3D 可视化（Three.js）
 * 依赖：three@0.160（index.html 里的 importmap）
 * 对外接口：window.JW3D = { select(id), sync() }
 * ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const JW = window.JW || {};
const ST = {
  on:   '#35d0ba',
  idle: '#ffb454',
};

/* ---------- 主题色板（深 / 浅） ---------- */
let THEME = (document.documentElement.getAttribute('data-theme') === 'light') ? 'light' : 'dark';
const PAL = {
  dark:  { wall: 0x2a3550, f1: 0x232c44, f2: 0x202840, hemiGround: 0x101524, amb: 0x33415e, ambI: 0.5, dirI: 0.9, roomLab: '#7d8db0', devLab: '#c7d2ea', off: '#46536b' },
  light: { wall: 0xb6c2d8, f1: 0xd3dbe9, f2: 0xc6d1e2, hemiGround: 0xe9edf4, amb: 0xffffff, ambI: 0.45, dirI: 1.05, roomLab: '#5b6b8c', devLab: '#333f57', off: '#9aa7bd' },
};
function statusColor(s) {
  if (s === 'on') return ST.on;
  if (s === 'idle') return ST.idle;
  return PAL[THEME].off;
}
const labels = [];        // 所有文字精灵（切主题时重绘）
const themeMats = [];     // { mat, dk, lt } 深浅两套颜色的材质

const roomByKey = {};
(JW.rooms || []).forEach(r => { roomByKey[r.key] = r; });

const mount = document.getElementById('scene3d');
const note = document.getElementById('sceneNote');
const markers = new Map(); // id -> { group, ring, pillar, dev }

let renderer, scene, camera, controls, raycaster, pointer, hovered = null;
let selectedId = null;

/* ---------- 文字精灵 ---------- */
function labelColor(kind) { return kind === 'room' ? PAL[THEME].roomLab : PAL[THEME].devLab; }

function drawLabelCanvas(c, text, color) {
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = '600 28px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
}

function refreshLabels() {
  labels.forEach(sp => {
    drawLabelCanvas(sp.material.map.image, sp.userData.text, labelColor(sp.userData.kind));
    sp.material.map.needsUpdate = true;
  });
}

function makeLabel(text, { size = 1.4, kind = 'dev' } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = '600 28px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  const w = ctx.measureText(text).width + 16;
  c.width = Math.max(64, w);
  c.height = 44;
  drawLabelCanvas(c, text, labelColor(kind));
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const aspect = c.width / c.height;
  sp.scale.set(size * aspect, size, 1);
  sp.userData = { text, kind };
  labels.push(sp);
  return sp;
}

/* ---------- 楼板与墙体 ---------- */
function buildRooms() {
  const group = new THREE.Group();
  (JW.rooms || []).forEach(r => {
    const x = r.x, z = r.z, w = r.w, h = r.h;
    // 楼板（浅色主题下提亮）
    const floorMat = new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.9, metalness: 0.1 });
    themeMats.push({
      mat: floorMat,
      dk: new THREE.Color(r.color),
      lt: new THREE.Color(r.color).lerp(new THREE.Color(0xffffff), 0.55),
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, h), floorMat);
    floor.position.set(x, -0.07, z);
    group.add(floor);
    // 地脚线 / 墙体
    const wallMat = new THREE.MeshStandardMaterial({ color: PAL[THEME].wall, transparent: true, opacity: 0.5, roughness: 0.8 });
    themeMats.push({ mat: wallMat, dk: new THREE.Color(PAL.dark.wall), lt: new THREE.Color(PAL.light.wall) });
    const t = 0.08, th = 0.55;
    const mk = (px, pz, sx, sz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, th, sz), wallMat);
      m.position.set(px, th / 2, pz);
      group.add(m);
    };
    mk(x - w / 2, z, t, h); mk(x + w / 2, z, t, h);
    mk(x, z - h / 2, w, t); mk(x, z + h / 2, w, t);
    // 房间名
    const lab = makeLabel(r.name, { kind: 'room', size: 0.7 });
    lab.position.set(x, 0.05, z + h / 2 + 0.55);
    group.add(lab);
    // 简单家具
    const furn = [
      { w: 1.5, h: 0.4, d: 0.9, px: x - 0.6, pz: z - 0.2, pal: 'f1' },  // 沙发/床
      { w: 0.9, h: 0.8, d: 0.5, px: x + 0.8, pz: z + 0.2, pal: 'f2' },  // 柜子
    ];
    furn.forEach(f => {
      const fm = new THREE.MeshStandardMaterial({ color: PAL[THEME][f.pal], roughness: 0.85 });
      themeMats.push({ mat: fm, dk: new THREE.Color(PAL.dark[f.pal]), lt: new THREE.Color(PAL.light[f.pal]) });
      const m = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.d), fm);
      m.position.set(f.px, f.h / 2, f.pz);
      group.add(m);
    });
  });
  return group;
}

/* ---------- 设备标记 ---------- */
function glowTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, color + 'aa');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function buildMarker(dev) {
  const r = roomByKey[dev.room] || { x: 0, z: 0 };
  const px = r.x + (dev.pos ? dev.pos[0] : 0);
  const pz = r.z + (dev.pos ? dev.pos[1] : 0);
  const group = new THREE.Group();
  group.position.set(px, 0, pz);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.32, 40),
    new THREE.MeshBasicMaterial({ color: statusColor(dev.status), side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.065, 0.5, 16),
    new THREE.MeshBasicMaterial({ color: statusColor(dev.status) })
  );
  pillar.position.y = 0.27;
  group.add(pillar);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(statusColor(dev.status)), transparent: true, depthWrite: false }));
  glow.scale.set(1.3, 1.3, 1);
  glow.position.y = 0.32;
  group.add(glow);

  const lab = makeLabel(dev.name, { size: 0.5 });
  lab.position.y = 0.95;
  group.add(lab);

  group.userData = { dev };
  return group;
}

function colorMarker(dev, active) {
  const m = markers.get(dev.id);
  if (!m) return;
  const col = active ? '#ffffff' : statusColor(dev.status);
  m.ring.material.color.set(col);
  m.pillar.material.color.set(col);
  m.ring.material.opacity = active ? 1 : 0.95;
  const s = active ? 1.35 : 1;
  m.ring.scale.set(s, s, 1);
}

/* ---------- 渲染循环 ---------- */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

/* ---------- 交互 ---------- */
function onPointerMove(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(Array.from(markers.values()), true);
  const h = hits.length ? hits[0].object : null;
  let dev = null;
  if (h) {
    let o = h;
    while (o && !o.userData.dev) o = o.parent;
    dev = o ? o.userData.dev : null;
  }
  if (hovered !== dev) {
    if (hovered) colorMarker(hovered, false);
    hovered = dev;
    if (hovered && hovered.id !== selectedId) colorMarker(hovered, true);
    renderer.domElement.style.cursor = dev ? 'pointer' : 'grab';
  }
}

function onClick() {
  if (!hovered) return;
  selectedId = hovered.id;
  markers.forEach((m, id) => colorMarker(m.userData.dev, id === selectedId));
  if (window.JW_SELECT) window.JW_SELECT(selectedId);
}

/* ---------- 对外接口 ---------- */
function select(id) {
  selectedId = id;
  markers.forEach((m, key) => colorMarker(m.userData.dev, key === id));
}

function sync() {
  JW.devices.forEach(dev => {
    const m = markers.get(dev.id);
    if (m) {
      const col = statusColor(dev.status);
      m.ring.material.color.set(col);
      m.pillar.material.color.set(col);
      m.glow.material.map = glowTexture(col);
      m.glow.material.needsUpdate = true;
    }
  });
  if (selectedId) select(selectedId);
}

/* ---------- 主题切换 ---------- */
let hemiLight = null, ambLight = null, dirLight = null;
function setTheme(t) {
  THEME = (t === 'light') ? 'light' : 'dark';
  if (!scene) return;
  const p = PAL[THEME];
  themeMats.forEach(m => m.mat.color.copy(THEME === 'light' ? m.lt : m.dk));
  if (hemiLight) hemiLight.groundColor.set(p.hemiGround);
  if (ambLight) ambLight.color.set(p.amb);
  if (dirLight) dirLight.intensity = p.dirI;
  refreshLabels();
  sync();
}

window.JW3D = { select, sync, setTheme };

/* ---------- 初始化 ---------- */
function init() {
  if (!mount) return;
  const w = mount.clientWidth || 640, h = mount.clientHeight || 440;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  mount.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
  camera.position.set(5.2, 9.5, 8.8);

  hemiLight = new THREE.HemisphereLight(0xffffff, PAL[THEME].hemiGround, 0.85);
  scene.add(hemiLight);
  dirLight = new THREE.DirectionalLight(0xffffff, PAL[THEME].dirI);
  dirLight.position.set(6, 12, 4);
  scene.add(dirLight);
  ambLight = new THREE.AmbientLight(PAL[THEME].amb, PAL[THEME].ambI);
  scene.add(ambLight);

  scene.add(buildRooms());

  JW.devices.forEach(dev => {
    const g = buildMarker(dev);
    markers.set(dev.id, { group: g, ring: g.children[0], pillar: g.children[1], glow: g.children[2], dev });
    scene.add(g);
  });

  controls = new OrbitControls(camera, renderer.domElement);
  const cx = 2.3, cz = -1.2;
  controls.target.set(cx, 0, cz);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.25;
  controls.minDistance = 4;
  controls.maxDistance = 26;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });
  renderer.domElement.addEventListener('wheel', () => { controls.autoRotate = false; });
  renderer.domElement.addEventListener('dblclick', () => { controls.autoRotate = true; });

  const ro = new ResizeObserver(() => {
    const nw = mount.clientWidth, nh = mount.clientHeight;
    if (!nw || !nh) return;
    renderer.setSize(nw, nh);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
  });
  ro.observe(mount);

  if (note) note.textContent = '拖拽旋转 · 滚轮缩放 · 点击设备查看详情 · 双击恢复自动旋转';
  animate();
  select(JW.devices[0] ? JW.devices[0].id : null);
}

try { init(); } catch (e) {
  if (note) note.textContent = '3D 场景初始化失败：' + e.message;
  console.error(e);
}
