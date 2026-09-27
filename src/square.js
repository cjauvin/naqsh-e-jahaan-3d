// Naqsh-e Jahan square: 512 x 160 m interior (model axis N–S; north = -z, east = +x).
// Plan from satellite measurements: promenades, jub channels, tree rows at 12/18.5/24/37 m
// from the long façades, a 10 m carriage loop, lawn pairs with star beds, an 80 x 30 m
// pool on the Ali Qapu–Lotfollah cross-axis, stone polo goalposts at both ends.
import * as THREE from 'three';
import * as G from './geom.js';
import * as T from './textures.js';
import { buildArcade, shopCanvas, loggiaCanvas } from './arcade.js';
import { makePool } from './water.js';

export const SQ = { hw: 80, hl: 256, poolZ: 63.5, poolW: 30, poolL: 81 };

const LAWNS = [
  // [zFrom, zTo, kind] (converted from "metres from the north façade")
  [12, 54, 'plain'],
  [71, 112, 'plain'],
  [132, 197, 'stars'],
  [213, 256, 'plain'],
  [381, 428, 'stars'],
  [431, 470, 'plain'],
].map(([a, b, k]) => [a - 256, b - 256, k]);

export function buildSquare(M, W, { gaps }) {
  const scene = W.scene;
  const hw = SQ.hw,
    hl = SQ.hl;

  // ---------------------------------------------------------------- ground
  const ground = G.plane(3000, 3000, new THREE.MeshLambertMaterial({ map: T.toTex(T.gravelCanvas({ color: '#a88d68', seed: 3 })), polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 }), 6);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  W.floors.push(ground);

  const layer = (w, d, x, z, mat, y, unit = 4) => {
    const m = G.plane(w, d, mat, unit);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const paveMat = M.paving;
  const pave2 = M.pavingLight;
  const roadMat = new THREE.MeshStandardMaterial({ map: T.toTex(T.pavingCanvas({ color: '#b8a584', seed: 77, n: 10 })), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
  // whole square paved, then layers on top
  const sqPave = paveMat.clone();
  sqPave.polygonOffset = true;
  sqPave.polygonOffsetFactor = 2;
  sqPave.polygonOffsetUnits = 4;
  layer(2 * hw, 2 * hl, 0, 0, sqPave, 0.02, 3);
  // carriage loop: long sides and two crossings
  for (const sg of [-1, 1]) layer(10, 2 * hl - 60, sg * 50, 16, roadMat, 0.05, 5);
  layer(110, 14, 0, -195, roadMat, 0.075, 5);
  layer(110, 12, 0, 219, roadMat, 0.075, 5);
  // pool plaza
  layer(59, 126, 0, 62.5, pave2, 0.09, 3);

  // lawns (raised slightly, with stone kerbs)
  const lawnGeo = [];
  const kerbMat = M.poolStone;
  const addLawn = (x0, x1, z0, z1) => {
    const w = x1 - x0,
      d = z1 - z0;
    const m = G.plane(w, d, M.grass, 5);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, 0.12, (z0 + z1) / 2);
    m.receiveShadow = true;
    scene.add(m);
    W.floors.push(m);
    lawnGeo.push([x0, x1, z0, z1]);
    const k = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.1, d + 0.5), kerbMat);
    k.position.set((x0 + x1) / 2, 0.05, (z0 + z1) / 2);
    k.receiveShadow = true;
    scene.add(k);
  };
  for (const [z0, z1] of LAWNS) {
    addLawn(-38, -2.5, z0, z1);
    addLawn(2.5, 38, z0, z1);
  }
  // lawn strips flanking the pool plaza
  addLawn(-38, -29.5, 0, 125);
  addLawn(29.5, 38, 0, 125);
  // star flower beds (8-point) in the 'stars' lawns
  {
    const starShape = new THREE.Shape();
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8;
      const r = k % 2 ? 2.6 : 4.2;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      k ? starShape.lineTo(x, y) : starShape.moveTo(x, y);
    }
    const sg = new THREE.ExtrudeGeometry(starShape, { depth: 0.35, bevelEnabled: false });
    sg.rotateX(-Math.PI / 2);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const cols = [0xd8413a, 0xf0c040, 0xe07aa8, 0xffffff, 0xd95f20];
    const spots = [];
    for (const [z0, z1, kind] of LAWNS) {
      if (kind !== 'stars') continue;
      for (const x of [-20, 20]) for (let z = z0 + 10; z < z1 - 6; z += 16) spots.push([x, z]);
    }
    const im = new THREE.InstancedMesh(sg, flowerMat, spots.length);
    spots.forEach(([x, z], i) => {
      im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0.12, z));
      im.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    });
    im.layers.set(1);
    scene.add(im);
  }

  // ---------------------------------------------------------------- the great pool
  {
    const { poolZ, poolW, poolL } = SQ;
    const rimW = 2.2;
    const rim = new THREE.Group();
    for (const [w, d, x, z] of [
      [poolW + 2 * rimW, rimW, 0, poolZ - poolL / 2 - rimW / 2],
      [poolW + 2 * rimW, rimW, 0, poolZ + poolL / 2 + rimW / 2],
      [rimW, poolL, -poolW / 2 - rimW / 2, poolZ],
      [rimW, poolL, poolW / 2 + rimW / 2, poolZ],
    ]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), M.marble);
      b.position.set(x, 0.3, z);
      b.receiveShadow = true;
      rim.add(b);
      W.floors.push(b);
    }
    scene.add(rim);
    const bottom = layer(poolW, poolL, 0, poolZ, M.poolBottom, 0.12, 4);
    void bottom;
    makePool(W, M, { w: poolW, h: poolL, z: poolZ, y: 0.45, reflectDist: 170, texSize: 512, reflectWhen: (p) => p.y > 30 || (Math.abs(p.x) < hw + 2 && Math.abs(p.z) < hl + 2) });
    // invisible collider around the water
    const c = new THREE.Mesh(new THREE.BoxGeometry(poolW, 2, poolL), G.colliderMat);
    c.position.set(0, 1, poolZ);
    c.updateMatrixWorld(true);
    W.colliders.push(c);
    buildFountains(W, poolZ, poolL);
    W.fountainLevel = (p) => {
      const dx = Math.max(0, Math.abs(p.x) - poolW / 2),
        dz = Math.max(0, Math.abs(p.z - poolZ) - poolL / 2);
      const d = Math.hypot(dx, dz);
      return Math.max(0, 1 - d / 70) * (p.y < 30 ? 1 : 0.5);
    };
  }

  // ---------------------------------------------------------------- jub (water channels)
  {
    const chan = new THREE.MeshStandardMaterial({ color: 0x4b7f86, roughness: 0.1, metalness: 0.3 });
    for (const sg of [-1, 1]) {
      const x = sg * (hw - 10.5);
      const w = layer(0.8, 2 * hl - 24, x, 0, chan, 0.04, 2);
      void w;
      for (const o of [-0.55, 0.55]) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 2 * hl - 24), M.poolStone);
        e.position.set(x + o, 0.06, 0);
        scene.add(e);
      }
    }
  }

  // ---------------------------------------------------------------- trees
  const trees = W.treeSpots ? [...W.treeSpots] : [];
  const rowX = [12, 18.5, 24, 37];
  for (const sg of [-1, 1])
    for (const [ri, rx] of rowX.entries()) {
      const x = sg * (hw - rx);
      const step = ri === 3 ? 9 : 7.5;
      for (let z = -hl + 10 + (ri % 2) * 3; z < hl - 12; z += step) {
        // keep clear of Ali Qapu's projecting block and the Lotfollah notch approach
        if (sg < 0 && rx < 20 && z > 40 && z < 86) continue;
        if (sg > 0 && rx < 30 && z > 48 && z < 76) continue;
        trees.push({ x: x + (Math.random() - 0.5) * 0.8, z, s: 0.8 + Math.random() * 0.45 });
      }
    }
  // short-end rows
  for (const zEnd of [-hl + 8, hl - 8]) for (let x = -hw + 16; x < hw - 12; x += 8) if (Math.abs(x) > 22) trees.push({ x, z: zEnd, s: 0.8 + Math.random() * 0.3 });
  buildTrees(scene, M, trees);

  // ---------------------------------------------------------------- polo goalposts
  for (const z of [-hl + 16, hl - 22]) {
    for (const sx of [-4, 4]) {
      const post = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.8, 12), M.marble);
      shaft.position.y = 1.6;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), M.marble);
      base.position.y = 0.15;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), M.marble);
      cap.position.y = 3.15;
      post.add(shaft, base, cap);
      post.position.set(sx, 0, z);
      post.traverse((o) => (o.castShadow = true));
      scene.add(post);
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3, 0.9), G.colliderMat);
      c.position.set(sx, 1.5, z);
      c.updateMatrixWorld(true);
      W.colliders.push(c);
    }
  }

  // ---------------------------------------------------------------- lamp posts
  {
    const spots = [];
    for (const sg of [-1, 1]) for (let z = -hl + 14; z < hl - 10; z += 18) spots.push([sg * (hw - 9), z]);
    for (let z = 4; z < 124; z += 14) for (const sx of [-26, 26]) spots.push([sx, z]);
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 4, 6), M.wood, spots.length);
    const head = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.28, 0), M.lamp, spots.length);
    spots.forEach(([x, z], i) => {
      pole.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 2, z));
      head.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 4.1, z));
    });
    pole.layers.set(1);
    head.layers.set(1);
    scene.add(pole, head);
    M.lamp.userData.base = 3;
    W.nightLights.push(M.lamp);
    // a few real lights near the pool for the night
    for (const [x, z] of [
      [0, 10],
      [0, 118],
      [-60, 63],
      [60, 63],
    ]) {
      const l = new THREE.PointLight(0xffc27a, 0, 80, 1.3);
      l.position.set(x, 9, z);
      l.userData.base = 110;
      scene.add(l);
      W.nightLights.push(l);
    }
  }

  // ---------------------------------------------------------------- perimeter arcades
  const shop = shopCanvas(7);
  const shopMat = new THREE.MeshStandardMaterial({ map: T.toTex(shop.map, { wrap: false }), emissiveMap: T.toTex(shop.glow, { wrap: false }), emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.8 });
  shopMat.userData.base = 1.4;
  const lg = loggiaCanvas();
  const logMat = new THREE.MeshStandardMaterial({ map: T.toTex(lg.map, { wrap: false }), emissiveMap: T.toTex(lg.glow, { wrap: false }), emissive: 0xffb35c, emissiveIntensity: 0, roughness: 0.9 });
  logMat.userData.base = 1.8;
  W.nightLights.push(shopMat, logMat);
  const spec = {
    H: 12,
    story: 6,
    lower: { w: 3.8, spring: 3.4, rise: 1.8, depth: 1.4 },
    upper: { w: 3.5, sill: 6.6, spring: 9.3, rise: 1.7, depth: 3.2 },
  };
  const faceCanvas = T.bayFaceCanvas({
    W: 6,
    H: 12,
    px: 44,
    brick: M.canvas.brick,
    spandrel: M.canvas.arabLapis,
    arches: [{ pts: G.archOpening(3.8, 3.4, 1.8) }, { pts: G.archOpening(3.5, 9.3, 1.7, 6.6) }],
  });
  const faceMat = new THREE.MeshStandardMaterial({ map: T.toTex(faceCanvas, { wrap: false }), roughness: 0.85 });
  const mats = [faceMat, M.brick, M.brickPale, shopMat, logMat];

  const shah = gaps.find((g) => g.side === 'south').recess;
  const lotf = gaps.find((g) => g.side === 'east');
  const qW = 11; // half-width of the Qeysarieh gap
  const aqHalf = 14,
    aqZ = 63;
  const segs = [
    // north side (westward)
    { a: [hw, -hl], b: [qW, -hl] },
    { a: [-qW, -hl], b: [-hw, -hl] },
    // west side (southward), Sepah street gap and Ali Qapu
    { a: [-hw, -hl], b: [-hw, -196] },
    { a: [-hw, -188], b: [-hw, aqZ - aqHalf] },
    { a: [-hw, aqZ + aqHalf], b: [-hw, hl] },
    // south side (eastward) with the Shah Mosque's half-octagonal recess
    { a: [-hw, hl], b: [-shah.w / 2, hl] },
    { a: [-shah.w / 2, hl], b: [-shah.w / 2, hl + shah.straight], inner: true },
    { a: [-shah.w / 2, hl + shah.straight], b: [-shah.back / 2, hl + shah.depth], inner: true },
    { a: [shah.back / 2, hl + shah.depth], b: [shah.w / 2, hl + shah.straight], inner: true },
    { a: [shah.w / 2, hl + shah.straight], b: [shah.w / 2, hl], inner: true },
    { a: [shah.w / 2, hl], b: [hw, hl] },
    // east side (northward) with the Lotfollah notch and Hafez street
    { a: [hw, hl], b: [hw, lotf.to] },
    { a: [hw, lotf.to], b: [hw + lotf.notch, lotf.to], inner: true },
    { a: [hw + lotf.notch, lotf.from], b: [hw, lotf.from], inner: true },
    { a: [hw, lotf.from], b: [hw, -129] },
    { a: [hw, -146], b: [hw, -hl] },
  ];
  const arc = buildArcade({ segments: segs, spec, materials: mats, targetBay: 6 });
  arc.meshes.forEach((m) => scene.add(m));
  arc.colliders.forEach((c) => W.colliders.push(c));

  // roofs, rear walls and roof domelets behind the arcades
  const depth = 14;
  const roofMat = M.roof;
  const domeG = new THREE.SphereGeometry(1.9, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeSpots = [];
  // Segments inside the recess / notch only roof their own bays and get no rear wall
  // (a rear wall 14 m back would run straight through the neighbouring arcade).
  // Long segments extend their roof strip and rear wall past concave corners so that
  // neighbouring strips meet without gaps.
  const same = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05;
  const dirOf = (s) => {
    const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    return [(s.b[0] - s.a[0]) / L, (s.b[1] - s.a[1]) / L];
  };
  const concave = (u, v) => u[0] * v[1] - u[1] * v[0] < -0.05;
  segs.forEach((s, si) => {
    const [ax0, az0] = s.a,
      [bx0, bz0] = s.b;
    const L0 = Math.hypot(bx0 - ax0, bz0 - az0);
    const dx = (bx0 - ax0) / L0,
      dz = (bz0 - az0) / L0;
    // back direction = opposite of the facing (dz,-dx)
    const nx = -dz,
      nz = dx;
    const segDepth = s.inner ? Math.max(spec.lower.depth, spec.upper.depth) + 0.3 : depth;
    const prev = segs[(si + segs.length - 1) % segs.length],
      next = segs[(si + 1) % segs.length];
    const e0 = !s.inner && same(prev.b, s.a) && concave(dirOf(prev), [dx, dz]) ? depth : 0;
    const e1 = !s.inner && same(s.b, next.a) && concave([dx, dz], dirOf(next)) ? depth : 0;
    const ax = ax0 - dx * e0,
      az = az0 - dz * e0,
      bx = bx0 + dx * e1,
      bz = bz0 + dz * e1;
    const pts = [
      [ax, az],
      [bx, bz],
      [bx + nx * segDepth, bz + nz * segDepth],
      [ax + nx * segDepth, az + nz * segDepth],
    ];
    const r = G.slab(pts, 12.3, 0.3, roofMat, 3);
    r.receiveShadow = true;
    scene.add(r);
    if (!s.inner) {
      // at convex corners (recess mouths) stop the rear wall short of the recess arcades
      const convex = (u, v) => u[0] * v[1] - u[1] * v[0] > 0.05;
      const c0 = same(prev.b, s.a) && convex(dirOf(prev), [dx, dz]) ? 6 : 0;
      const c1 = same(s.b, next.a) && convex([dx, dz], dirOf(next)) ? 6 : 0;
      const sx = ax + dx * c0,
        sz = az + dz * c0,
        ex = bx - dx * c1,
        ez = bz - dz * c1;
      const back = G.segWall(sx + nx * depth, sz + nz * depth, ex + nx * depth, ez + nz * depth, 0.8, 12.3, M.brickPale);
      scene.add(back);
    }
    // parapet coping
    scene.add(G.segWall(ax0, az0, bx0, bz0, 0.6, 0.7, M.brick, { y0: 12, side: 1 }));
    const n = Math.max(1, Math.round(L0 / 6));
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * L0;
      domeSpots.push([ax0 + dx * t + nx * segDepth * 0.5, az0 + dz * t + nz * segDepth * 0.5]);
    }
  });
  const domes = new THREE.InstancedMesh(domeG, roofMat, domeSpots.length);
  domeSpots.forEach(([x, z], i) => domes.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 12.3, z)));
  domes.castShadow = false;
  scene.add(domes);

  // ---------------------------------------------------------------- city around
  buildCity(scene, M);

  // carriages on the loop road
  buildCarriages(W, M);

  // ---------------------------------------------------------------- helpers for audio/UI
  W.surfaceAt = (p) => {
    for (const [x0, x1, z0, z1] of lawnGeo) if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) return 'grass';
    if (Math.abs(p.x) < hw && Math.abs(p.z) < hl && Math.abs(Math.abs(p.x) - 50) < 5) return 'gravel';
    return 'stone';
  };
  W.squarePlace = (p) => {
    if (p.y > 60) return 'aerial';
    if (Math.abs(p.x) < 30 && p.z > 0 && p.z < 126) return 'pool';
    if ((Math.abs(p.z - (hl - 22)) < 8 || Math.abs(p.z + hl - 16) < 8) && Math.abs(p.x) < 12) return 'polo';
    if (p.z < -hl + 40 && Math.abs(p.x) < 30) return 'qeysariehFront';
    if (p.z > hl - 40 && Math.abs(p.x) < 30) return 'shahPortal';
    if (p.x < -50 && Math.abs(p.z - aqZ) < 30) return 'aliqapuFront';
    if (Math.abs(p.x) > hw + 2 || Math.abs(p.z) > hl + 20) return 'city';
    return 'maydan';
  };
  W.footprints.unshift({ color: '#c9b48c', pts: [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]] });
  W.footprints.push({ color: '#4d7a33', pts: [[-38, -hl + 12], [38, -hl + 12], [38, hl - 42], [-38, hl - 42]] });
  W.footprints.push({ color: '#cdbb94', pts: [[-29.5, 0], [29.5, 0], [29.5, 125], [-29.5, 125]] });
  W.footprints.push({ color: '#3d8fa0', pts: [[-15, SQ.poolZ - 40.5], [15, SQ.poolZ - 40.5], [15, SQ.poolZ + 40.5], [-15, SQ.poolZ + 40.5]] });
  for (const s of segs) {
    const [ax, az] = s.a,
      [bx, bz] = s.b;
    const L = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / L,
      nz = (bx - ax) / L;
    W.footprints.push({ color: '#8a7658', pts: [[ax, az], [bx, bz], [bx + nx * depth, bz + nz * depth], [ax + nx * depth, az + nz * depth]] });
  }
}

