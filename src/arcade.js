// Two-storey arcade bays (hujras) with four-centred arches, instanced along polylines.
import * as THREE from 'three';
import * as G from './geom.js';
import * as T from './textures.js';

// Split a grouped non-indexed geometry into one geometry per group.
function splitGroups(geo) {
  const out = [];
  for (const g of geo.groups) {
    const part = new THREE.BufferGeometry();
    for (const [k, attr] of Object.entries(geo.attributes)) {
      const arr = attr.array.slice(g.start * attr.itemSize, (g.start + g.count) * attr.itemSize);
      part.setAttribute(k, new THREE.BufferAttribute(arr, attr.itemSize));
    }
    out[g.materialIndex] = part;
  }
  return out;
}

// Merge [geometry, materialIndex] pairs into one geometry with groups 0..nMat-1.
export function mergeWithMaterials(pairs, nMat) {
  const buckets = Array.from({ length: nMat }, () => []);
  for (const [g, i] of pairs) {
    if (!g) continue;
    let ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    ng.clearGroups();
    buckets[i].push(ng);
  }
  const merged = [];
  const groups = [];
  let start = 0;
  buckets.forEach((b, i) => {
    if (!b.length) return;
    const m = G.mergeGeometries(b, false);
    merged.push(m);
    const n = m.attributes.position.count;
    groups.push({ start, count: n, materialIndex: i });
    start += n;
  });
  const out = G.mergeGeometries(merged, false);
  out.clearGroups();
  for (const g of groups) out.addGroup(g.start, g.count, g.materialIndex);
  return out;
}

// Bay geometry. Front face at z=0, bay spans x in [-bw/2, bw/2], y 0..H.
// Material slots: 0 face (uv 0..1 over whole bay), 1 hidden/back (brick), 2 reveals, 3 shop front, 4 loggia back
export function bayGeometry({ bw, H, story, lower, upper }) {
  const lo = G.archedWall(bw, story, lower.depth, [{ x: 0, w: lower.w, spring: lower.spring, rise: lower.rise }]);
  const up = G.archedWall(bw, H - story, upper.depth, [{ x: 0, w: upper.w, spring: upper.spring - story, rise: upper.rise, sill: upper.sill - story }]);
  up.translate(0, story, 0);
  // remap front uvs to the whole bay
  const remap = (g, y0, h) => {
    const uv = g.attributes.uv,
      nor = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) if (nor.getZ(i) > 0.9) uv.setY(i, (y0 + uv.getY(i) * h) / H);
  };
  remap(lo, 0, story);
  remap(up, story, H - story);
  const [loF, loB, loS] = splitGroups(lo);
  const [upF, upB, upS] = splitGroups(up);
  const shopH = lower.spring + lower.rise;
  const shop = new THREE.PlaneGeometry(lower.w, shopH);
  shop.translate(0, shopH / 2, -lower.depth + 0.02);
  const logH = upper.spring + upper.rise - upper.sill;
  const log = new THREE.PlaneGeometry(upper.w, logH);
  log.translate(0, upper.sill + logH / 2, -upper.depth + 0.02);
  return mergeWithMaterials(
    [
      [loF, 0],
      [upF, 0],
      [loB, 1],
      [upB, 1],
      [loS, 2],
      [upS, 2],
      [shop, 3],
      [log, 4],
    ],
    5,
  );
}

// Shop-front texture: carved wooden doors and a lit display of handicrafts
export function shopCanvas(seed = 1) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const x = c.getContext('2d');
  const g = document.createElement('canvas');
  g.width = 256;
  g.height = 384;
  const y = g.getContext('2d');
  y.fillStyle = '#000';
  y.fillRect(0, 0, 256, 384);
  const r = T.rng(seed);
  x.fillStyle = '#e8dcc0';
  x.fillRect(0, 0, 256, 384);
  // arched top area (plaster with painted band)
  x.fillStyle = '#2d5d8f';
  x.fillRect(0, 70, 256, 10);
  // display window (left) and door (right)
  const winX = 16,
    winY = 110,
    winW = 130,
    winH = 180;
  x.fillStyle = '#2a1d12';
  x.fillRect(winX - 6, winY - 6, winW + 12, winH + 12);
  x.fillStyle = '#6e5230';
  x.fillRect(winX, winY, winW, winH);
  const goods = ['#1f4f9a', '#b8452f', '#d6a33c', '#b87333', '#2c8a8f', '#8a2b4a', '#e2d3a8'];
  for (let i = 0; i < 18; i++) {
    const gx = winX + 6 + (i % 4) * 31,
      gy = winY + 8 + Math.floor(i / 4) * 36;
    x.fillStyle = goods[Math.floor(r() * goods.length)];
    if (r() < 0.5) {
      x.beginPath();
      x.arc(gx + 12, gy + 14, 11, 0, Math.PI * 2);
      x.fill();
    } else x.fillRect(gx, gy, 24, 28);
  }
  y.fillStyle = '#ffcf8a';
  y.fillRect(winX, winY, winW, winH);
  // door
  x.fillStyle = '#4a2e18';
  x.fillRect(160, 110, 84, 274);
  x.strokeStyle = '#2a190c';
  x.lineWidth = 3;
  for (let i = 0; i < 4; i++) x.strokeRect(166 + (i % 2) * 38, 120 + Math.floor(i / 2) * 120, 32, 108);
  x.fillStyle = '#c9a44a';
  x.beginPath();
  x.arc(202, 250, 4, 0, Math.PI * 2);
  x.fill();
  // hanging carpet sample
  if (r() < 0.6) {
    x.fillStyle = '#8f2a22';
    x.fillRect(20, 300, 120, 70);
    x.strokeStyle = '#e0c070';
    x.lineWidth = 3;
    x.strokeRect(26, 306, 108, 58);
    x.fillStyle = '#1e3f70';
    x.beginPath();
    x.moveTo(80, 312);
    x.lineTo(110, 335);
    x.lineTo(80, 358);
    x.lineTo(50, 335);
    x.fill();
  }
  y.fillStyle = '#6a4a20';
  y.fillRect(0, 0, 256, 100);
  return { map: c, glow: g };
}

