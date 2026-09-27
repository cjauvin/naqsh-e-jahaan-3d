// Geometry helpers for Safavid architecture: four-centred arches, arched walls,
// muqarnas hoods, onion/pointed domes, minarets, pishtaq portals.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// invisible material for collision-only meshes (kept out of the scene)
export const colliderMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

// ---------- Persian four-centred ("chahar-markazi") arch ----------
// Returns points (Vector2-like [x,y]) of the arch outline from the left springing
// (x=-w/2, y=spring) over the apex (0, spring+rise) to the right springing.
// r1Frac: radius of the lower arcs as a fraction of the span; theta1: angle swept by lower arc.
export function archCurve(w, spring, rise, { r1Frac = 0.3, theta1 = (62 * Math.PI) / 180, seg = 8 } = {}) {
  const half = w / 2;
  const r1 = w * r1Frac;
  const C1 = [-half + r1, spring];
  const T = [C1[0] - r1 * Math.cos(theta1), C1[1] + r1 * Math.sin(theta1)];
  const c = Math.cos(theta1),
    s = Math.sin(theta1);
  const tx = T[0],
    hy = spring + rise - T[1];
  let r2 = -(tx * tx + hy * hy) / (2 * (tx * c + hy * s));
  if (!(r2 > r1) || !isFinite(r2)) r2 = r1 * 3; // fallback
  const C2 = [T[0] + r2 * c, T[1] - r2 * s];
  const left = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * theta1;
    left.push([C1[0] - r1 * Math.cos(a), C1[1] + r1 * Math.sin(a)]);
  }
  // second arc from T to apex
  const a0 = Math.atan2(T[1] - C2[1], T[0] - C2[0]);
  const a1 = Math.atan2(spring + rise - C2[1], 0 - C2[0]);
  for (let i = 1; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg;
    left.push([C2[0] + r2 * Math.cos(a), C2[1] + r2 * Math.sin(a)]);
  }
  left[left.length - 1] = [0, spring + rise];
  const right = left
    .slice(0, -1)
    .reverse()
    .map((p) => [-p[0], p[1]]);
  return left.concat(right);
}

// Closed opening outline: bottom-left -> up jamb -> arch -> down jamb -> bottom-right
export function archOpening(w, spring, rise, sill = 0, opts) {
  const curve = archCurve(w, spring, rise, opts);
  return [[-w / 2, sill], ...curve, [w / 2, sill]];
}

// ---------- wall with arched openings (extruded) ----------
// W x H wall panel from x=-W/2..W/2, y=0..H, extruded along -z by depth (front face at z=0).
// openings: [{x, w, spring, rise, sill}]. Returns geometry with groups:
// 0 = front/back faces (uv mapped 0..1 across the panel), 1 = reveals/soffits (uv in meters).
export function archedWall(W, H, depth, openings = [], { x0 = -W / 2, y0 = 0 } = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(x0, y0);
  shape.lineTo(x0 + W, y0);
  shape.lineTo(x0 + W, y0 + H);
  shape.lineTo(x0, y0 + H);
  shape.closePath();
  for (const o of openings) {
    const pts = archOpening(o.w, o.spring, o.rise, o.sill ?? 0, o.opts).map((p) => new THREE.Vector2(p[0] + o.x, p[1]));
    // holes must be wound opposite; if sill==0 the hole touches the bottom edge — lift slightly
    if ((o.sill ?? 0) <= y0) pts[0].y = pts[pts.length - 1].y = y0 + 0.001;
    const hole = new THREE.Path(pts.reverse());
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -depth);
  // uv fix
  const pos = g.attributes.position,
    nor = g.attributes.normal,
    uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nz = Math.abs(nor.getZ(i));
    if (nz > 0.9) {
      uv.setXY(i, (pos.getX(i) - x0) / W, (pos.getY(i) - y0) / H);
    } else {
      // reveals: u along perimeter-ish (use x+y), v along depth
      uv.setXY(i, (pos.getX(i) + pos.getY(i)) / 2, pos.getZ(i) / 2);
    }
  }
  return regroupByNormal(g);
}

