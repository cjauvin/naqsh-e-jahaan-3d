// Low-poly visitors: strollers on the promenades, families picnicking on carpets on the
// lawns (a classic evening scene in the Maydan), and a few people inside the monuments.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

function personGeo(kind) {
  const parts = [];
  if (kind === 'chador') {
    const body = new THREE.CylinderGeometry(0.13, 0.36, 1.5, 10);
    body.translate(0, 0.75, 0);
    const head = new THREE.SphereGeometry(0.14, 10, 8);
    head.translate(0, 1.55, 0);
    parts.push(body, head);
  } else {
    for (const x of [-0.09, 0.09]) {
      const leg = new THREE.CylinderGeometry(0.07, 0.06, 0.85, 6);
      leg.translate(x, 0.425, 0);
      parts.push(leg);
    }
    const torso = new THREE.CylinderGeometry(0.2, 0.17, 0.65, 8);
    torso.translate(0, 1.18, 0);
    const head = new THREE.SphereGeometry(0.12, 10, 8);
    head.translate(0, 1.63, 0);
    parts.push(torso, head);
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  return g;
}

function carpetCanvas(seed) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 192;
  const x = c.getContext('2d');
  const r = T.rng(seed);
  const reds = ['#8f2a22', '#7a1f2b', '#1e3f70', '#9a5a22'];
  x.fillStyle = reds[Math.floor(r() * reds.length)];
  x.fillRect(0, 0, 128, 192);
  x.strokeStyle = '#e0c070';
  x.lineWidth = 8;
  x.strokeRect(10, 10, 108, 172);
  x.strokeStyle = '#1b2440';
  x.lineWidth = 4;
  x.strokeRect(20, 20, 88, 152);
  x.fillStyle = '#e8d6a8';
  x.beginPath();
  x.moveTo(64, 50);
  x.lineTo(96, 96);
  x.lineTo(64, 142);
  x.lineTo(32, 96);
  x.closePath();
  x.fill();
  x.fillStyle = '#1e3f70';
  x.beginPath();
  x.arc(64, 96, 14, 0, Math.PI * 2);
  x.fill();
  return c;
}

const CLOTHES = [0x2b2b33, 0x3d4a66, 0x6b4a33, 0xe8e2d6, 0x556b4a, 0x7a2f2f, 0x2f5f6b, 0x8a8a8a, 0xc9b28a];

