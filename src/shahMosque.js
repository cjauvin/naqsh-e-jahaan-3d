// Shah (Imam) Mosque, 1611–1629, south end of the square.
// The portal stands at the back of a half-octagonal recess on the square's axis; behind it
// a domed vestibule and a passage lead into the courtyard through the NE iwan, so the whole
// mosque is turned 45° toward the qibla (SW). Four-iwan courtyard, a 33 m qibla iwan with
// 48 m minarets, a double-shell dome (~52 m), two shabestans and two madrasas.
import * as THREE from 'three';
import * as G from './geom.js';
import * as T from './textures.js';
import { buildArcade, shopCanvas } from './arcade.js';
import { makePool } from './water.js';

const S2 = Math.SQRT1_2;
export const SHAH = {
  recess: { w: 26, straight: 12, back: 17, depth: 16.5 },
  portalZ: 256 + 16.5,
  C: [-23, 331], // courtyard centre (world)
  hu: 27.5, // half-length along the qibla axis
  hv: 33, // half-width across
};

function orient(obj, x, z, fx, fz) {
  obj.position.set(x, 0, z);
  obj.rotation.y = Math.atan2(fx, fz);
  return obj;
}

// facade texture helper
function facadeMat(M, { W, H, aw, sp, ri, field, band, bandW = 1.2, dado = 2, px = 48, fieldScale = 2, archFill = null }) {
  const c = T.facadeCanvas({ W, H, archPts: G.archOpening(aw, sp, ri), field, band, bandW, dado, px, fieldScale, archFill });
  return new THREE.MeshStandardMaterial({ map: T.toTex(c, { wrap: false }), roughness: 0.32 });
}

