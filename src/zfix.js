// Global z-fighting resolver.
// Procedural architecture is full of coincident surfaces: boxes meeting at corners, roof
// slabs level with wall tops, sills level with floors. Two visible surfaces in the same
// plane flicker ("z-fighting"). This pass finds every pair of objects with overlapping,
// coplanar, same-facing triangles and gives the objects of each pair different depth
// priorities (a greedy graph colouring); objects with priority k > 0 get a material clone
// with polygonOffset pulling them k steps toward the camera, so one surface always wins.
import * as THREE from 'three';

const TOL = 0.012; // planes closer than this (m) are treated as coincident
const MAX_LEVEL = 6;

export function resolveCoplanar(scene, W) {
  scene.updateMatrixWorld(true);
  const tris = [];
  const objects = [];
  const v0 = new THREE.Vector3(),
    v1 = new THREE.Vector3(),
    v2 = new THREE.Vector3(),
    e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3(),
    n = new THREE.Vector3();
  const mw = new THREE.Matrix4(),
    mi = new THREE.Matrix4();
  const isDynamic = (o) => {
    for (let p = o; p; p = p.parent) if (p.userData.dynamic || !p.visible) return true;
    return false;
  };
  scene.traverse((o) => {
    if (!o.isMesh || isDynamic(o) || o.layers.mask === 2) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => !m || m.isShaderMaterial || m.transparent || !m.visible)) return;
    const g = o.geometry;
    const pos = g.attributes.position;
    if (!pos) return;
    const oi = objects.push(o) - 1;
    const idx = g.index;
    const total = idx ? idx.count : pos.count;
    const count = o.isInstancedMesh ? o.count : 1;
    for (let inst = 0; inst < count; inst++) {
      if (o.isInstancedMesh) {
        o.getMatrixAt(inst, mi);
        mw.multiplyMatrices(o.matrixWorld, mi);
      } else mw.copy(o.matrixWorld);
      for (let k = 0; k + 2 < total; k += 3) {
        const i0 = idx ? idx.getX(k) : k,
          i1 = idx ? idx.getX(k + 1) : k + 1,
          i2 = idx ? idx.getX(k + 2) : k + 2;
        v0.fromBufferAttribute(pos, i0).applyMatrix4(mw);
        v1.fromBufferAttribute(pos, i1).applyMatrix4(mw);
        v2.fromBufferAttribute(pos, i2).applyMatrix4(mw);
        n.crossVectors(e1.subVectors(v1, v0), e2.subVectors(v2, v0));
        const len = n.length();
        if (len < 2e-4) continue;
        n.divideScalar(len);
        // faces pointing down at ground level can never be seen
        if (n.y < -0.9 && v0.y < 0.3 && v1.y < 0.3 && v2.y < 0.3) continue;
        tris.push({ o: oi, inst, n: [n.x, n.y, n.z], d: n.dot(v0), p: [v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z] });
      }
    }
  });

  // bucket triangles by plane (quantised normal + offset)
  const buckets = new Map();
  for (const t of tris) {
    t.dq = Math.round(t.d / TOL);
    t.nk = `${Math.round(t.n[0] * 40)},${Math.round(t.n[1] * 40)},${Math.round(t.n[2] * 40)}`;
    const k = t.nk + ',' + t.dq;
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = []));
    b.push(t);
  }

  const edges = new Map(); // "a,b" -> overlap area
  const U = new THREE.Vector3(),
    V = new THREE.Vector3(),
    N = new THREE.Vector3(),
    tmp = new THREE.Vector3();
  const proj = (t) => {
    const q = [];
    for (let i = 0; i < 3; i++) {
      tmp.set(t.p[i * 3], t.p[i * 3 + 1], t.p[i * 3 + 2]);
      q.push([tmp.dot(U), tmp.dot(V)]);
    }
    if (area2(q) < 0) q.reverse();
    return q;
  };
  for (const [k, list] of buckets) {
    const parts = k.split(',');
    const nk = parts.slice(0, 3).join(',');
    const dq = +parts[3];
    const next = buckets.get(nk + ',' + (dq + 1));
    for (const other of [list, next]) {
      if (!other) continue;
      if (list.length * other.length > 3e6) continue;
      N.set(...list[0].n);
      if (Math.abs(N.y) < 0.9) U.set(0, 1, 0).cross(N).normalize();
      else U.set(1, 0, 0).cross(N).normalize();
      V.crossVectors(N, U);
      const q2 = new Map();
      const get = (t) => {
        let r = q2.get(t);
        if (!r) {
          const q = proj(t);
          r = { q, bb: [Math.min(q[0][0], q[1][0], q[2][0]), Math.min(q[0][1], q[1][1], q[2][1]), Math.max(q[0][0], q[1][0], q[2][0]), Math.max(q[0][1], q[1][1], q[2][1])] };
          q2.set(t, r);
        }
        return r;
      };
      const same = other === list;
      for (let i = 0; i < list.length; i++) {
        const A = list[i];
        const a = get(A);
        for (let j = same ? i + 1 : 0; j < other.length; j++) {
          const B = other[j];
          if (A.o === B.o) continue;
          if (Math.abs(A.d - B.d) > TOL) continue;
          const b = get(B);
          if (a.bb[2] <= b.bb[0] + 1e-3 || b.bb[2] <= a.bb[0] + 1e-3 || a.bb[3] <= b.bb[1] + 1e-3 || b.bb[3] <= a.bb[1] + 1e-3) continue;
          const ov = clip(a.q, b.q);
          if (ov.length < 3) continue;
          const ar = Math.abs(area2(ov)) / 2;
          if (ar < 2e-3) continue;
          const key = A.o < B.o ? A.o + ',' + B.o : B.o + ',' + A.o;
          edges.set(key, (edges.get(key) || 0) + ar);
        }
      }
    }
  }

  // greedy colouring, most-connected objects first
  const adj = new Map();
  for (const key of edges.keys()) {
    const [a, b] = key.split(',').map(Number);
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  }
  const order = [...adj.keys()].sort((x, y) => adj.get(y).size - adj.get(x).size);
  const level = new Map();
  let unresolved = 0;
  for (const o of order) {
    const used = new Set([...adj.get(o)].map((x) => level.get(x)).filter((x) => x !== undefined));
    let l = 0;
    while (used.has(l) && l < MAX_LEVEL) l++;
    if (used.has(l)) unresolved++;
    level.set(o, l);
  }

  // apply: clone materials per level with a depth offset toward the camera
  const clones = new Map();
  const night = new Set(W.nightLights || []);
  const offsetMat = (m, l) => {
    const key = m.uuid + ':' + l;
    let c = clones.get(key);
    if (!c) {
      c = m.clone();
      c.polygonOffset = true;
      c.polygonOffsetFactor = (m.polygonOffset ? m.polygonOffsetFactor : 0) - l;
      c.polygonOffsetUnits = (m.polygonOffset ? m.polygonOffsetUnits : 0) - 2 * l;
      c.userData = { ...m.userData };
      if (night.has(m)) W.nightLights.push(c);
      clones.set(key, c);
    }
    return c;
  };
  let changed = 0;
  for (const [oi, l] of level) {
    if (l === 0) continue;
    const o = objects[oi];
    o.material = Array.isArray(o.material) ? o.material.map((m) => offsetMat(m, l)) : offsetMat(o.material, l);
    changed++;
  }
  return { triangles: tris.length, pairs: edges.size, objects: adj.size, changed, levels: Math.max(0, ...level.values()) + 1, unresolved, clones: clones.size };
}

function area2(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s;
}

// convex polygon clipping (Sutherland-Hodgman); both polygons counter-clockwise
function clip(subj, clipPoly) {
  let out = subj;
  for (let i = 0; i < clipPoly.length && out.length; i++) {
    const A = clipPoly[i],
      B = clipPoly[(i + 1) % clipPoly.length];
    const side = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j],
        Q = inp[(j + 1) % inp.length];
      const sp = side(P),
        sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
      }
    }
  }
  return out;
}
