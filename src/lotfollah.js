// Sheikh Lotfollah Mosque (1603–1619), east side of the square.
// Portal in a rectangular notch of the arcade; a bent corridor leads left (NE), then
// right (SE) around the prayer chamber, which is rotated 45° toward the qibla (SW).
// Chamber: 19 m square, 8 great arches, 16-window drum, single shallow dome.
import * as THREE from 'three';
import * as G from './geom.js';
import * as T from './textures.js';

const S2 = Math.SQRT1_2;
// local frame: façade faces +z (west), +x = south. Origin = portal façade centre.
export const LOTF = { x: 88, z: 62, notchDepth: 8, notchW: 20 };

export function buildLotfollah(M, W) {
  const grp = new THREE.Group();
  grp.position.set(LOTF.x, 0, LOTF.z);
  grp.rotation.y = -Math.PI / 2;
  W.scene.add(grp);
  const col = (m) => (Array.isArray(m) ? m.forEach((x) => W.colliders.push(x)) : W.colliders.push(m));

  // ------------------------------------------------ portal
  const PW = 14,
    PH = 18.5,
    aw = 7.4,
    asp = 9.2,
    ar = 5.2;
  const archPts = G.archOpening(aw, asp, ar);
  const facade = T.facadeCanvas({ W: PW, H: PH, archPts, field: M.canvas.arabDeep, band: M.canvas.calligLotf, bandW: 1.1, dado: 1.9, px: 60, fieldScale: 1.8 });
  const facadeMat = new THREE.MeshStandardMaterial({ map: T.toTex(facade, { wrap: false }), roughness: 0.33 });
  const portal = G.pishtaq({
    W: PW,
    H: PH,
    archW: aw,
    archSpring: asp,
    archRise: ar,
    frameDepth: 1.4,
    facadeMat,
    backMat: M.brick,
    revealMat: M.tileLapis,
    nicheWallMat: M.tileDeep,
    hoodMat: M.muqarnas,
    doorMat: M.door,
    door: { w: 2.6, spring: 3.2, rise: 1.3 },
    tiers: 9,
  });
  grp.add(portal.group);
  col(portal.colliders);
  const nicheBack = -portal.nicheDepth;
  // parapet / crest on the portal
  grp.add(G.box(PW, 0.6, 1.6, M.tileTurq, 0, PH, -0.8));
  // brick side panels on the notch back wall + notch side walls handled by the square arcade
  for (const sg of [-1, 1]) {
    const w = (LOTF.notchW - PW) / 2;
    const b = G.box(w, 12, 1.4, M.brickPale, sg * (PW / 2 + w / 2), 0, -0.7, { uvScale: 2 });
    grp.add(b);
    col(b);
  }
  // mass behind the portal (piers either side of the niche), roofed
  const R = aw / 2;
  for (const sg of [-1, 1]) {
    const pier = G.box(PW / 2 - R, PH, -nicheBack - 1.4, M.brick, sg * (R + (PW / 2 - R) / 2), 0, nicheBack / 2 - 0.7, { uvScale: 2 });
    grp.add(pier);
  }
  grp.add(G.box(aw, PH - asp - ar, -nicheBack - 1.4, M.brick, 0, asp + ar, nicheBack / 2 - 0.7, { uvScale: 2 }));
  // marble benches (sakku) either side of the niche
  for (const sg of [-1, 1]) grp.add(G.box(1.2, 0.55, 2.4, M.marble, sg * (R - 0.9), 0, -2.4));

  // ------------------------------------------------ chamber geometry
  const C = new THREE.Vector2(6, -30); // chamber centre (local x,z)
  const a = 9.5; // inner half-size (19 m)
  const t = 2; // wall thickness
  const nNW = new THREE.Vector2(-S2, S2),
    nNE = new THREE.Vector2(-S2, -S2),
    dSE = new THREE.Vector2(S2, -S2),
    dNE = nNE;
  const P = (base, k1, v1, k2, v2) => base.clone().addScaledVector(v1, k1).addScaledVector(v2, k2);
  const cw = 3.5; // corridor width
  const ch = 5.2; // corridor height
  const off = a + t; // 11.5 chamber outer face
  const offO = off + cw; // corridor outer wall line

  const corridorMatIn = M.tileStarBlue;
  // passage from portal niche door straight east (−z local)
  {
    const zA = -16.4; // where west wall meets corridor A outer wall
    const zB = -18.1; // east wall meets chamber NW wall
    const w1 = G.segWall(-1.6, nicheBack, -1.6, zA, 0.6, ch, M.plaster, { side: -1 });
    const w2 = G.segWall(1.6, nicheBack, 1.6, zB, 0.6, ch, M.plaster, { side: 1 });
    grp.add(w1, w2);
    col([w1, w2]);
    // tiled dado on the passage walls
    grp.add(G.segWall(-1.57, nicheBack, -1.57, zA, 0.06, 1.8, corridorMatIn));
    grp.add(G.segWall(1.57, nicheBack, 1.57, zB, 0.06, 1.8, corridorMatIn));
    grp.add(G.slab([[-1.9, nicheBack], [1.9, nicheBack], [1.9, zB], [-1.9, zA]], ch + 0.4, 0.4, M.plaster));
  }
  // corridor A (heading NE along chamber NW wall) and B (heading SE along NE wall)
  const tA0 = -4.24,
    tA1 = 15;
  const sB0 = -15,
    sB1 = 2.5;
  const aOuter0 = P(C, offO, nNW, tA0, dNE),
    aOuter1 = P(C, offO, nNW, tA1, dNE);
  const bOuter0 = P(C, offO, nNE, sB0, dSE),
    bOuter1 = P(C, offO, nNE, sB1, dSE);
  for (const [p0, p1] of [
    [aOuter0, aOuter1],
    [bOuter0, bOuter1],
  ]) {
    const w = G.segWall(p0.x, p0.y, p1.x, p1.y, 0.8, ch + 3, M.plaster);
    grp.add(w);
    col(w);
    // lower tile dado on the inner face (approximate: both faces)
    const d = G.segWall(p0.x, p0.y, p1.x, p1.y, 0.9, 1.9, corridorMatIn);
    grp.add(d);
  }
  // end cap of corridor B beyond the chamber door
  {
    const p0 = P(C, off, nNE, sB1, dSE),
      p1 = P(C, offO, nNE, sB1, dSE);
    const w = G.segWall(p0.x, p0.y, p1.x, p1.y, 0.8, ch + 3, M.plaster);
    grp.add(w);
    col(w);
  }
  // corridor ceilings (vault surfaces approximated by flat painted ceilings)
  {
    const A0 = P(C, off, nNW, -8, dNE),
      A1 = P(C, off, nNW, tA1, dNE),
      A2 = P(C, offO + 0.4, nNW, tA1 + 0.4, dNE),
      A3 = P(C, offO + 0.4, nNW, -8, dNE);
    grp.add(G.slab([A0, A1, A2, A3].map((v) => [v.x, v.y]), ch, 0.3, M.painted, 3));
    const B0 = P(C, off, nNE, -15, dSE),
      B1 = P(C, off, nNE, sB1 + 0.4, dSE),
      B2 = P(C, offO + 0.4, nNE, sB1 + 0.4, dSE),
      B3 = P(C, offO + 0.4, nNE, -15.4, dSE);
    grp.add(G.slab([B0, B1, B2, B3].map((v) => [v.x, v.y]), ch, 0.3, M.painted, 3));
  }
  // small high windows letting light into the corridors (emissive grilles)
  const winMat = new THREE.MeshStandardMaterial({ color: 0x302418, emissive: 0xffd49a, emissiveIntensity: 0.9 });
  for (const [base, n, dvec, ts] of [
    [C, nNW, dNE, [0, 6, 12]],
    [C, nNE, dSE, [-10, -4]],
  ]) {
    for (const tt of ts) {
      const p = P(base, offO - 0.42, n, tt, dvec);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), winMat);
      w.position.set(p.x, ch - 1.3, p.y);
      w.lookAt(p.x - n.x, ch - 1.3, p.y - n.y);
      grp.add(w);
    }
  }

  // ------------------------------------------------ prayer chamber (rotated 45°)
  const cham = new THREE.Group();
  cham.position.set(C.x, 0, C.y);
  cham.rotation.y = Math.PI / 4; // chamber +z = SW (mihrab), -z = NE (door)
  grp.add(cham);
  const H0 = 15.5; // top of the octagonal zone
  // outer brick walls (seen from corridors and outside)
  const doorW = 3.2,
    doorH = 4.6;
  const wallH = H0 + 0.5;
  const walls = [
    G.segWall(-off, off - t / 2, off, off - t / 2, t, wallH, M.brick), // SW
    G.segWall(off - t / 2, -off, off - t / 2, off, t, wallH, M.brick), // SE
    G.segWall(-off + t / 2, -off, -off + t / 2, off, t, wallH, M.brick), // NW
    G.segWall(-off, -off + t / 2, -doorW / 2, -off + t / 2, t, wallH, M.brick), // NE left
    G.segWall(doorW / 2, -off + t / 2, off, -off + t / 2, t, wallH, M.brick), // NE right
    G.segWall(-doorW / 2, -off + t / 2, doorW / 2, -off + t / 2, t, wallH - doorH, M.brick, { y0: doorH }),
  ];
  walls.forEach((w) => cham.add(w));
  col(walls.slice(0, 5));

  // octagon of 8 great arches (inner faces)
  const fw = 2 * a * Math.tan(Math.PI / 8); // 7.87 m
  const oAw = 5.8,
    oSp = 7.4,
    oRi = 4.7;
  const oPts = G.archOpening(oAw, oSp, oRi);
  const panelCanvas = T.facadeCanvas({
    W: fw,
    H: H0,
    archPts: oPts,
    field: T.arabesqueCanvas({ size: 512, ground: '#b98a4e', vine: '#f1e3bf', vine2: '#2f8d9c', leaf: '#dcb35d', flower: '#f4ead0', flowerCore: '#1f5f8f', cells: 1, tileGrid: 0, seed: 77 }),
    fieldScale: 1.4,
    archFill: M.canvas.arabDeep,
    archFillScale: 2.6,
    band: M.canvas.calligLotf,
    bandW: 0.85,
    dado: 1.7,
    px: 70,
    frameColor: '#2a98a8',
  });
  const panelMat = new THREE.MeshStandardMaterial({ map: T.toTex(panelCanvas, { wrap: false }), roughness: 0.55 });
  const mihrabCanvas = T.facadeCanvas({ W: 3.4, H: 5.6, archPts: G.archOpening(2.2, 3.2, 1.3, 0.4), field: M.canvas.arabDeep, band: M.canvas.calligBasmala, bandW: 0.42, px: 110, fieldScale: 0.8 });
  const mihrabMat = new THREE.MeshStandardMaterial({ map: T.toTex(mihrabCanvas, { wrap: false }), roughness: 0.3 });
  for (let k = 0; k < 8; k++) {
    const al = (k * Math.PI) / 4;
    const dir = new THREE.Vector2(Math.sin(al), Math.cos(al));
    const place = (obj, dist) => {
      obj.position.set(dir.x * dist, 0, dir.y * dist);
      obj.rotation.y = al + Math.PI;
      cham.add(obj);
    };
    if (k % 2 === 0) {
      const openings = [];
      if (k === 4) openings.push({ x: 0, w: doorW, spring: doorH - 1.1, rise: 1.1 });
      if (k === 0) openings.push({ x: 0, w: 2.2, spring: 3.2, rise: 1.3, sill: 0.4 });
      const face = new THREE.Mesh(G.archedWall(fw, H0, 0.25, openings), [panelMat, M.brick, M.tileLapis]);
      face.receiveShadow = true;
      place(face, a - 0.04);
      if (k !== 4) col(face);
      if (k === 0) {
        // mihrab: tiled niche with muqarnas hood projecting slightly from the qibla wall
        const mh = G.pishtaq({ W: 3.4, H: 5.6, archW: 2.2, archSpring: 3.2 + 0.4, archRise: 1.3, frameDepth: 0.3, facadeMat: mihrabMat, backMat: M.tileDeep, revealMat: M.tileLapis, nicheWallMat: M.tileDeep, hoodMat: M.muqarnas, door: null, tiers: 5 });
        place(mh.group, a - 0.34);
        col(mh.colliders);
      }
    } else {
      // corner squinch: arch with a muqarnas niche behind
      const sq = G.pishtaq({ W: fw, H: H0, archW: oAw, archSpring: oSp, archRise: oRi, frameDepth: 0.3, facadeMat: panelMat, backMat: M.brick, revealMat: M.tileTurq, nicheWallMat: M.tileYellow, hoodMat: M.muqarnasCream, door: null, tiers: 7 });
      place(sq.group, a - 0.04);
      col(sq.colliders);
    }
  }
  // floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * a, 2 * a), M.pavingLight);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.08;
  floor.receiveShadow = true;
  cham.add(floor);
  // ledge closing the octagon to the drum
  const ledge = new THREE.Mesh(new THREE.RingGeometry(9.3, 11.2, 8, 1, Math.PI / 8), M.tileTurq);
  ledge.rotation.x = Math.PI / 2;
  ledge.position.y = H0;
  cham.add(ledge);
  // inner drum with 16 glowing grilled windows
  const inBay = drumBay({ interior: true });
  const inMat = new THREE.MeshStandardMaterial({ map: T.toTex(inBay.map, { repeat: [16, 1] }), emissiveMap: T.toTex(inBay.glow, { repeat: [16, 1] }), emissive: 0xffe0a0, emissiveIntensity: 1.3, roughness: 0.5, side: THREE.BackSide });
  const dIn = G.drum(9.6, 3.2, inMat, { seg: 64, y: H0 });
  cham.add(dIn);
  // inner dome: concentric lemon medallions shrinking to the apex
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9.6, 96, 40, 0, Math.PI * 2, 0, Math.PI / 2), M.lotfInterior);
  dome.scale.y = 0.86;
  dome.position.y = H0 + 3.2;
  cham.add(dome);
  // apex sunburst medallion (the "peacock")
  {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    for (let r = 256; r > 0; r -= 4) {
      const f = r / 256;
      x.fillStyle = `hsl(${40 + 10 * f},${70 - 20 * f}%,${80 - 30 * f}%)`;
      x.beginPath();
      x.arc(256, 256, r, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = '#2b8c9c';
    x.lineWidth = 5;
    for (let k = 0; k < 32; k++) {
      const an = (k / 32) * Math.PI * 2;
      x.beginPath();
      x.moveTo(256 + Math.cos(an) * 40, 256 + Math.sin(an) * 40);
      x.quadraticCurveTo(256 + Math.cos(an + 0.2) * 150, 256 + Math.sin(an + 0.2) * 150, 256 + Math.cos(an) * 250, 256 + Math.sin(an) * 250);
      x.stroke();
    }
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshStandardMaterial({ map: T.toTex(c, { wrap: false }), emissive: 0x6a4a18, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
    m.rotation.x = Math.PI / 2;
    m.position.y = H0 + 3.2 + 9.6 * 0.86 - 0.05;
    cham.add(m);
  }
  // warm interior light
  const lamp = new THREE.PointLight(0xffc98a, 60, 40, 1.6);
  lamp.position.set(0, 11, 0);
  cham.add(lamp);
  lamp.userData.day = true;
  W.updaters.push(() => {
    // always on: the chamber is lit by its windows by day and lamps by night
  });

  // ------------------------------------------------ exterior: roof, drum, dome
  const roofY = H0 + 0.5;
  {
    // square roof on the chamber with a hole for the drum
    const s = new THREE.Shape();
    s.moveTo(-off, -off);
    s.lineTo(off, -off);
    s.lineTo(off, off);
    s.lineTo(-off, off);
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, 9.4, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 32 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, roofY - 0.5, 0);
    const m = new THREE.Mesh(g, M.roof);
    m.castShadow = m.receiveShadow = true;
    cham.add(m);
    // low parapet
    for (const [x0, z0, x1, z1] of [
      [-off, -off, off, -off],
      [off, -off, off, off],
      [off, off, -off, off],
      [-off, off, -off, -off],
    ])
      cham.add(G.segWall(x0, z0, x1, z1, 0.5, 0.9, M.brick, { y0: roofY }));
  }
  const outBay = drumBay({ interior: false });
  const drumOutMat = new THREE.MeshStandardMaterial({ map: T.toTex(outBay.map, { repeat: [16, 1] }), roughness: 0.6 });
  const drumH = 6.2;
  cham.add(G.drum(11, drumH, drumOutMat, { seg: 64, y: roofY }));
  // top of drum: calligraphy band and moulding
  const band = G.drum(11.05, 1.1, M.bandDrum, { seg: 64, y: roofY + drumH - 1.1 });
  cham.add(band);
  const lipGeo = new THREE.CylinderGeometry(11.35, 11.05, 0.35, 64, 1, true);
  const lip = new THREE.Mesh(lipGeo, M.tileTurq);
  lip.position.y = roofY + drumH + 0.17;
  cham.add(lip);
  // inner lid so the drum reads solid from above if the dome is seen through gaps
  const domeOut = new THREE.Mesh(G.domeGeometry(11.1, 10.5, { bulge: 1.0, point: 0.08, radial: 96 }), M.domeLotf);
  domeOut.position.y = roofY + drumH + 0.34;
  domeOut.castShadow = true;
  cham.add(domeOut);
  const fin = G.finial(0.9, M.gold);
  fin.position.y = roofY + drumH + 0.34 + 10.5 + 10.5 * 0.08 * 0.35;
  cham.add(fin);

  // block massing around corridors, seen from above
  {
    const pts = [
      [-13, nicheBack - 0.3],
      [-13, -48],
      [25, -48],
      [25, nicheBack - 0.3],
    ];
    // roof over the corridors, with a diamond-shaped hole where the chamber rises
    const sh = new THREE.Shape();
    pts.forEach((p, i) => (i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1])));
    sh.closePath();
    const hole = new THREE.Path();
    const hd = off * Math.SQRT2 - 0.2;
    [
      [C.x + hd, C.y],
      [C.x, C.y - hd],
      [C.x - hd, C.y],
      [C.x, C.y + hd],
    ].forEach((p, i) => (i ? hole.lineTo(p[0], -p[1]) : hole.moveTo(p[0], -p[1])));
    hole.closePath();
    sh.holes.push(hole);
    const rg = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false });
    rg.rotateX(-Math.PI / 2);
    rg.translate(0, 8.2, 0);
    const r = new THREE.Mesh(rg, M.roof);
    r.castShadow = r.receiveShadow = true;
    grp.add(r);
    // outer walls of the block
    const oW = [
      [-13, nicheBack - 0.3, -13, -48],
      [-13, -48, 25, -48],
      [25, -48, 25, nicheBack - 0.3],
    ];
    for (const [x0, z0, x1, z1] of oW) grp.add(G.segWall(x0, z0, x1, z1, 0.8, 8.6, M.brick));
    // small roof domes over the corridor bays
    for (const tt of [-2, 4, 10]) {
      const p = P(C, off + cw / 2, nNW, tt, dNE);
      const d = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.roof);
      d.position.set(p.x, 8.6, p.y);
      grp.add(d);
    }
  }

  // paved floor under the portal niche and corridors
  {
    const f = G.plane(38, 48 + nicheBack, M.pavingLight, 2.5);
    f.rotation.x = -Math.PI / 2;
    f.position.set(6, 0.04, (nicheBack - 48) / 2);
    f.receiveShadow = true;
    grp.add(f);
  }

  // ------------------------------------------------ zones & minimap
  const inv = new THREE.Matrix4();
  grp.updateMatrixWorld(true);
  inv.copy(grp.matrixWorld).invert();
  const toLocal = (p) => new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(inv);
  W.zones.push({
    id: 'lotfChamber',
    audio: 'lotf',
    place: 'lotfChamber',
    test: (p) => {
      const l = toLocal(p);
      const dx = l.x - C.x,
        dz = l.z - C.y;
      return Math.abs(dx) + Math.abs(dz) < (a + 0.5) * Math.SQRT2 && p.y < 30;
    },
  });
  W.zones.push({
    id: 'lotfCorridor',
    audio: 'lotf',
    place: 'lotfCorridor',
    test: (p) => {
      const l = toLocal(p);
      return l.z < nicheBack + 0.3 && l.z > -48 && l.x > -14 && l.x < 24 && p.y < 7;
    },
  });
  W.zones.push({
    id: 'lotfPortal',
    audio: 'square',
    place: 'lotfPortal',
    test: (p) => {
      const l = toLocal(p);
      return l.z < 6 && l.z > nicheBack && Math.abs(l.x) < 10 && p.y < 20;
    },
  });
  const wp = (x, z) => {
    const v = new THREE.Vector3(x, 0, z).applyMatrix4(grp.matrixWorld);
    return [v.x, v.z];
  };
  W.footprints.push({ color: '#7a6a4f', pts: [wp(-13, 0), wp(-13, -48), wp(25, -48), wp(25, 0)] });
  W.footprints.push({ color: '#e0cfa3', pts: Array.from({ length: 24 }, (_, i) => wp(C.x + 11 * Math.cos((i / 24) * Math.PI * 2), C.y + 11 * Math.sin((i / 24) * Math.PI * 2))) });
  W.footprints.push({ color: '#2f6fa8', pts: [wp(-PW / 2, 0), wp(PW / 2, 0), wp(PW / 2, -1.5), wp(-PW / 2, -1.5)] });

  // gap in the east arcade for the portal notch
  return { gap: { side: 'east', from: LOTF.z - LOTF.notchW / 2, to: LOTF.z + LOTF.notchW / 2, notch: LOTF.notchDepth }, group: grp, chamberWorld: wp(C.x, C.y) };
}