export function buildPeople(W, M) {
  const r = T.rng(2024);
  const scene = W.scene;
  const men = personGeo('man');
  const chador = personGeo('chador');
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const statics = { man: [], chador: [] };
  const add = (x, y, z, rot, sit = false, kind = null) => {
    const k = kind || (r() < 0.4 ? 'chador' : 'man');
    const col = k === 'chador' ? new THREE.Color(0x141418) : new THREE.Color(CLOTHES[Math.floor(r() * CLOTHES.length)]);
    const s = 0.9 + r() * 0.2;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y - (sit ? 0.55 * s : 0), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(s, sit ? s * 0.62 : s, s));
    statics[k].push({ m, col });
  };

  // picnics on the lawns
  const carpetMats = [0, 1, 2, 3].map((i) => new THREE.MeshLambertMaterial({ map: T.toTex(carpetCanvas(i + 3), { wrap: false }) }));
  const carpetG = new THREE.PlaneGeometry(2.2, 3.2);
  carpetG.rotateX(-Math.PI / 2);
  const carpets = carpetMats.map((m) => ({ m, list: [] }));
  const lawnZ = [
    [-244, -202],
    [-185, -144],
    [-124, -59],
    [-43, 0],
    [125, 172],
    [175, 214],
  ];
  for (let i = 0; i < 34; i++) {
    const [z0, z1] = lawnZ[Math.floor(r() * lawnZ.length)];
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (6 + r() * 28);
    const z = z0 + 4 + r() * (z1 - z0 - 8);
    const rot = r() * Math.PI;
    carpets[i % 4].list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.14, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(1, 1, 1)));
    const n = 2 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.4;
      add(x + Math.cos(a) * 0.9, 0.14, z + Math.sin(a) * 1.2, -a - Math.PI / 2, true);
    }
  }
  for (const c of carpets) {
    const im = new THREE.InstancedMesh(carpetG, c.m, c.list.length);
    c.list.forEach((m, i) => im.setMatrixAt(i, m));
    im.layers.set(1);
    scene.add(im);
  }
  // people standing about the square, near the pool, in front of the monuments
  for (let i = 0; i < 70; i++) {
    const zone = r();
    let x, z;
    if (zone < 0.35) {
      x = (r() < 0.5 ? -1 : 1) * (16 + r() * 12);
      z = 10 + r() * 105;
    } else if (zone < 0.6) {
      x = (r() < 0.5 ? -1 : 1) * (70 + r() * 6);
      z = -240 + r() * 480;
    } else if (zone < 0.8) {
      x = (r() - 0.5) * 30;
      z = 225 + r() * 28;
    } else {
      x = (r() - 0.5) * 24;
      z = -250 + r() * 20;
    }
    add(x, 0, z, r() * 6.28);
  }
  // inside the monuments (world positions)
  const S = Math.SQRT1_2;
  const court = (u, v) => [-23 + (-u + v) * S, 331 + (u + v) * S];
  for (let i = 0; i < 14; i++) {
    const [x, z] = court((r() - 0.5) * 48, (r() - 0.5) * 58);
    if (Math.abs(x + 23) < 10 && Math.abs(z - 331) < 12) continue;
    add(x, 0, z, r() * 6.28);
  }
  for (const [x, z] of [
    [-60, 364],
    [-55.5, 369],
    [116, 70],
    [120, 66.5],
  ])
    add(x, 0, z, r() * 6.28);
  for (const [x, z] of [
    [-73, 58],
    [-72.8, 69],
    [-75, 61],
  ])
    add(x, 13.5, z, -Math.PI / 2);

  for (const [k, geo] of [
    ['man', men],
    ['chador', chador],
  ]) {
    const list = statics[k];
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => {
      im.setMatrixAt(i, p.m);
      im.setColorAt(i, p.col);
    });
    im.layers.set(1);
    scene.add(im);
  }

  // strollers walking up and down the promenades and around the pool
  const walkers = [];
  for (let i = 0; i < 46; i++) {
    const lane = r();
    let path;
    if (lane < 0.55) {
      const x = (r() < 0.5 ? -1 : 1) * (72 + r() * 4);
      path = { a: [x, -245 + r() * 40], b: [x, 200 + r() * 40] };
    } else if (lane < 0.8) {
      const x = (r() < 0.5 ? -1 : 1) * (19 + r() * 6);
      path = { a: [x, 4], b: [x, 122] };
    } else {
      const z = -195 + (r() - 0.5) * 8;
      path = { a: [-60, z], b: [60, z] };
    }
    walkers.push({ path, u: r(), dir: r() < 0.5 ? 1 : -1, speed: 0.9 + r() * 0.6, kind: r() < 0.4 ? 'chador' : 'man', col: new THREE.Color(CLOTHES[Math.floor(r() * CLOTHES.length)]) });
  }
  const wk = { man: walkers.filter((w) => w.kind === 'man'), chador: walkers.filter((w) => w.kind === 'chador') };
  const wMeshes = {};
  for (const [k, geo] of [
    ['man', men],
    ['chador', chador],
  ]) {
    const im = new THREE.InstancedMesh(geo, mat, wk[k].length);
    wk[k].forEach((w, i) => im.setColorAt(i, k === 'chador' ? new THREE.Color(0x141418) : w.col));
    im.layers.set(1);
    im.frustumCulled = false;
    im.userData.dynamic = true;
    scene.add(im);
    wMeshes[k] = im;
  }
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    pos = new THREE.Vector3(),
    sc = new THREE.Vector3(1, 1, 1);
  W.updaters.push((dt, t) => {
    for (const k of ['man', 'chador']) {
      const im = wMeshes[k];
      wk[k].forEach((w, i) => {
        const [ax, az] = w.path.a,
          [bx, bz] = w.path.b;
        const L = Math.hypot(bx - ax, bz - az);
        w.u += (w.dir * w.speed * dt) / L;
        if (w.u > 1) {
          w.u = 1;
          w.dir = -1;
        } else if (w.u < 0) {
          w.u = 0;
          w.dir = 1;
        }
        pos.set(ax + (bx - ax) * w.u, Math.abs(Math.sin(t * 6 * w.speed + i)) * 0.04, az + (bz - az) * w.u);
        const ang = Math.atan2((bx - ax) * w.dir, (bz - az) * w.dir);
        q.setFromAxisAngle(up, ang);
        m4.compose(pos, q, sc);
        im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true;
    }
  });
}