// Reorder a non-indexed geometry's triangles into 3 groups: 0 = front (+z), 1 = back (-z), 2 = others.
export function regroupByNormal(g) {
  if (g.index) g = g.toNonIndexed();
  const pos = g.attributes.position,
    nor = g.attributes.normal,
    uv = g.attributes.uv;
  const buckets = [[], [], []];
  for (let t = 0; t < pos.count; t += 3) {
    const nz = (nor.getZ(t) + nor.getZ(t + 1) + nor.getZ(t + 2)) / 3;
    buckets[nz > 0.9 ? 0 : nz < -0.9 ? 1 : 2].push(t);
  }
  const P = [],
    N = [],
    U = [];
  const out = new THREE.BufferGeometry();
  let start = 0;
  buckets.forEach((b, gi) => {
    for (const t of b)
      for (let k = 0; k < 3; k++) {
        P.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k));
        N.push(nor.getX(t + k), nor.getY(t + k), nor.getZ(t + k));
        U.push(uv.getX(t + k), uv.getY(t + k));
      }
    out.addGroup(start, b.length * 3, gi);
    start += b.length * 3;
  });
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return out;
}

// ---------- muqarnas hood ----------
// Half-dome of stalactite cells filling an arch niche. Opening in plane z=0, niche toward -z.
// R = half-span, rise = vertical height of hood, tiers = number of cell rows.
export function muqarnasHood(R, rise, { tiers = 7, base = 11, depthScale = 1 } = {}) {
  const geos = [];
  const cellProto = (() => {
    // a small concave pointed niche: quarter of a sphere, opening facing +z
    const g = new THREE.SphereGeometry(1, 4, 3, Math.PI, Math.PI, 0, Math.PI / 2);
    // make it face +z (open side toward center)
    g.rotateX(0);
    return g;
  })();
  for (let t = 0; t < tiers; t++) {
    const p0 = (t / tiers) * (Math.PI / 2);
    const p1 = ((t + 1) / tiers) * (Math.PI / 2);
    const rr = R * Math.cos((p0 + p1) / 2);
    const y0 = rise * Math.sin(p0);
    const y1 = rise * Math.sin(p1);
    const n = Math.max(2, Math.round(base * Math.cos(p0) + (t % 2)));
    const cellW = (Math.PI * rr) / n;
    for (let i = 0; i < n; i++) {
      const th = Math.PI * ((i + 0.5) / n); // 0..PI across the back half
      const x = -Math.cos(th) * rr;
      const z = -Math.sin(th) * rr * depthScale;
      const cg = cellProto.clone();
      // scale: width, height, depth
      cg.scale(cellW * 0.5, (y1 - y0) * 1.0, cellW * 0.7);
      // orient so the open (concave) side faces the niche centre
      cg.rotateY(-(th - Math.PI / 2));
      cg.translate(x, y0, z);
      geos.push(cg);
    }
    // pendant stalactite tips hanging between neighbouring cells
    const ph = (y1 - y0) * 0.55;
    for (let i = 0; i <= n; i++) {
      const th = Math.PI * (i / n);
      const r2 = rr * 0.96;
      const cone = new THREE.ConeGeometry(cellW * 0.16, ph, 4, 1, true);
      cone.rotateX(Math.PI);
      cone.translate(-Math.cos(th) * r2, y0 + (y1 - y0) * 0.35 - ph / 2, -Math.sin(th) * r2 * depthScale);
      geos.push(cone);
    }
    // shelf ring between tiers
    const shelf = new THREE.RingGeometry(rr * 0.82, R * Math.cos(p0) * 1.001, 12, 1, 0, Math.PI);
    shelf.rotateX(-Math.PI / 2);
    shelf.scale(1, 1, depthScale);
    shelf.translate(0, y0, 0);
    geos.push(shelf.toNonIndexed ? shelf : shelf);
  }
  // backing half dome so there are no gaps
  const back = new THREE.SphereGeometry(R * 1.01, 16, 8, Math.PI, Math.PI, 0, Math.PI / 2);
  // phi in [PI, 2PI] puts the half-dome on the z<=0 side (behind the arch plane)
  back.scale(1, rise / R, depthScale);
  // flip to face inward
  flipFaces(back);
  geos.push(back);
  const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)).map(stripToPNU));
  merged.computeVertexNormals();
  return merged;
}

function stripToPNU(g) {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
}

export function flipFaces(g) {
  const idx = g.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
    idx.needsUpdate = true;
  }
  const n = g.attributes.normal;
  if (n) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

// ---------- domes ----------
// Profile generator for Safavid domes. R = base radius, H = height of shell above base.
// bulge: how much wider than base the dome swells (Shah: ~1.06, Lotfollah ~1.0)
export function domeProfile(R, H, { bulge = 1.05, point = 0.12, seg = 40 } = {}) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg; // 0 base -> 1 apex
    const a = t * (Math.PI / 2);
    // elliptical base shape with swelling, then pinched toward a point at the top
    let r = R * Math.cos(a) * (1 + (bulge - 1) * Math.sin(a * 2) * 1.2);
    let y = H * Math.sin(a);
    // make pointed crown: pull radius in near top
    const k = Math.max(0, (t - 0.6) / 0.4);
    r *= 1 - point * k * k * 0.9;
    y += H * point * 0.35 * k * k;
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), y));
  }
  return pts;
}