// ------------------------------------------------------------------ trees (instanced)
function buildTrees(scene, M, spots) {
  const n = spots.length;
  const trunkG = new THREE.CylinderGeometry(0.18, 0.3, 4.2, 5, 1, true);
  trunkG.translate(0, 2.1, 0);
  const canG = new THREE.SphereGeometry(1, 9, 6);
  const pos = canG.attributes.position;
  const r = T.rng(5);
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const k = 1 + (Math.sin(v.x * 5.1) * Math.cos(v.y * 4.3) * Math.sin(v.z * 3.7)) * 0.25 + (r() - 0.5) * 0.12;
    v.multiplyScalar(k);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  canG.computeVertexNormals();
  const trunks = new THREE.InstancedMesh(trunkG, M.trunk, n);
  const can1 = new THREE.InstancedMesh(canG, M.leaves, n);
  const can2 = new THREE.InstancedMesh(canG, M.leaves2, n);
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler();
  spots.forEach((t, i) => {
    const s = t.s || 1;
    m.compose(new THREE.Vector3(t.x, 0, t.z), q.identity(), new THREE.Vector3(s, s * (1 + r() * 0.3), s));
    trunks.setMatrixAt(i, m);
    e.set(0, r() * 6, 0);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(t.x, 5.6 * s, t.z), q, new THREE.Vector3(3.2 * s, 3.4 * s, 3.2 * s));
    can1.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(t.x + (r() - 0.5) * 1.5 * s, 7.4 * s, t.z + (r() - 0.5) * 1.5 * s), q, new THREE.Vector3(2.2 * s, 2.4 * s, 2.2 * s));
    can2.setMatrixAt(i, m);
    const c = new THREE.Color().setHSL(0.18 + r() * 0.1, 0.35, 0.62 + r() * 0.3);
    can1.setColorAt(i, c);
    can2.setColorAt(i, c.clone().offsetHSL(0, 0, 0.05));
  });
  for (const x of [trunks, can1, can2]) {
    x.castShadow = true;
    x.receiveShadow = false;
    x.layers.set(1);
    scene.add(x);
  }
}

