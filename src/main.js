import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { buildMaterials } from './materials.js';
import { setMaxAnisotropy } from './textures.js';
import { Explorer } from './controls.js';
import { AudioEngine } from './audio.js';
import { buildSquare, SQ } from './square.js';
import { buildShahMosque } from './shahMosque.js';
import { buildLotfollah } from './lotfollah.js';
import { buildAliQapu } from './aliQapu.js';
import { buildQeysarieh } from './qeysarieh.js';
import { PLACES, TOUR } from './places.js';
import { mergeStatic } from './static.js';
import { buildPeople } from './people.js';
import { LightRig } from './lightrig.js';
import { resolveCoplanar } from './zfix.js';

const $ = (s) => document.querySelector(s);
const progress = (msg, f) => {
  $('#load-msg').textContent = msg;
  $('#load-bar').style.width = Math.round(f * 100) + '%';
};
// yield so the progress text can paint (rAF alone stalls in background tabs)
const frame = () => new Promise((r) => {
  let done = false;
  const go = () => { if (!done) { done = true; r(); } };
  requestAnimationFrame(() => setTimeout(go, 0));
  setTimeout(go, 60);
});

// ---------------------------------------------------------------- renderer
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
// render resolution adapts to the frame rate (see step); start modestly on high-DPI screens
const MAX_PR = Math.min(window.devicePixelRatio, 1.5);
let pixelRatio = Math.min(MAX_PR, 1);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// the shadow map is re-rendered only when the sun or the shadow frustum moves
renderer.shadowMap.autoUpdate = false;
setMaxAnisotropy(Math.min(4, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.3, 4000);
// layer 1 = decorative clutter (trees, people, city): visible, casts shadows, skipped by pool reflections
camera.layers.enable(1);
camera.layers.enable(2); // reflective water
scene.fog = new THREE.FogExp2(0xcfd8e0, 0.0007);

// ---------------------------------------------------------------- sky & light
const sky = new Sky();
sky.scale.setScalar(20000);
scene.add(sky);
const su = sky.material.uniforms;
su.turbidity.value = 5;
su.rayleigh.value = 1.4;
su.mieCoefficient.value = 0.004;
su.mieDirectionalG.value = 0.82;

const sun = new THREE.DirectionalLight(0xfff1dc, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.layers.enable(1);
camera.layers.enable(2); // reflective water
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0xc9a877, 1.1);
scene.add(hemi);
const rig = new LightRig(scene, 3);

// stars for the night sky
const stars = (() => {
  const n = 2500;
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1,
      th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    p.set([r * Math.cos(th) * 2900, Math.abs(u) * 2900 + 30, r * Math.sin(th) * 2900], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const s = new THREE.Points(g, m);
  s.renderOrder = -1;
  scene.add(s);
  return s;
})();

// deep-blue night dome drawn over the sky shader after dusk
const nightDome = (() => {
  const g = new THREE.SphereGeometry(3000, 32, 16);
  const cols = [];
  const pos = g.attributes.position;
  const top = new THREE.Color(0x050b1f),
    hor = new THREE.Color(0x1c2748);
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(0, pos.getY(i) / 3000);
    const c = hor.clone().lerp(top, Math.pow(k, 0.6));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const d = new THREE.Mesh(g, m);
  d.renderOrder = -2;
  scene.add(d);
  return d;
})();
stars.renderOrder = -1;

// floodlights on the monuments at night
const flood = [
  [[0, 2, 230], [0, 20, 272]],
  [[-30, 3, 300], [-58, 40, 366]],
  [[60, 2, 62], [88, 12, 62]],
  [[70, 3, 70], [118, 28, 68]],
  [[-40, 2, 60], [-76, 18, 63]],
];
for (const [from, to] of flood) {
  const l = new THREE.SpotLight(0xffd9a0, 0, 0, 0.42, 0.6, 1.1);
  l.position.set(...from);
  l.target.position.set(...to);
  l.userData.base = 700;
  scene.add(l, l.target);
}

const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envSky = new Sky();
envSky.scale.setScalar(1000);
envScene.add(envSky);
let envRT = null;

// Sun position for Isfahan (32.65°N) around late April; model -z = bearing 349.5° (square axis)
const LAT = (32.65 * Math.PI) / 180;
const DECL = (13 * Math.PI) / 180;
const AXIS = (-10.5 * Math.PI) / 180;
function sunDir(hour) {
  const H = ((hour - 12.1) * 15 * Math.PI) / 180;
  const sinEl = Math.sin(LAT) * Math.sin(DECL) + Math.cos(LAT) * Math.cos(DECL) * Math.cos(H);
  const el = Math.asin(sinEl);
  let az = Math.acos((Math.sin(DECL) - Math.sin(el) * Math.sin(LAT)) / (Math.cos(el) * Math.cos(LAT)));
  if (H > 0) az = 2 * Math.PI - az; // bearing clockwise from north
  const b = az - AXIS; // bearing relative to the square's axis
  return { el, dir: new THREE.Vector3(Math.sin(b) * Math.cos(el), Math.sin(el), -Math.cos(b) * Math.cos(el)) };
}

const W = {
  scene,
  colliders: [],
  floors: [],
  updaters: [],
  nightLights: [],
  waters: [],
  zones: [],
  footprints: [],
};

let tod = 17.4; // time of day (hours)
let night = 0,
  dusk = 0;
let envDirty = true;
function applyTime() {
  const { el, dir } = sunDir(tod);
  const elDeg = (el * 180) / Math.PI;
  su.sunPosition.value.copy(dir);
  envSky.material.uniforms.sunPosition.value.copy(dir);
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) envSky.material.uniforms[k].value = su[k].value;
  night = THREE.MathUtils.smoothstep(-elDeg, -2, 9);
  dusk = Math.max(0, 1 - Math.abs(elDeg - 3) / 9);
  const day = 1 - night;
  // warm the sunlight near the horizon
  const warm = THREE.MathUtils.smoothstep(elDeg, -2, 25);
  const sunI = 3.2 * THREE.MathUtils.smoothstep(elDeg, -3, 6);
  if (sunI > 0.05) {
    sun.color.setRGB(1, 0.62 + 0.36 * warm, 0.38 + 0.55 * warm);
    sun.intensity = sunI;
    lightDir.copy(dir);
  } else {
    // moonlight from high in the south-east
    sun.color.set(0x9fb4ff);
    sun.intensity = 0.35 * night;
    lightDir.set(0.35, 0.8, 0.45).normalize();
  }
  renderer.shadowMap.needsUpdate = true;
  hemi.intensity = 0.25 + 1.0 * day;
  hemi.color.setRGB(0.7 + 0.1 * warm, 0.78 + 0.1 * warm, 0.9 + 0.1 * warm).lerp(new THREE.Color(0x4a5a8a), night);
  hemi.groundColor.set(0xc9a877).lerp(new THREE.Color(0x3a2a1a), night);
  renderer.toneMappingExposure = 0.55 + 0.25 * night;
  stars.material.opacity = THREE.MathUtils.smoothstep(night, 0.5, 1);
  nightDome.material.opacity = THREE.MathUtils.smoothstep(night, 0.35, 0.95);
  nightDome.visible = nightDome.material.opacity > 0.001;
  const fogC = new THREE.Color().setHSL(0.58, 0.25, 0.8).lerp(new THREE.Color(0xf0b88a), dusk * 0.6).lerp(new THREE.Color(0x0e1424), night);
  scene.fog.color.copy(fogC);
  // night illumination
  const lampOn = THREE.MathUtils.smoothstep(night, 0.15, 0.7);
  rig.lampOn = lampOn;
  rig.update(0, camera.position, true);
  for (const l of W.nightLights) {
    if (l.isLight) l.intensity = l.userData.base * lampOn;
    else if (l.emissiveIntensity !== undefined) l.emissiveIntensity = (l.userData.base ?? 1.5) * lampOn;
  }
  W.dayFactor = 1 - night;
  for (const w of W.waters) w.setSun?.(dir, sun.color, night);
  envDirty = true;
  if (audio) {
    audio.env.night = night;
    audio.env.dusk = dusk;
  }
  $('#tod-label').textContent = fmtTime(tod);
}
function fmtTime(h) {
  const hh = Math.floor(h),
    mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function updateEnv() {
  if (!envDirty) return;
  envDirty = false;
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(envScene, 0, 0.1, 2000);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.45 * (1 - night) + 0.05;
}

// shadow frustum follows the camera; the map is re-rendered only when it moves
const lightDir = new THREE.Vector3(0, 1, 0);
const lastShadow = { center: new THREE.Vector3(1e9, 0, 0), size: 0 };
function updateShadow() {
  const c = camera.position;
  const h = Math.max(0, c.y);
  const size = THREE.MathUtils.clamp(Math.round((110 + h * 2.2) / 40) * 40, 120, 440);
  const cam = sun.shadow.camera;
  if (cam.right !== size) {
    cam.left = -size;
    cam.right = size;
    cam.top = size;
    cam.bottom = -size;
    cam.near = 1;
    cam.far = 1600;
    cam.updateProjectionMatrix();
  }
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  fwd.y = 0;
  fwd.normalize();
  const center = new THREE.Vector3(c.x, 0, c.z).addScaledVector(fwd, size * 0.45);
  if (center.distanceTo(lastShadow.center) < size * 0.18 && size === lastShadow.size) return;
  lastShadow.center.copy(center);
  lastShadow.size = size;
  renderer.shadowMap.needsUpdate = true;
  // snap to texel grid to reduce shimmering
  const texel = (2 * size) / sun.shadow.mapSize.x;
  center.x = Math.round(center.x / texel) * texel;
  center.z = Math.round(center.z / texel) * texel;
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(lightDir, 700);
}

// ---------------------------------------------------------------- audio & controls
let audio = null;
const explorer = new Explorer(camera, canvas, { colliders: W.colliders, floors: W.floors });
explorer.onStep = (v) => audio?.footstep(v);

// ---------------------------------------------------------------- build world
let M;
async function build() {
  // the calligraphy bands are painted with Amiri: wait (briefly) for the web fonts
  progress('Preparing the calligraphy…', 0.02);
  await Promise.race([Promise.all([document.fonts.load('700 64px Amiri'), document.fonts.load('400 32px "Aref Ruqaa"')]).catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
  progress('Glazing the tiles…', 0.05);
  await frame();
  M = buildMaterials();
  progress('Laying out the Maydan…', 0.25);
  await frame();
  const shah = buildShahMosque(M, W);
  progress('Raising the domes…', 0.45);
  await frame();
  const lotf = buildLotfollah(M, W);
  progress('Carving the talar columns…', 0.6);
  await frame();
  const ali = buildAliQapu(M, W);
  const qey = buildQeysarieh(M, W);
  progress('Planting the plane trees…', 0.75);
  await frame();
  buildSquare(M, W, { gaps: [shah.gap, lotf.gap, ali.gap, qey.gap] });
  buildPeople(W, M);
  scene.updateMatrixWorld(true);
  // replace the many lamp lights with a constant three-light rig
  rig.harvest(scene);
  W.nightLights = W.nightLights.filter((l) => !l.isLight);
  // give coincident surfaces distinct depth priorities (no flickering joints)
  const zf = resolveCoplanar(scene, W);
  console.info('coplanar surfaces:', zf);
  for (const c of W.colliders) if (!c.parent) c.updateMatrixWorld(true);
  // (?nomerge keeps every mesh separate, for debugging geometry)
  const ms = new URLSearchParams(location.search).has('nomerge') ? { before: 0, after: 0 } : mergeStatic(scene);
  console.info(`static merge: ${ms.before} meshes -> ${ms.after} draws`);
  progress('Tuning the santur…', 0.92);
  await frame();
  applyTime();
  updateEnv();
  // start at the north-west, looking toward the Shah Mosque
  const hashPlace = PLACES[location.hash.slice(1)];
  explorer.goTo(hashPlace || PLACES.start, 0.01);
  explorer.update(0.016);
  drawMinimapBase();
  progress('Ready', 1);
}

// ---------------------------------------------------------------- zones
const zoneOf = (p) => {
  for (const z of W.zones) {
    if (z.test(p)) return z;
  }
  return null;
};
let currentZone = null;
const INDOOR = new Set(['shahDome', 'shahVest', 'lotfChamber', 'lotfCorridor', 'bazaar', 'aliMusic', 'aliStair', 'aliGate']);
let currentPlace = null;
function updateZones() {
  const p = explorer.mode === 'orbit' ? camera.position : explorer.pos;
  const z = zoneOf(p);
  const id = z ? z.id : 'square';
  const weights = { square: 0, shahCourt: 0, shahDome: 0, lotf: 0, aliqapu: 0, bazaar: 0, musicRoom: 0 };
  if (explorer.mode === 'orbit' && camera.position.y > 60) weights.square = 0.6;
  else weights[z?.audio ?? 'square'] = 1;
  if (audio) {
    Object.assign(audio.w, weights);
    audio.env.fountain = W.fountainLevel ? W.fountainLevel(p) : 0;
    audio.env.courtFountain = W.courtFountainLevel ? W.courtFountainLevel(p) : 0;
    audio.env.height = p.y;
    audio.env.surface = W.surfaceAt ? W.surfaceAt(p) : 'stone';
  }
  const place = z?.place ?? W.squarePlace?.(p) ?? 'maydan';
  if (place !== currentPlace) {
    currentPlace = place;
    showPlace(place);
  }
  if (id !== currentZone) currentZone = id;
}

// ---------------------------------------------------------------- UI
import { PLACE_INFO } from './places.js';
function showPlace(key) {
  const info = PLACE_INFO[key];
  if (!info) return;
  const el = $('#place');
  el.classList.remove('show');
  void el.offsetWidth;
  $('#place-fa').textContent = info.fa;
  $('#place-en').textContent = info.en;
  $('#place-note').textContent = info.note;
  el.classList.add('show');
}

function setMode(m) {
  explorer.setMode(m);
}
explorer.onModeChange = (m) => {
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $('#hint').textContent = m === 'orbit' ? 'Drag to orbit · right-drag to pan · scroll to zoom' : m === 'fly' ? 'Click to look · WASD fly · E/Q up/down · Shift fast' : 'Click to look · WASD walk · Shift run · C clap';
};
explorer.onLockChange = (l) => document.body.classList.toggle('locked', l);
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

const todInput = $('#tod');
todInput.addEventListener('input', () => {
  tod = parseFloat(todInput.value);
  applyTime();
});
$('#music-vol').addEventListener('input', (e) => audio?.setVolumes(parseFloat(e.target.value), parseFloat($('#amb-vol').value)));
$('#amb-vol').addEventListener('input', (e) => audio?.setVolumes(parseFloat($('#music-vol').value), parseFloat(e.target.value)));
$('#naqqareh').addEventListener('click', () => {
  audio?.naqqareh();
});

// tour list
const tourEl = $('#tour');
TOUR.forEach((key, i) => {
  const p = PLACES[key];
  const b = document.createElement('button');
  b.className = 'tour-item';
  b.innerHTML = `<span class="k">${i + 1}</span><span class="t">${p.label}</span><span class="fa">${p.fa}</span>`;
  b.addEventListener('click', () => {
    explorer.goTo(p, 2.2);
    tourEl.closest('details')?.removeAttribute('open');
  });
  tourEl.appendChild(b);
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyC') audio?.clap();
  if (e.code === 'KeyV') setMode(explorer.mode === 'walk' ? 'fly' : explorer.mode === 'fly' ? 'orbit' : 'walk');
  if (e.code === 'KeyM') {
    muted = !muted;
    audio?.mute(muted);
    $('#mute').setAttribute('aria-pressed', muted);
  }
  if (e.code === 'KeyT') {
    tod = tod >= 23 ? 5 : tod + 0.5;
    todInput.value = tod;
    applyTime();
  }
  if (e.code === 'KeyN') audio?.naqqareh();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= TOUR.length) explorer.goTo(PLACES[TOUR[n - 1]], 2.2);
  if (e.key === '0') explorer.goTo(PLACES[TOUR[9]] ?? PLACES.aerial, 2.2);
});
let muted = false;
$('#mute').addEventListener('click', () => {
  muted = !muted;
  audio?.mute(muted);
  $('#mute').setAttribute('aria-pressed', muted);
});

$('#enter').addEventListener('click', async () => {
  $('#intro').classList.add('gone');
  // lock first, while the click still counts as a user gesture
  if (!('ontouchstart' in window) && explorer.mode !== 'orbit') explorer.lock();
  audio = new AudioEngine();
  try {
    await audio.start();
  } catch (e) {
    console.warn('Audio unavailable:', e);
    return;
  }
  audio.setVolumes(parseFloat($('#music-vol').value), parseFloat($('#amb-vol').value));
  audio.env.night = night;
  audio.env.dusk = dusk;
  if (muted) audio.mute(true);
});

// ---------------------------------------------------------------- minimap
const mm = $('#minimap');
const mctx = mm.getContext('2d');
let mmBase = null;
const MM = { x0: -170, x1: 170, z0: -330, z1: 420 };
function mmXY(x, z) {
  return [((x - MM.x0) / (MM.x1 - MM.x0)) * mm.width, ((z - MM.z0) / (MM.z1 - MM.z0)) * mm.height];
}
function drawMinimapBase() {
  mmBase = document.createElement('canvas');
  mmBase.width = mm.width;
  mmBase.height = mm.height;
  const c = mmBase.getContext('2d');
  c.fillStyle = '#2a2016';
  c.fillRect(0, 0, mm.width, mm.height);
  for (const f of W.footprints) {
    c.beginPath();
    f.pts.forEach((p, i) => {
      const [x, y] = mmXY(p[0], p[1]);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.closePath();
    c.fillStyle = f.color;
    c.fill();
  }
}
mm.addEventListener('click', (e) => {
  const r = mm.getBoundingClientRect();
  const x = MM.x0 + ((e.clientX - r.left) / r.width) * (MM.x1 - MM.x0);
  const z = MM.z0 + ((e.clientY - r.top) / r.height) * (MM.z1 - MM.z0);
  const y = explorer.floorAt(new THREE.Vector3(x, 200, z), 1) ?? 0;
  explorer.goTo({ pos: [x, Math.min(y, 1), z], yaw: explorer.yaw, pitch: 0, mode: explorer.mode === 'orbit' ? 'walk' : explorer.mode }, 1.8);
});
function drawMinimap() {
  if (!mmBase) return;
  mctx.drawImage(mmBase, 0, 0);
  const p = explorer.mode === 'orbit' ? camera.position : explorer.pos;
  const [x, y] = mmXY(p.x, p.z);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const a = Math.atan2(dir.z, dir.x);
  mctx.fillStyle = 'rgba(240,200,110,0.35)';
  mctx.beginPath();
  mctx.moveTo(x, y);
  mctx.arc(x, y, 26, a - 0.5, a + 0.5);
  mctx.closePath();
  mctx.fill();
  mctx.fillStyle = '#f3c75f';
  mctx.strokeStyle = '#1b1208';
  mctx.lineWidth = 2;
  mctx.beginPath();
  mctx.arc(x, y, 4.5, 0, Math.PI * 2);
  mctx.fill();
  mctx.stroke();
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let fpsAcc = 0,
  fpsN = 0;
function loop() {
  step();
  requestAnimationFrame(loop);
}
function step() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  explorer.update(dt);
  // keep the night sky centred on the viewer (inside the far plane)
  nightDome.position.copy(camera.position);
  stars.position.copy(camera.position);
  if (!explorer.anim) updateShadow();
  else if (explorer.anim.t > 0.95) lastShadow.size = 0; // refresh right after a teleport
  updateEnv();
  if (explorer.anim) rig._t = 0; // re-pick lamps right after a teleport
  rig.update(dt, camera.position, false, INDOOR.has(currentZone));
  for (const u of W.updaters) u(dt, t, camera);
  slowAcc += dt;
  if (slowAcc > 0.15) {
    slowAcc = 0;
    updateZones();
    drawMinimap();
  }
  renderer.render(scene, camera);
  // adaptive resolution: aim for ~50-60 fps
  fpsAcc += dt;
  fpsN++;
  if (fpsAcc > 1.5) {
    const fps = fpsN / fpsAcc;
    let pr = pixelRatio;
    if (fps < 45) pr = Math.max(0.55, pixelRatio * (fps < 30 ? 0.8 : 0.9));
    else if (fps > 58) pr = Math.min(MAX_PR, pixelRatio + 0.1);
    if (Math.abs(pr - pixelRatio) > 0.01) {
      pixelRatio = pr;
      renderer.setPixelRatio(pr);
    }
    fpsAcc = 0;
    fpsN = 0;
  }
}
let slowAcc = 1;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.__app = { step: (n = 1) => { for (let i = 0; i < n; i++) step(); }, W, explorer, camera, scene, renderer, view: (c, t) => { explorer.setMode('orbit'); explorer.anim = null; camera.position.set(...c); explorer.orbit.target.set(...t); explorer.orbit.update(); }, go: (k) => { explorer.goTo(PLACES[k], 1e-6); explorer.update(0.016); }, get audio() { return audio; }, setTime: (h) => { tod = h; todInput.value = h; applyTime(); } };

window.__ready = build()
  .then(() => {
    $('#loading').classList.add('done');
    $('#enter').disabled = false;
    loop();
  })
  .catch((e) => {
    console.error(e);
    $('#load-msg').textContent = 'Could not build the scene: ' + e.message;
  });

export { SQ };