export function buildShahMosque(M, W) {
  const scene = W.scene;
  const root = new THREE.Group();
  scene.add(root);
  const col = (m) => (Array.isArray(m) ? m.forEach((x) => W.colliders.push(x)) : W.colliders.push(m));

  // ================================================= portal
  const PW = 17,
    PH = 27,
    paw = 10.5,
    psp = 12.5,
    pri = 7.2;
  const portalG = orient(new THREE.Group(), 0, SHAH.portalZ, 0, -1);
  root.add(portalG);
  const pMat = facadeMat(M, { W: PW, H: PH, aw: paw, sp: psp, ri: pri, field: M.canvas.arabDeep, band: M.canvas.calligBasmala, bandW: 1.5, dado: 2.3, px: 56, fieldScale: 2.4 });
  const portal = G.pishtaq({
    W: PW,
    H: PH,
    archW: paw,
    archSpring: psp,
    archRise: pri,
    frameDepth: 2.2,
    facadeMat: pMat,
    backMat: M.brick,
    revealMat: M.tileLapis,
    nicheWallMat: M.tileDeep,
    hoodMat: M.muqarnas,
    door: { w: 3.4, spring: 4.4, rise: 1.6 },
    tiers: 12,
  });
  portalG.add(portal.group);
  col(portal.colliders);
  const pnb = -portal.nicheDepth; // niche back (local z)
  {
    const R = paw / 2;
    for (const sg of [-1, 1]) portalG.add(G.box(PW / 2 - R, PH, -pnb - 2.2, M.brick, sg * (R + (PW / 2 - R) / 2), 0, pnb / 2 - 1.1, { uvScale: 2 }));
    portalG.add(G.box(paw, PH - psp - pri, -pnb - 2.2, M.brick, 0, psp + pri, pnb / 2 - 1.1, { uvScale: 2 }));
    portalG.add(G.box(PW + 0.4, 0.8, 2.6, M.tileTurq, 0, PH, -1.3));
    for (const sg of [-1, 1]) portalG.add(G.box(1.4, 0.6, 3, M.marble, sg * (R - 1.1), 0, -3.5));
    // portal minarets, rising behind the frame
    for (const sg of [-1, 1]) {
      const mn = G.minaret({ height: 40, r0: 2.1, r1: 1.85, shaftMat: M.bannaiBlue, bandMat: M.bandMinaret, balconyMat: M.muqarnasTurq, capMat: M.domeTurqPlain, woodMat: M.wood, finialMat: M.gold });
      mn.position.set(sg * (PW / 2 - 2.3), 0, -4.2);
      portalG.add(mn);
    }
  }

  // ================================================= vestibule (domed octagon)
  const V = new THREE.Vector2(0, 289);
  const vr = 6.5,
    vH = 13;
  const vest = orient(new THREE.Group(), V.x, V.y, 0, 1);
  root.add(vest);
  const vfw = 2 * vr * Math.tan(Math.PI / 8);
  const vPanel = facadeMat(M, { W: vfw, H: vH, aw: 3.8, sp: 5.8, ri: 2.4, field: M.canvas.arabLapis, band: M.canvas.calligShah, bandW: 0.55, dado: 1.6, px: 70, fieldScale: 1.4, archFill: M.canvas.starBlue });
  for (let k = 0; k < 8; k++) {
    const al = (k * Math.PI) / 4;
    const openings = k === 0 || k === 4 ? [{ x: 0, w: 3.6, spring: 4.4, rise: 1.6 }] : [];
    const f = new THREE.Mesh(G.archedWall(vfw, vH, 0.6, openings), [vPanel, M.brick, M.tileLapis]);
    // k=0 faces +z local (south, passage) ; k=4 faces north (portal)
    f.position.set(Math.sin(al) * vr, 0, Math.cos(al) * vr);
    f.rotation.y = al + Math.PI;
    f.receiveShadow = true;
    vest.add(f);
    col(f);
  }
  {
    const d = new THREE.Mesh(new THREE.SphereGeometry(vr * 1.05, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: T.toTex(M.canvas.arabDeep, { repeat: [8, 2] }), roughness: 0.4, side: THREE.BackSide }));
    d.position.y = vH;
    vest.add(d);
    const ring = new THREE.Mesh(new THREE.RingGeometry(vr * 0.98, vr * 1.2, 8, 1, Math.PI / 8), M.tileTurq);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = vH;
    vest.add(ring);
    vest.add(G.box(vr * 2.6, 0.5, vr * 2.6, M.roof, 0, vH + vr + 0.5, 0));
    const outer = new THREE.Mesh(G.domeGeometry(vr * 1.1, vr * 0.9, { bulge: 1.03, point: 0.15, radial: 32 }), M.domeTurqPlain);
    outer.position.y = vH + vr + 1;
    vest.add(outer);
    // outer box, open on the portal (north) and passage (south) axis
    const oh = vH + vr + 1;
    for (const [x0, z0, x1, z1, y0] of [
      [-8.5, -8.5, -2.4, -8.5, 0],
      [2.4, -8.5, 8.5, -8.5, 0],
      [-2.4, -8.5, 2.4, -8.5, 6.4],
      [8.5, -8.5, 8.5, 8.5, 0],
      [8.5, 8.5, 2.4, 8.5, 0],
      [-2.4, 8.5, -8.5, 8.5, 0],
      [2.4, 8.5, -2.4, 8.5, 6.9],
      [-8.5, 8.5, -8.5, -8.5, 0],
    ])
      vest.add(G.segWall(x0, z0, x1, z1, 1, oh - y0, M.brick, { y0 }));
    const vf = G.plane(18, 31, M.pavingLight, 2.5);
    vf.rotation.x = -Math.PI / 2;
    vf.position.set(0, 0.03, 4.5);
    vest.add(vf);
    const lamp = new THREE.PointLight(0xffc98a, 12, 22, 1.5);
    lamp.position.set(0, 8, 0);
    vest.add(lamp);
  }
  // short link between portal niche and vestibule
  {
    const z0 = SHAH.portalZ - pnb,
      z1 = V.y - vr;
    for (const sg of [-1, 1]) {
      const w = G.segWall(sg * 1.9, z0, sg * 1.9, z1 + 0.3, 0.6, 6, M.plaster, { side: sg > 0 ? -1 : 1 });
      root.add(w);
      col(w);
    }
    root.add(G.slab([[-2.3, z0], [2.3, z0], [2.3, z1 + 0.3], [-2.3, z1 + 0.3]], 6.3, 0.3, M.painted, 3));
  }

  // ================================================= courtyard frame (rotated 45°)
  const C = new THREE.Vector2(...SHAH.C);
  const cg = orient(new THREE.Group(), C.x, C.y, -S2, S2); // local +z = qibla (SW), +x = SE
  root.add(cg);
  const hu = SHAH.hu,
    hv = SHAH.hv;
  cg.updateMatrixWorld(true);
  const cgToWorld = (x, z) => {
    const v = new THREE.Vector3(x, 0, z).applyMatrix4(cg.matrixWorld);
    return [v.x, v.z];
  };

  // passage from the vestibule south to the NE iwan's back door
  {
    const zs = V.y + vr;
    const iwanBack = new THREE.Vector3(0, 0, -hu - 1.5 - (Math.sqrt(3) / 2) * 5 - 0.3).applyMatrix4(cg.matrixWorld);
    const bx = iwanBack.x,
      bz = iwanBack.z;
    // back face runs along e = (S2,S2) through (bx,bz): z = bz + (x - bx)
    const wx = [-2.1 + bx * 0.5, 2.1 + bx * 0.5];
    for (const [i, x] of wx.entries()) {
      const zEnd = bz + (x - bx);
      const w = G.segWall(x, zs - 0.3, x, zEnd, 0.6, 6.5, M.plaster, { side: i ? -1 : 1 });
      root.add(w);
      col(w);
      root.add(G.segWall(x + (i ? -0.32 : 0.32), zs - 0.3, x + (i ? -0.32 : 0.32), zEnd, 0.06, 1.8, M.tileStarBlue));
    }
    root.add(G.slab([[wx[0] - 0.4, zs - 0.3], [wx[1] + 0.4, zs - 0.3], [wx[1] + 0.4, bz + (wx[1] - bx) + 0.8], [wx[0] - 0.4, bz + (wx[0] - bx) + 0.8]], 6.8, 0.3, M.painted, 3));
    const lamp = new THREE.PointLight(0xffc98a, 6, 14, 1.5);
    lamp.position.set(bx * 0.5, 5, (zs + bz) / 2);
    root.add(lamp);
  }

  // --- courtyard paving
  const court = G.plane(2 * hv, 2 * hu, M.pavingLight, 3);
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.06;
  court.receiveShadow = true;
  cg.add(court);

  // --- arcades (two storeys, fully tiled)
  const iw = { ne: 16, sw: 24, side: 14 };
  const faceC = T.bayFaceCanvas({
    W: 5.2,
    H: 14,
    px: 48,
    brick: M.canvas.arabLapis,
    spandrel: M.canvas.arabDeep,
    arches: [{ pts: G.archOpening(3.5, 4.3, 2.0) }, { pts: G.archOpening(3.2, 10.6, 1.9, 7.6) }],
  });
  const faceMat = new THREE.MeshStandardMaterial({ map: T.toTex(faceC, { wrap: false }), roughness: 0.33 });
  const courtSpec = {
    H: 14,
    story: 7,
    lower: { w: 3.5, spring: 4.3, rise: 2.0, depth: 2.6 },
    upper: { w: 3.2, sill: 7.6, spring: 10.6, rise: 1.9, depth: 3.0 },
  };
  const backTile = new THREE.MeshStandardMaterial({ map: T.toTex(M.canvas.arabDeep, { repeat: [1, 1] }), roughness: 0.4 });
  const arc = buildArcade({
    segments: [
      { a: [hv, -hu], b: [iw.ne / 2, -hu] },
      { a: [-iw.ne / 2, -hu], b: [-hv, -hu] },
      { a: [-hv, -hu], b: [-hv, -iw.side / 2] },
      { a: [-hv, iw.side / 2], b: [-hv, hu] },
      { a: [-hv, hu], b: [-iw.sw / 2, hu] },
      { a: [iw.sw / 2, hu], b: [hv, hu] },
      { a: [hv, hu], b: [hv, iw.side / 2] },
      { a: [hv, -iw.side / 2], b: [hv, -hu] },
    ],
    spec: courtSpec,
    materials: [faceMat, M.brick, M.tileLapis, backTile, M.tileTurq],
    targetBay: 5.2,
  });
  arc.meshes.forEach((m) => cg.add(m));
  arc.colliders.forEach((c) => {
    cg.add(c);
    col(c);
  });
  // roof ring over the arcades + outer walls
  const outV = hv + 7,
    outU = hu + 7;
  {
    const s = new THREE.Shape();
    s.moveTo(-outV, -outU);
    s.lineTo(outV, -outU);
    s.lineTo(outV, outU);
    s.lineTo(-outV, outU);
    s.closePath();
    const h = new THREE.Path();
    h.moveTo(-hv + 0.2, -hu + 0.2);
    h.lineTo(-hv + 0.2, hu - 0.2);
    h.lineTo(hv - 0.2, hu - 0.2);
    h.lineTo(hv - 0.2, -hu + 0.2);
    h.closePath();
    s.holes.push(h);
    // open the roof over the four iwan niches (their hoods rise above the arcade roof)
    const rectHole = (x0, z0, x1, z1) => {
      const p = new THREE.Path();
      p.moveTo(x0, z0);
      p.lineTo(x0, z1);
      p.lineTo(x1, z1);
      p.lineTo(x1, z0);
      p.closePath();
      s.holes.push(p);
    };
    rectHole(-7.2, hu + 0.15, 7.2, outU - 0.1);
    rectHole(-5.2, -outU + 0.1, 5.2, -hu - 0.15);
    rectHole(-outV + 0.1, -4.7, -hv - 0.15, 4.7);
    rectHole(hv + 0.15, -4.7, outV - 0.1, 4.7);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    g.translate(0, 14.6, 0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
    const m = new THREE.Mesh(g, M.roof);
    m.castShadow = m.receiveShadow = true;
    cg.add(m);
    // parapet crest of tiles along the courtyard edge
    for (const [x0, z0, x1, z1] of [
      [-hv, -hu, hv, -hu],
      [hv, -hu, hv, hu],
      [hv, hu, -hv, hu],
      [-hv, hu, -hv, -hu],
    ])
      cg.add(G.segWall(x0, z0, x1, z1, 0.5, 0.8, M.tileTurq, { y0: 14, side: -1 }));
    // outer walls, open behind the NE iwan (entrance passage) and the qibla iwan (sanctuary)
    for (const [x0, z0, x1, z1] of [
      [-outV, -outU, -5.6, -outU],
      [5.6, -outU, outV, -outU],
      [outV, -outU, outV, outU],
      [outV, outU, 7.6, outU],
      [-7.6, outU, -outV, outU],
      [-outV, outU, -outV, -outU],
    ])
      cg.add(G.segWall(x0, z0, x1, z1, 1, 15, M.brick));
    // roof domelets over each bay (as seen in aerial views)
    const dg = new THREE.SphereGeometry(1.6, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    const dm = new THREE.InstancedMesh(dg, M.roof, 120);
    let n = 0;
    const mtx = new THREE.Matrix4();
    for (let x = -hv + 3; x <= hv - 3; x += 5.4) {
      for (const z of [-hu - 3.5, hu + 3.5]) if (Math.abs(x) > 13) dm.setMatrixAt(n++, mtx.makeTranslation(x, 15.2, z));
    }
    for (let z = -hu + 3; z <= hu - 3; z += 5.4) {
      for (const x of [-hv - 3.5, hv - 3.5 + 7]) if (Math.abs(z) > 8) dm.setMatrixAt(n++, mtx.makeTranslation(x, 15.2, z));
    }
    dm.count = n;
    dm.castShadow = false;
    cg.add(dm);
  }

  // --- pool in the courtyard
  {
    const pw = 12,
      pl = 17;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(pw + 1.2, 0.55, pl + 1.2), M.marble);
    rim.position.y = 0.27;
    cg.add(rim);
    const colBox = new THREE.Mesh(new THREE.BoxGeometry(pw + 1.2, 1.2, pl + 1.2), G.colliderMat);
    colBox.position.y = 0.6;
    cg.add(colBox);
    col(colBox);
    makePool(W, M, { w: pw, h: pl, y: 0.58, parent: cg, reflectDist: 110, texSize: 256 });
    const pc = new THREE.Vector3(0, 0, 0).applyMatrix4(cg.matrixWorld);
    W.courtFountainLevel = (p) => Math.max(0, 1 - Math.hypot(p.x - pc.x, p.z - pc.z) / 45) * (p.y < 20 ? 1 : 0);
  }

  // --- iwans
  const mkIwan = ({ x, z, fx, fz, W: w, H: h, aw, sp, ri, fd, door, band, field, tiers = 10 }) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(fx, fz);
    const fm = facadeMat(M, { W: w, H: h, aw, sp, ri, field, band, bandW: Math.min(1.5, w / 14), dado: 2.2, px: 44, fieldScale: 2.2 });
    const p = G.pishtaq({ W: w, H: h, archW: aw, archSpring: sp, archRise: ri, frameDepth: fd, facadeMat: fm, backMat: M.brick, revealMat: M.tileLapis, nicheWallMat: M.tileDeep, hoodMat: M.muqarnas, door, tiers });
    g.add(p.group);
    const R = aw / 2;
    const depth = p.nicheDepth;
    for (const sg of [-1, 1]) g.add(G.box(w / 2 - R, h, depth - fd, M.brick, sg * (R + (w / 2 - R) / 2), 0, -fd - (depth - fd) / 2, { uvScale: 2 }));
    g.add(G.box(aw, h - sp - ri, depth - fd, M.brick, 0, sp + ri, -fd - (depth - fd) / 2, { uvScale: 2 }));
    g.add(G.box(w + 0.3, 0.7, fd + 0.3, M.tileTurq, 0, h, -fd / 2));
    cg.add(g);
    g.updateMatrixWorld(true);
    col(p.colliders);
    return { g, depth };
  };
  mkIwan({ x: 0, z: -hu, fx: 0, fz: 1, W: iw.ne, H: 20, aw: 10, sp: 10.5, ri: 5.5, fd: 1.5, door: { w: 3.6, spring: 4.2, rise: 1.5 }, band: M.canvas.calligShah, field: M.canvas.arabLapis });
  const qibla = mkIwan({ x: 0, z: hu, fx: 0, fz: -1, W: iw.sw, H: 33, aw: 14, sp: 16, ri: 8.5, fd: 2.4, door: { w: 4.6, spring: 5.4, rise: 2 }, band: M.canvas.calligBasmala, field: M.canvas.arabDeep, tiers: 13 });
  mkIwan({ x: -hv, z: 0, fx: 1, fz: 0, W: iw.side, H: 20, aw: 9, sp: 10, ri: 5, fd: 1.5, door: null, band: M.canvas.calligShah, field: M.canvas.arabLapis });
  mkIwan({ x: hv, z: 0, fx: -1, fz: 0, W: iw.side, H: 20, aw: 9, sp: 10, ri: 5, fd: 1.5, door: null, band: M.canvas.calligShah, field: M.canvas.arabLapis });
  // domes behind the side iwans
  for (const sg of [-1, 1]) {
    const d = new THREE.Mesh(G.domeGeometry(6, 5.5, { bulge: 1.02, point: 0.1, radial: 32 }), M.domeTurqPlain);
    d.position.set(sg * (hv + 7), 15, 0);
    cg.add(d);
    cg.add(G.drum(6.2, 1.5, M.brick, { y: 14.6, open: false }));
    cg.children[cg.children.length - 1].position.x = sg * (hv + 7);
  }
  // qibla minarets
  for (const sg of [-1, 1]) {
    const mn = G.minaret({ height: 48, r0: 2.4, r1: 2.0, shaftMat: M.bannaiBlue, bandMat: M.bandMinaret, balconyMat: M.muqarnasTurq, capMat: M.domeTurqPlain, woodMat: M.wood, finialMat: M.gold });
    // rising from the iwan's corner piers (clear of the courtyard arcades)
    mn.position.set(sg * (iw.sw / 2 - 2.5), 0, hu + 4.9);
    cg.add(mn);
  }

  // ================================================= domed sanctuary
  const D = 50; // along the qibla axis
  const dR = 13.2; // outer drum radius
  const a = 11,
    wt = 3,
    H0 = 21;
  const cham = new THREE.Group();
  cham.position.set(0, 0, D);
  cg.add(cham);
  const off = a + wt;
  const doorW = 4.6,
    doorH = 7.2;
  const wallH = 26;
  const walls = [
    G.segWall(-off, off - wt / 2, off, off - wt / 2, wt, wallH, M.tileDeep),
    G.segWall(off - wt / 2, -off, off - wt / 2, off, wt, wallH, M.tileDeep),
    G.segWall(-off + wt / 2, -off, -off + wt / 2, off, wt, wallH, M.tileDeep),
    G.segWall(-off, -off + wt / 2, -doorW / 2, -off + wt / 2, wt, wallH, M.tileDeep),
    G.segWall(doorW / 2, -off + wt / 2, off, -off + wt / 2, wt, wallH, M.tileDeep),
    G.segWall(-doorW / 2, -off + wt / 2, doorW / 2, -off + wt / 2, wt, wallH - doorH, M.tileDeep, { y0: doorH }),
  ];
  walls.forEach((w) => cham.add(w));
  col(walls.slice(0, 5));
  // octagon of arches
  const fw = 2 * a * Math.tan(Math.PI / 8);
  const oaw = 7,
    osp = 10,
    ori = 5.6;
  const panel = facadeMat(M, { W: fw, H: H0, aw: oaw, sp: osp, ri: ori, field: M.canvas.arabLapis, band: M.canvas.calligBasmala, bandW: 0.9, dado: 2.2, px: 60, fieldScale: 1.6, archFill: M.canvas.starBlue });
  const mihrabMat = facadeMat(M, { W: 4, H: 7, aw: 2.6, sp: 3.8, ri: 1.5, field: M.canvas.arabDeep, band: M.canvas.calligBasmala, bandW: 0.5, dado: 0.8, px: 100, fieldScale: 0.9 });
  for (let k = 0; k < 8; k++) {
    const al = (k * Math.PI) / 4;
    const place = (obj, dist) => {
      obj.position.set(Math.sin(al) * dist, 0, Math.cos(al) * dist);
      obj.rotation.y = al + Math.PI;
      cham.add(obj);
    };
    if (k % 2 === 0) {
      const openings = [];
      if (k === 4) openings.push({ x: 0, w: doorW, spring: doorH - 1.6, rise: 1.6 });
      if (k === 0) openings.push({ x: 0, w: 2.6, spring: 3.8, rise: 1.5, sill: 0 });
      const f = new THREE.Mesh(G.archedWall(fw, H0, 0.3, openings), [panel, M.brick, M.tileLapis]);
      f.receiveShadow = true;
      place(f, a - 0.04);
      if (k !== 4) col(f);
      if (k === 0) {
        const mh = G.pishtaq({ W: 4, H: 7, archW: 2.6, archSpring: 3.8, archRise: 1.5, frameDepth: 0.35, facadeMat: mihrabMat, backMat: M.tileDeep, revealMat: M.tileLapis, nicheWallMat: M.tileDeep, hoodMat: M.muqarnas, door: null, tiers: 6 });
        place(mh.group, a - 0.39);
        col(mh.colliders);
      }
    } else {
      const sq = G.pishtaq({ W: fw, H: H0, archW: oaw, archSpring: osp, archRise: ori, frameDepth: 0.3, facadeMat: panel, backMat: M.brick, revealMat: M.tileTurq, nicheWallMat: M.tileDeep, hoodMat: M.muqarnas, door: null, tiers: 8 });
      place(sq.group, a - 0.04);
      col(sq.colliders);
    }
  }
  // marble minbar with 14 steps, beside the mihrab
  {
    const mg = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const s = G.box(1.2, 0.22 * (i + 1), 0.32, M.marble, 0, 0, -i * 0.32);
      mg.add(s);
    }
    mg.add(G.box(1.2, 0.08, 1.2, M.marble, 0, 3.1, -4.6));
    mg.position.set(3.2, 0, a - 1.2);
    mg.rotation.y = Math.PI / 2;
    cham.add(mg);
    const mc = G.box(1.3, 2, 4.8, G.colliderMat, 3.2 - 2.2, 0, a - 1.2);
    mc.rotation.y = Math.PI / 2;
    mc.castShadow = false;
    cham.add(mc);
    col(mc);
  }
  // floor + the black echo stone at the centre
  const floor = G.plane(2 * a, 2 * a, M.pavingLight, 2.5);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.08;
  cham.add(floor);
  const stone = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), M.blackStone);
  stone.rotation.x = -Math.PI / 2;
  stone.position.y = 0.11;
  cham.add(stone);
  // closing ledge, drum with windows, inner dome
  const ledge = new THREE.Mesh(new THREE.RingGeometry(a - 0.2, a / Math.cos(Math.PI / 8) + 0.4, 8, 1, Math.PI / 8), M.tileTurq);
  ledge.rotation.x = Math.PI / 2;
  ledge.position.y = H0;
  cham.add(ledge);
  const bay = shahDrumBay(true);
  const dIn = new THREE.MeshStandardMaterial({ map: T.toTex(bay.map, { repeat: [16, 1] }), emissiveMap: T.toTex(bay.glow, { repeat: [16, 1] }), emissive: 0xfff0c8, emissiveIntensity: 1.2, roughness: 0.4, side: THREE.BackSide });
  cham.add(G.drum(a + 0.1, 4.5, dIn, { seg: 64, y: H0 }));
  const inner = T.lotfollahDomeInteriorCanvas({
    around: 24,
    bgParams: { ground: '#173f7c', vine: '#f0e8d0', vine2: '#e2b43c', leaf: '#2fa9b8', flower: '#f4efe2', flowerCore: '#e2b43c' },
    netOuter: '#e2b43c',
    netInner: '#f4efe2',
    apex: '#fff4c8',
  });
  const idome = new THREE.Mesh(new THREE.SphereGeometry(a + 0.1, 96, 40, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: T.toTex(inner, { wrap: false }), roughness: 0.45, side: THREE.BackSide }));
  idome.material.map.wrapS = THREE.RepeatWrapping;
  idome.position.y = H0 + 4.5;
  cham.add(idome);
  const lamp = new THREE.PointLight(0xffd6a0, 80, 50, 1.5);
  lamp.position.set(0, 14, 0);
  cham.add(lamp);
  // exterior: roof, outer drum, bulbous turquoise dome
  {
    const s = new THREE.Shape();
    s.moveTo(-off, -off);
    s.lineTo(off, -off);
    s.lineTo(off, off);
    s.lineTo(-off, off);
    s.closePath();
    const h = new THREE.Path();
    h.absarc(0, 0, a + 0.4, 0, Math.PI * 2, true);
    s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 32 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, wallH, 0);
    const m = new THREE.Mesh(g, M.roof);
    m.castShadow = m.receiveShadow = true;
    cham.add(m);
    // ring closing the gap between the inner drum and the outer drum wall
    const r = new THREE.Mesh(new THREE.RingGeometry(a + 0.1, dR + 0.1, 64), M.brick);
    r.rotation.x = Math.PI / 2;
    r.position.y = H0 + 4.5;
    cham.add(r);
  }
  const ob = shahDrumBay(false);
  const dOut = new THREE.MeshStandardMaterial({ map: T.toTex(ob.map, { repeat: [16, 1] }), roughness: 0.4 });
  cham.add(G.drum(dR, 10, dOut, { seg: 64, y: wallH + 0.5 }));
  cham.add(G.drum(dR + 0.06, 1.6, M.bandDrumShah, { seg: 64, y: wallH + 0.5 + 8.4 }));
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(dR + 0.4, dR + 0.06, 0.5, 64, 1, true), M.tileYellow);
  lip.position.y = wallH + 10.75;
  cham.add(lip);
  const dome = new THREE.Mesh(G.domeGeometry(dR + 0.2, 15.2, { bulge: 1.075, point: 0.16, radial: 96 }), M.domeShah);
  dome.position.y = wallH + 11;
  dome.castShadow = true;
  cham.add(dome);
  const fin = G.finial(1.3, M.gold);
  fin.position.y = wallH + 11 + 15.2 + 0.8;
  cham.add(fin);

  // shabestans (winter prayer halls) with roofs of small domes
  for (const sg of [-1, 1]) {
    const x = sg * (off + 9);
    const b = G.box(18, 12, 36, M.brick, x, 0, D, { uvScale: 2 });
    cg.add(b);
    const dg = new THREE.SphereGeometry(2.4, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    const im = new THREE.InstancedMesh(dg, M.roof, 18);
    let n = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) im.setMatrixAt(n++, new THREE.Matrix4().makeTranslation(x - 6 + i * 6, 12, D - 15 + j * 6));
    cg.add(im);
  }

  // ================================================= madrasas (SE & SW), with trees and pools
  for (const sg of [-1, 1]) {
    const mx = sg * 47,
      mz = 59;
    const mg = new THREE.Group();
    mg.position.set(mx, 0, mz);
    cg.add(mg);
    const iv = 9,
      iu = 19;
    const mspec = { H: 10, story: 5, lower: { w: 3, spring: 2.8, rise: 1.4, depth: 2 }, upper: { w: 2.8, sill: 5.4, spring: 7.4, rise: 1.3, depth: 2.2 } };
    const mface = T.bayFaceCanvas({ W: 4.75, H: 10, px: 48, brick: M.canvas.brickPale, spandrel: M.canvas.arabTurq, arches: [{ pts: G.archOpening(3, 2.8, 1.4) }, { pts: G.archOpening(2.8, 7.4, 1.3, 5.4) }] });
    const ma = buildArcade({
      segments: [
        { a: [iv, -iu], b: [-iv, -iu] },
        { a: [-iv, -iu], b: [-iv, iu] },
        { a: [-iv, iu], b: [iv, iu] },
        { a: [iv, iu], b: [iv, -iu] },
      ],
      spec: mspec,
      materials: [new THREE.MeshStandardMaterial({ map: T.toTex(mface, { wrap: false }), roughness: 0.6 }), M.brick, M.plaster, M.door, M.plaster],
      targetBay: 4.75,
      colliderH: 0,
    });
    ma.meshes.forEach((m) => mg.add(m));
    const ov = iv + 5,
      ou = iu + 5;
    for (const [x0, z0, x1, z1] of [
      [-ov, -ou, ov, -ou],
      [ov, -ou, ov, ou],
      [ov, ou, -ov, ou],
      [-ov, ou, -ov, -ou],
    ]) {
      mg.add(G.segWall(x0, z0, x1, z1, 1, 10.6, M.brick));
    }
    for (const [x0, z0, w, d] of [
      [-ov, -ou, 2 * ov, ou - iu],
      [-ov, iu, 2 * ov, ou - iu],
      [-ov, -iu, ov - iv, 2 * iu],
      [iv, -iu, ov - iv, 2 * iu],
    ])
      mg.add(G.box(w, 0.4, d, M.roof, x0 + w / 2, 10.2, z0 + d / 2));
    const floorM = G.plane(2 * iv, 2 * iu, M.paving, 3);
    floorM.rotation.x = -Math.PI / 2;
    floorM.position.y = 0.05;
    mg.add(floorM);
    const pool = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 7), M.poolStone);
    pool.position.y = 0.2;
    mg.add(pool);
    const pw = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6.4), M.waterCheap);
    pw.rotation.x = -Math.PI / 2;
    pw.position.y = 0.41;
    mg.add(pw);
    for (const [tx, tz] of [
      [-4.5, -10],
      [4.5, -10],
      [-4.5, 10],
      [4.5, 10],
    ]) {
      W.treeSpots = W.treeSpots || [];
      const v = new THREE.Vector3(tx, 0, tz);
      mg.updateMatrixWorld(true);
      v.applyMatrix4(mg.matrixWorld);
      W.treeSpots.push({ x: v.x, z: v.z, s: 1.6 });
    }
  }

  // ================================================= infill between recess and courtyard
  {
    // two roof slabs flanking the entrance axis (portal niche, vestibule and passage stay open)
    const west = [
      [-60, 285],
      [-40, 270],
      [-13, 270],
      [-10, 273],
      [-10, 298],
      [-60, 300],
    ];
    const east = [
      [10, 273],
      [13, 270],
      [40, 270],
      [40, 300],
      [18, 320],
      [10, 312],
    ];
    for (const pts of [west, east]) root.add(G.slab(pts, 12.4, 0.4, M.roof, 3));
  }

  // ================================================= zones & minimap
  cg.updateMatrixWorld(true);
  const inv = cg.matrixWorld.clone().invert();
  const loc = (p) => new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(inv);
  W.zones.push({
    id: 'shahDome',
    audio: 'shahDome',
    place: 'shahDome',
    test: (p) => {
      const l = loc(p);
      return Math.abs(l.x) < a + 0.5 && Math.abs(l.z - D) < a + 0.5 && p.y < 40;
    },
  });
  W.zones.push({
    id: 'shahQibla',
    audio: 'shahCourt',
    place: 'shahQibla',
    test: (p) => {
      const l = loc(p);
      return Math.abs(l.x) < iw.sw / 2 && l.z > hu - 3 && l.z < hu + qibla.depth + 1 && p.y < 34;
    },
  });
  W.zones.push({
    id: 'shahCourt',
    audio: 'shahCourt',
    place: 'shahCourt',
    test: (p) => {
      const l = loc(p);
      return Math.abs(l.x) < hv + 1 && Math.abs(l.z) < hu + 8 && p.y < 30;
    },
  });
  W.zones.push({
    id: 'shahVest',
    audio: 'shahCourt',
    place: 'shahVestibule',
    test: (p) => Math.abs(p.x) < 9 && p.z > SHAH.portalZ - pnb - 0.5 && p.z < 312 && p.y < 20,
  });
  W.zones.push({
    id: 'shahPortal',
    audio: 'square',
    place: 'shahPortal',
    test: (p) => Math.abs(p.x) < 13 && p.z > 256 && p.z < SHAH.portalZ - pnb && p.y < 30,
  });
  const rect = (x0, z0, x1, z1) => [cgToWorld(x0, z0), cgToWorld(x1, z0), cgToWorld(x1, z1), cgToWorld(x0, z1)];
  W.footprints.push({ color: '#6c5b43', pts: rect(-outV, -outU, outV, outU) });
  W.footprints.push({ color: '#b39f79', pts: rect(-hv, -hu, hv, hu) });
  W.footprints.push({ color: '#6c5b43', pts: rect(-off - 18, D - 18, off + 18, D + 18) });
  for (const sg of [-1, 1]) W.footprints.push({ color: '#6c5b43', pts: rect(sg * 47 - 14, 59 - 24, sg * 47 + 14, 59 + 24) });
  W.footprints.push({ color: '#3fa0b8', pts: Array.from({ length: 24 }, (_, i) => cgToWorld(dR * Math.cos((i / 24) * 6.283), D + dR * Math.sin((i / 24) * 6.283))) });
  W.footprints.push({ color: '#6c5b43', pts: [[-9, SHAH.portalZ], [9, SHAH.portalZ], [9, 298], [-9, 298]] });
  W.footprints.push({ color: '#2f6fa8', pts: [[-PW / 2, SHAH.portalZ - 0.5], [PW / 2, SHAH.portalZ - 0.5], [PW / 2, SHAH.portalZ + 2], [-PW / 2, SHAH.portalZ + 2]] });
  W.shahDomeWorld = cgToWorld(0, D);
  W.shahCourtWorld = cgToWorld(0, 0);

  return { gap: { side: 'south', recess: SHAH.recess }, cg };
}