// One bay of the 16-sided drum: arched grilled window, tile frame; `glow` = emissive mask
function drumBay({ interior }) {
  const w = 256,
    h = interior ? 180 : 360;
  const m = document.createElement('canvas');
  m.width = w;
  m.height = h;
  const g = document.createElement('canvas');
  g.width = w;
  g.height = h;
  const x = m.getContext('2d'),
    y = g.getContext('2d');
  x.fillStyle = interior ? '#c7954f' : '#c9a067';
  x.fillRect(0, 0, w, h);
  if (!interior) {
    // brick coursing
    x.strokeStyle = 'rgba(120,80,40,0.35)';
    for (let yy = 0; yy < h; yy += 9) {
      x.beginPath();
      x.moveTo(0, yy);
      x.lineTo(w, yy);
      x.stroke();
    }
  }
  y.fillStyle = '#000';
  y.fillRect(0, 0, w, h);
  const ww = w * 0.46,
    top = h * (interior ? 0.14 : 0.2),
    bot = h * (interior ? 0.88 : 0.8);
  const cx = w / 2;
  const path = (ctx, inset = 0) => {
    ctx.beginPath();
    ctx.moveTo(cx - ww / 2 + inset, bot);
    ctx.lineTo(cx - ww / 2 + inset, top + ww * 0.55);
    ctx.quadraticCurveTo(cx - ww / 2 + inset, top + inset, cx, top + inset - ww * 0.05);
    ctx.quadraticCurveTo(cx + ww / 2 - inset, top + inset, cx + ww / 2 - inset, top + ww * 0.55);
    ctx.lineTo(cx + ww / 2 - inset, bot);
    ctx.closePath();
  };
  // tile frame
  x.lineWidth = 16;
  x.strokeStyle = '#1d5f9a';
  path(x, -8);
  x.stroke();
  x.lineWidth = 5;
  x.strokeStyle = '#3fb3bf';
  path(x, -14);
  x.stroke();
  // grille
  path(x);
  x.fillStyle = '#2a2018';
  x.fill();
  path(y);
  y.save();
  y.clip();
  y.fillStyle = interior ? '#ffe2a8' : '#000';
  y.fillRect(0, 0, w, h);
  y.restore();
  // lattice (dark bars) drawn on both
  for (const ctx of [x, y]) {
    ctx.save();
    path(ctx);
    ctx.clip();
    ctx.strokeStyle = ctx === x ? (interior ? '#e8d6b0' : '#5a4630') : '#000';
    ctx.lineWidth = 3;
    for (let k = -20; k < 20; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * 14, top);
      ctx.lineTo(cx + k * 14 + (bot - top), bot);
      ctx.moveTo(cx + k * 14, top);
      ctx.lineTo(cx + k * 14 - (bot - top), bot);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (!interior) {
    // exterior panels between windows: turquoise tile strip
    x.fillStyle = '#2a8fa3';
    x.fillRect(0, 0, 10, h);
    x.fillRect(w - 10, 0, 10, h);
  } else {
    x.fillStyle = '#1f5f8f';
    x.fillRect(0, h - 10, w, 10);
  }
  return { map: m, glow: g };
}