// ------------------------------------------------------------------ fountains (particles)
function buildFountains(W, poolZ, poolL) {
  const jets = [];
  for (let k = -5; k <= 5; k++) jets.push({ x: 0, z: poolZ + k * 7, h: k === 0 ? 5.5 : 3.2 });
  const per = 70;
  const n = jets.length * per;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(230,245,255,0.6)');
  gr.addColorStop(1, 'rgba(230,245,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  const mat = new THREE.PointsMaterial({ size: 0.35, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, color: 0xe8f4ff, opacity: 0.85 });
  const pts = new THREE.Points(g, mat);
  pts.layers.set(1);
  pts.frustumCulled = false;
  W.scene.add(pts);
  W.updaters.push((dt, t, cam) => {
    const far = cam.position.distanceTo(new THREE.Vector3(0, 0, poolZ)) > 500;
    pts.visible = !far;
    if (far) return;
    let i = 0;
    for (const j of jets) {
      const v0 = Math.sqrt(2 * 9.8 * j.h);
      const T0 = (2 * v0) / 9.8;
      for (let k = 0; k < per; k++, i++) {
        const s = seed.subarray(i * 4, i * 4 + 4);
        const tt = ((t + s[0] * T0) % T0) * (0.9 + s[1] * 0.2);
        const spread = 0.35 + s[2] * 0.4;
        const ang = s[3] * 6.283;
        pos[i * 3] = j.x + Math.cos(ang) * spread * tt;
        pos[i * 3 + 1] = 0.5 + v0 * tt - 4.9 * tt * tt;
        pos[i * 3 + 2] = j.z + Math.sin(ang) * spread * tt;
        if (pos[i * 3 + 1] < 0.5) pos[i * 3 + 1] = 0.5;
      }
    }
    g.attributes.position.needsUpdate = true;
  });
}

// ------------------------------------------------------------------ surrounding city
export const W_MOUNT = {};
function buildCity(scene, M) {
  const r = T.rng(42);
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const n = 1600;
  const im = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ map: M.brickPale.map }), n);
  const domeG = new THREE.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const dm = new THREE.InstancedMesh(domeG, new THREE.MeshLambertMaterial({ color: M.roof.color }), 400);
  let k = 0,
    kd = 0;
  const m = new THREE.Matrix4();
  const free = (x, z) => {
    if (Math.abs(x) < 96 && Math.abs(z) < 272) return false; // square + arcades
    if (x > -150 && x < 60 && z > 260 && z < 460) return false; // Shah Mosque complex
    if (x > 80 && x < 150 && z > 10 && z < 110) return false; // Lotfollah
    if (x > -125 && x < -80 && z > 30 && z < 100) return false; // Ali Qapu
    if (Math.abs(x) < 16 && z < -250 && z > -400) return false; // bazaar axis
    return true;
  };
  for (let i = 0; i < 12000 && k < n; i++) {
    const x = (r() - 0.5) * 900,
      z = (r() - 0.5) * 1300 + 50;
    if (!free(x, z)) continue;
    const w = 8 + r() * 16,
      d = 8 + r() * 16,
      h = 4 + r() * 6;
    m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (r() - 0.5) * 0.2), new THREE.Vector3(w, h, d));
    im.setMatrixAt(k, m);
    im.setColorAt(k, new THREE.Color().setHSL(0.075 + r() * 0.03, 0.28 + r() * 0.12, 0.36 + r() * 0.1));
    k++;
    if (r() < 0.35 && kd < 400) {
      const s = 2 + r() * 3;
      m.compose(new THREE.Vector3(x, h, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.8, s));
      dm.setMatrixAt(kd++, m);
    }
  }
  im.count = k;
  dm.count = kd;
  im.receiveShadow = true;
  im.castShadow = false;
  im.layers.set(1);
  dm.layers.set(1);
  scene.add(im, dm);
  // distant mountains (Soffeh to the south, Zagros foothills)
  const mg = new THREE.CylinderGeometry(2600, 2600, 1, 128, 6, true);
  const p = mg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      y = p.getY(i);
    const a = Math.atan2(z, x);
    const hgt = 90 + 120 * Math.max(0, Math.sin(a * 3 + 1)) + 60 * Math.sin(a * 11) + 30 * Math.sin(a * 29) + (a > 0.6 && a < 2.4 ? 180 : 0);
    p.setY(i, y > 0 ? Math.max(20, hgt) : -5);
  }
  mg.computeVertexNormals();
  const mt = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0x8d8a99, side: THREE.BackSide, fog: true }));
  W_MOUNT.mat = mt.material;
  scene.add(mt);
}