export function domeGeometry(R, H, opts = {}) {
  const g = new THREE.LatheGeometry(domeProfile(R, H, opts), opts.radial ?? 64);
  return g;
}

// finial (alem): stacked spheres and spike
export function finial(scale = 1, mat) {
  const grp = new THREE.Group();
  const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.35 * scale, 12, 8), mat);
  s1.position.y = 0.3 * scale;
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 12, 8), mat);
  s2.position.y = 0.95 * scale;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 2.4 * scale, 6), mat);
  rod.position.y = 1.2 * scale;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.6 * scale, 8), mat);
  tip.position.y = 2.6 * scale;
  grp.add(s1, s2, rod, tip);
  return grp;
}

// ---------- minaret ----------
// A Safavid minaret: tapering shaft with banna'i tiles, muqarnas balcony with a
// wooden-roofed gallery (goldasteh), crowned by a small dome.
export function minaret({ height = 42, r0 = 2.1, r1 = 1.7, shaftMat, bandMat, balconyMat, capMat, woodMat, finialMat }) {
  const g = new THREE.Group();
  const shaftH = height * 0.8;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, shaftH, 24, 1, true), shaftMat);
  shaft.position.y = shaftH / 2;
  g.add(shaft);
  // calligraphy bands along shaft
  for (const f of [0.55, 0.93]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r0 - (r0 - r1) * f + 0.03, r0 - (r0 - r1) * f + 0.03, 1.4, 24, 1, true), bandMat);
    b.position.y = shaftH * f;
    g.add(b);
  }
  // muqarnas corbel under balcony: stacked widening rings
  let y = shaftH;
  for (let i = 0; i < 4; i++) {
    const rr = r1 + i * 0.22;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(rr + 0.22, rr, 0.45, 24, 1, false), balconyMat);
    ring.position.y = y + 0.225;
    g.add(ring);
    y += 0.45;
  }
  const balR = r1 + 0.75;
  // balcony floor
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(balR, balR, 0.2, 24), balconyMat);
  floor.position.y = y + 0.1;
  g.add(floor);
  // gallery with slender posts + wooden roof
  const galH = 2.6;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(r1 * 0.85, r1 * 0.85, galH, 16), shaftMat);
  inner.position.y = y + galH / 2;
  g.add(inner);
  const nPost = 12;
  for (let i = 0; i < nPost; i++) {
    const a = (i / nPost) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, galH, 5), woodMat);
    post.position.set(Math.cos(a) * (balR - 0.15), y + galH / 2, Math.sin(a) * (balR - 0.15));
    g.add(post);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(balR - 0.1, balR - 0.1, 0.9, 24, 1, true), woodMat);
  rail.position.y = y + 0.55;
  rail.material = woodMat;
  g.add(rail);
  y += galH;
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(balR - 0.35, balR + 0.05, 0.3, 24), woodMat);
  roof.position.y = y + 0.15;
  g.add(roof);
  y += 0.5;
  // top shaft and cap
  const topH = height - y - 2.2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r1 * 0.8, r1 * 0.8, Math.max(0.5, topH), 20, 1, true), shaftMat);
  top.position.y = y + Math.max(0.5, topH) / 2;
  g.add(top);
  y += Math.max(0.5, topH);
  const cap = new THREE.Mesh(domeGeometry(r1 * 0.85, 1.8, { bulge: 1.08, point: 0.3, radial: 24 }), capMat);
  cap.position.y = y;
  g.add(cap);
  const fin = finial(0.5, finialMat);
  fin.position.y = y + 1.9;
  g.add(fin);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