// drum bay for the Shah Mosque: blue tiles, arched window with grille
function shahDrumBay(interior) {
  const w = 256,
    h = interior ? 200 : 460;
  const m = document.createElement('canvas');
  m.width = w;
  m.height = h;
  const g = document.createElement('canvas');
  g.width = w;
  g.height = h;
  const x = m.getContext('2d'),
    y = g.getContext('2d');
  const bg = interior ? '#173f7c' : '#1f4f95';
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  // small arabesque dots
  const r = T.rng(interior ? 3 : 4);
  for (let i = 0; i < 180; i++) {
    x.fillStyle = r() < 0.5 ? '#e2b43c' : '#f4efe2';
    x.beginPath();
    x.arc(r() * w, r() * h, 1.5 + r() * 2, 0, 6.283);
    x.fill();
  }
  y.fillStyle = '#000';
  y.fillRect(0, 0, w, h);
  const ww = w * 0.44,
    top = h * (interior ? 0.12 : 0.18),
    bot = h * (interior ? 0.9 : 0.72);
  const cx = w / 2;
  const path = (ctx, inset = 0) => {
    ctx.beginPath();
    ctx.moveTo(cx - ww / 2 + inset, bot);
    ctx.lineTo(cx - ww / 2 + inset, top + ww * 0.5);
    ctx.quadraticCurveTo(cx - ww / 2 + inset, top + inset, cx, top + inset - ww * 0.08);
    ctx.quadraticCurveTo(cx + ww / 2 - inset, top + inset, cx + ww / 2 - inset, top + ww * 0.5);
    ctx.lineTo(cx + ww / 2 - inset, bot);
    ctx.closePath();
  };
  x.lineWidth = 14;
  x.strokeStyle = '#2fa9b8';
  path(x, -8);
  x.stroke();
  x.lineWidth = 4;
  x.strokeStyle = '#f4efe2';
  path(x, -15);
  x.stroke();
  path(x);
  x.fillStyle = '#20180f';
  x.fill();
  path(y);
  y.fillStyle = interior ? '#fff0c8' : '#000';
  y.fill();
  for (const ctx of [x, y]) {
    ctx.save();
    path(ctx);
    ctx.clip();
    ctx.strokeStyle = ctx === x ? '#d8c8a0' : '#000';
    ctx.lineWidth = 3;
    for (let k = -20; k < 20; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * 13, top);
      ctx.lineTo(cx + k * 13 + (bot - top), bot);
      ctx.moveTo(cx + k * 13, top);
      ctx.lineTo(cx + k * 13 - (bot - top), bot);
      ctx.stroke();
    }
    ctx.restore();
  }
  return { map: m, glow: g };
}