// ------------------------------------------------------------------ horse carriages
function buildCarriages(W, M) {
  const path = new THREE.CurvePath();
  const pts = [
    [-50, -190],
    [-50, 214],
    [50, 214],
    [50, -190],
  ];
  const r = 8;
  const loop = [];
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = pts[i],
      [x1, z1] = pts[(i + 1) % 4];
    loop.push(new THREE.Vector3(x0 + Math.sign(x1 - x0) * r, 0, z0 + Math.sign(z1 - z0) * r));
    loop.push(new THREE.Vector3(x1 - Math.sign(x1 - x0) * r, 0, z1 - Math.sign(z1 - z0) * r));
  }
  const curve = new THREE.CatmullRomCurve3(loop, true, 'catmullrom', 0.2);
  void path;
  const len = curve.getLength();
  const mkCarriage = (color) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 2.2), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    body.position.set(0, 1.3, -1.2);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x2a1a10 }));
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(0, 1.85, -1.4);
    g.add(body, roof);
    const wheelG = new THREE.TorusGeometry(0.55, 0.06, 6, 16);
    const wm = new THREE.MeshStandardMaterial({ color: 0xc9a44a, metalness: 0.4, roughness: 0.5 });
    const wheels = [];
    for (const [x, z] of [
      [-0.9, -0.4],
      [0.9, -0.4],
      [-0.9, -2.1],
      [0.9, -2.1],
    ]) {
      const w = new THREE.Mesh(wheelG, wm);
      w.rotation.y = Math.PI / 2;
      w.position.set(x, 0.55, z);
      g.add(w);
      wheels.push(w);
    }
    // horse
    const hm = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.8 });
    const horse = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.2, 4, 8), hm);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 1.35;
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 4, 8), hm);
    neck.position.set(0, 1.85, 0.85);
    neck.rotation.x = -0.6;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.55), hm);
    head.position.set(0, 2.2, 1.2);
    horse.add(torso, neck, head);
    const legs = [];
    for (const [x, z] of [
      [-0.2, 0.55],
      [0.2, 0.55],
      [-0.2, -0.55],
      [0.2, -0.55],
    ]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 1.1, 5), hm);
      leg.geometry.translate(0, -0.55, 0);
      leg.position.set(x, 1.15, z);
      horse.add(leg);
      legs.push(leg);
    }
    horse.position.z = 1.4;
    g.add(horse);
    g.traverse((o) => o.layers.set(1));
    return { g, wheels, legs };
  };
  const cars = [mkCarriage(0x7a1f1f), mkCarriage(0x1f3f6a), mkCarriage(0x2a2a2a)];
  cars.forEach((c, i) => {
    c.g.userData.dynamic = true;
    c.u = i / cars.length;
    W.scene.add(c.g);
  });
  const speed = 3.2;
  W.updaters.push((dt, t) => {
    for (const c of cars) {
      c.u = (c.u + (dt * speed) / len) % 1;
      const p = curve.getPointAt(c.u);
      const tan = curve.getTangentAt(c.u);
      p.x += tan.z * 2.5;
      p.z -= tan.x * 2.5;
      c.g.position.copy(p);
      c.g.rotation.y = Math.atan2(tan.x, tan.z);
      c.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 8 + (i % 2 ? 0 : Math.PI) + (i > 1 ? 1.2 : 0)) * 0.45));
      c.wheels.forEach((w) => (w.rotation.x = t * speed * 1.8));
    }
  });
}