// Upper loggia back: plaster wall with a small door
export function loggiaCanvas() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = '#e3d2ae';
  x.fillRect(0, 0, 128, 192);
  x.fillStyle = '#3d2716';
  x.fillRect(40, 80, 48, 112);
  x.strokeStyle = '#1e5c8f';
  x.lineWidth = 6;
  x.strokeRect(34, 74, 60, 124);
  const g = document.createElement('canvas');
  g.width = 128;
  g.height = 192;
  const y = g.getContext('2d');
  const grd = y.createRadialGradient(64, 40, 5, 64, 60, 110);
  grd.addColorStop(0, '#ffd9a0');
  grd.addColorStop(1, '#6a3e10');
  y.fillStyle = grd;
  y.fillRect(0, 0, 128, 192);
  return { map: c, glow: g };
}

// Place bays along a list of straight segments. Each segment: {a:[x,z], b:[x,z], skip:[[t0,t1],...]}
// Bays face the left-hand normal of a->b (make segments run so the square is on the left).
// Where two consecutive segments meet at a convex (outward) corner, the bays of both would
// overlap behind the corner; there the bays stop short and a solid pier fills the corner.
// Returns array of instanced meshes, pier meshes, plus collider walls along the fronts.
export function buildArcade({ segments, spec, materials, targetBay = 6, castShadow = true, colliderH = 3, pierMat = null }) {
  const byWidth = new Map();
  const colliders = [];
  const lines = [];
  const piers = [];
  const D = Math.max(spec.lower.depth, spec.upper.depth) + 0.15; // depth of a bay behind its front
  const dirOf = (s) => {
    const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    return [(s.b[0] - s.a[0]) / L, (s.b[1] - s.a[1]) / L];
  };
  const same = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05;
  // trim length needed at a corner between direction u (arriving) and v (leaving)
  const cornerTrim = (u, v) => {
    const cross = u[0] * v[1] - u[1] * v[0];
    if (cross < 0.05) return 0; // concave or straight: bays do not collide
    const cos = u[0] * v[0] + u[1] * v[1];
    return D / cross + Math.max(0, (D * cos) / cross);
  };
  segments.forEach((s, si) => {
    const ax = s.a[0],
      az = s.a[1],
      bx = s.b[0],
      bz = s.b[1];
    const Ltot = Math.hypot(bx - ax, bz - az);
    const [dx, dz] = dirOf(s);
    const prev = segments[si - 1],
      next = segments[si + 1];
    const t0 = prev && same(prev.b, s.a) ? cornerTrim(dirOf(prev), [dx, dz]) : 0;
    const t1 = next && same(s.b, next.a) ? cornerTrim([dx, dz], dirOf(next)) : 0;
    const L = Ltot - t0 - t1;
    const ang = Math.atan2(dz, dx);
    // solid piers over the trimmed ends (kept 3 cm off the corner so faces never coincide)
    const pier = (u0, u1) => {
      const len = u1 - u0;
      if (len < 0.05) return;
      const w = G.segWall(ax + dx * u0, az + dz * u0, ax + dx * u1, az + dz * u1, D, spec.H, pierMat || materials[1], { side: 1 });
      piers.push(w);
    };
    if (L < 1.5) {
      pier(0.03, Ltot - 0.03);
    } else {
      if (t0 > 0) pier(0.03, t0);
      if (t1 > 0) pier(Ltot - t1, Ltot - 0.03);
      const n = Math.max(1, Math.round(L / targetBay));
      const bw = +(L / n).toFixed(3);
      const key = bw.toFixed(2);
      if (!byWidth.has(key)) byWidth.set(key, { bw, mats: [] });
      for (let i = 0; i < n; i++) {
        const tm = t0 + (i + 0.5) * bw;
        if (s.skip && s.skip.some(([k0, k1]) => tm > k0 && tm < k1)) continue;
        const cx = ax + dx * tm,
          cz = az + dz * tm;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(cx, 0, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang + Math.PI), new THREE.Vector3(1, 1, 1));
        byWidth.get(key).mats.push(m);
      }
    }
    if (colliderH > 0) {
      // invisible collider slightly in front of the façade
      const w = G.segWall(ax, az, bx, bz, 0.4, colliderH, G.colliderMat);
      w.updateMatrixWorld(true);
      colliders.push(w);
    }
    lines.push({ ax, az, bx, bz });
  });
  const meshes = [];
  for (const { bw, mats } of byWidth.values()) {
    if (!mats.length) continue;
    const geo = bayGeometry({ bw, ...spec });
    const im = new THREE.InstancedMesh(geo, materials, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = castShadow;
    im.receiveShadow = true;
    meshes.push(im);
  }
  return { meshes: meshes.concat(piers), colliders, lines };
}