// ---------- pishtaq: rectangular portal frame with deep muqarnas niche ----------
// Front face at z=0, building mass toward -z, origin at bottom centre of the façade.
// The niche is half-hexagonal in plan (radius archW/2) behind a frame of frameDepth.
// door: {w, spring, rise} opening in the niche's back face (walkable), or null.
// Returns { group, colliders, nicheDepth }.
export function pishtaq({
  W,
  H,
  archW,
  archSpring,
  archRise,
  frameDepth = 1.6,
  facadeMat,
  backMat,
  revealMat,
  nicheWallMat,
  hoodMat,
  doorMat,
  door = { w: 2.4, spring: 3, rise: 1.2 },
  doorOpen = true,
  tiers = 8,
  hood = true,
}) {
  const g = new THREE.Group();
  const colliders = [];
  const wall = new THREE.Mesh(archedWall(W, H, frameDepth, [{ x: 0, w: archW, spring: archSpring, rise: archRise }]), [facadeMat, backMat || revealMat, revealMat]);
  wall.castShadow = wall.receiveShadow = true;
  g.add(wall);
  colliders.push(wall);
  const R = archW / 2;
  const s3 = Math.sqrt(3) / 2;
  const zc = -frameDepth;
  // side faces of the half-hexagon (from (±R,0) to (±R/2,-s3 R))
  const sideLen = R;
  for (const sg of [-1, 1]) {
    const wg = archedWall(sideLen, archSpring + 0.01, 0.3, []);
    const m = new THREE.Mesh(wg, [nicheWallMat, nicheWallMat, nicheWallMat]);
    // local wall runs along x centred; rotate so it spans the side edge facing inward
    const x0 = sg * R,
      z0 = zc,
      x1 = (sg * R) / 2,
      z1 = zc - s3 * R;
    m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    m.rotation.y = -ang + (sg > 0 ? 0 : Math.PI);
    m.receiveShadow = true;
    g.add(m);
    colliders.push(m);
  }
  // back face, optionally with a doorway
  const openings = door ? [{ x: 0, w: door.w, spring: door.spring, rise: door.rise }] : [];
  const back = new THREE.Mesh(archedWall(R, archSpring + 0.01, 0.3, openings), [nicheWallMat, nicheWallMat, revealMat]);
  back.position.set(0, 0, zc - s3 * R);
  back.receiveShadow = true;
  g.add(back);
  colliders.push(back);
  if (door && !doorOpen) {
    const dm = new THREE.Mesh(new THREE.ShapeGeometry(shapeFromPts(archOpening(door.w, door.spring, door.rise))), doorMat);
    dm.position.set(0, 0.01, zc - s3 * R - 0.15);
    g.add(dm);
    colliders.push(dm);
  }
  if (hood) {
    const hm = new THREE.Mesh(muqarnasHood(R, archRise, { tiers, depthScale: s3 * 1.02 }), hoodMat);
    hm.position.set(0, archSpring, zc);
    hm.receiveShadow = true;
    g.add(hm);
  }
  return { group: g, colliders, nicheDepth: frameDepth + s3 * R + 0.3 };
}

export function shapeFromPts(pts) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  s.closePath();
  return s;
}

// ---------- boxes ----------
export function box(w, h, d, mat, x = 0, y = 0, z = 0, { uvScale = null } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (uvScale) scaleBoxUV(geo, w, h, d, uvScale);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// World-size uvs for a BoxGeometry so textures repeat per `unit` meters
export function scaleBoxUV(geo, w, h, d, unit = 1) {
  const uv = geo.attributes.uv;
  // BoxGeometry faces order: +x, -x, +y, -y, +z, -z ; 4 verts each
  const dims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / unit, (uv.getY(i) * dims[f][1]) / unit);
    }
  return geo;
}

// Plane with world-scaled UVs
export function plane(w, h, mat, unit = 1) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / unit, (uv.getY(i) * h) / unit);
  return new THREE.Mesh(g, mat);
}

export { mergeGeometries };

// Box wall between two points (x0,z0)-(x1,z1) in the parent's xz plane.
// Thickness is centred on the segment unless `side` is +1/-1 (offset to the left/right normal).
export function segWall(x0, z0, x1, z1, thick, h, mat, { y0 = 0, side = 0, unit = 2 } = {}) {
  const dx = x1 - x0,
    dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const geo = new THREE.BoxGeometry(len, h, thick);
  scaleBoxUV(geo, len, h, thick, unit);
  const m = new THREE.Mesh(geo, mat);
  const ang = Math.atan2(dz, dx);
  // left normal of the direction (dx,dz) in xz is (dz,-dx)/len ... we use (−dz, dx)
  const nx = -dz / len,
    nz = dx / len;
  m.position.set((x0 + x1) / 2 + nx * side * thick * 0.5, y0 + h / 2, (z0 + z1) / 2 + nz * side * thick * 0.5);
  m.rotation.y = -ang;
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Flat slab (floor/roof) as a convex polygon of [x,z] points at height y with thickness t
export function slab(pts, y, t, mat, unit = 2) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => (i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1])));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y - t, 0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / unit, uv.getY(i) / unit);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Cylinder band with a repeating canvas texture (drums, bands)
export function drum(r, h, mat, { seg = 48, y = 0, open = true } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg, 1, open), mat);
  m.position.y = y + h / 2;
  m.castShadow = m.receiveShadow = true;
  return m;
}
