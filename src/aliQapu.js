// Ali Qapu palace, west side of the square, opposite Lotfollah.
// Gate block projecting ~8 m, the talar (28 x 16 m) at ~13.5 m with 18 wooden columns
// in 3 rows of 6 and a coffered ceiling, a copper-lined pool, the tower behind with a
// spiral stair, and the music room on the top floor with vase-shaped stucco cut-outs.
import * as THREE from 'three';
import * as G from './geom.js';
import * as T from './textures.js';

export const ALI = { x: -80, z: 63 };

export function buildAliQapu(M, W) {
  const grp = new THREE.Group();
  grp.position.set(ALI.x, 0, ALI.z);
  grp.rotation.y = Math.PI / 2; // local +z = east (into the square), local +x = north
  W.scene.add(grp);
  const col = (m) => (Array.isArray(m) ? m.forEach((x) => W.colliders.push(x)) : W.colliders.push(m));
  const floor = (m) => W.floors.push(m);

  const TF = 13.5; // talar floor
  const TR = 24.2; // talar ceiling
  const TOP = 37; // tower roof
  const MR = 28.8; // music room floor
  const gw = 5.5; // gate passage width
  const gh = 9; // gate passage height

  // ------------------------------------------------ front block (below talar)
  const frontCanvas = aliFrontCanvas(M);
  const frontMat = new THREE.MeshStandardMaterial({ map: T.toTex(frontCanvas, { wrap: false }), roughness: 0.85 });
  {
    const face = new THREE.Mesh(G.archedWall(28, TF - 0.1, 1.2, [{ x: 0, w: gw, spring: gh - 2.6, rise: 2.6 }]), [frontMat, M.brick, M.brickPale]);
    face.position.z = 8;
    face.castShadow = face.receiveShadow = true;
    grp.add(face);
    col(face);
    // block masses either side of the gate passage
    for (const sg of [-1, 1]) {
      const b = G.box(14 - gw / 2, TF - 0.45, 26.8 - 11, M.brick, sg * (gw / 2 + (14 - gw / 2) / 2), 0, -8 + (26.8 - 11) / 2 - 0.8 + 0.4, { uvScale: 2 });
      grp.add(b);
      col(b);
    }
    grp.add(G.box(gw, TF - gh - 0.45, 16, M.brick, 0, gh, 0, { uvScale: 2 }));
    // side walls of the talar block, painted with blind arches
    // only the part projecting into the square (in front of the arcade line) is visible
    const sideCanvas = T.facadeCanvas({ W: 8, H: TF - 0.45, archPts: G.archOpening(3.4, 5, 1.8), field: null, brick: M.canvas.brick, band: null, px: 30 });
    const sideMat = new THREE.MeshStandardMaterial({ map: T.toTex(sideCanvas, { wrap: false }), roughness: 0.9 });
    for (const sg of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(8, TF - 0.45), sideMat);
      p.position.set(sg * 14.02, (TF - 0.45) / 2, 4);
      p.rotation.y = (sg * Math.PI) / 2;
      grp.add(p);
    }
    // gate passage lining (with a doorway to the spiral stair on the south side) & vault
    const lining = [
      [gw / 2, 7, gw / 2, -19, 0, gh],
      [-gw / 2, 7, -gw / 2, -12.9, 0, gh],
      [-gw / 2, -15.1, -gw / 2, -19, 0, gh],
      [-gw / 2, -12.9, -gw / 2, -15.1, 3.2, gh],
    ];
    for (const [x0, z0, x1, z1, y0, y1] of lining) {
      const w = G.segWall(x0, z0, x1, z1, 0.3, y1 - y0, M.painted, { y0, side: x0 > 0 ? -1 : 1, unit: 3 });
      grp.add(w);
      col(w);
    }
    // short link from the passage doorway to the stair tower
    for (const z of [-12.9, -15.1]) {
      const w = G.segWall(-gw / 2, z, -4.1, z, 0.3, 3.2, M.plaster);
      grp.add(w);
      col(w);
    }
    const vg = new THREE.CylinderGeometry(gw / 2, gw / 2, 26, 16, 1, true, -Math.PI / 2, Math.PI);
    vg.rotateX(-Math.PI / 2);
    const vault = new THREE.Mesh(vg, new THREE.MeshStandardMaterial({ map: M.painted.map, roughness: 0.9, side: THREE.BackSide }));
    vault.position.set(0, gh - gw / 2, -6);
    grp.add(vault);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), M.door);
    door.position.set(0, gh / 2, -18.9);
    grp.add(door);
    const doorCol = G.box(gw, gh, 0.5, G.colliderMat, 0, 0, -18.8);
    grp.add(doorCol);
    col(doorCol);
    // stone plinth benches along the front
    for (const sg of [-1, 1]) grp.add(G.box(9, 0.9, 1.4, M.marble, sg * 8.5, 0, 8.7));
  }

  // ------------------------------------------------ tower shell
  {
    const tw = 20,
      tz0 = -19,
      tz1 = -8;
    // back and side walls, full height
    const walls = [G.segWall(-tw / 2, tz0, tw / 2, tz0, 1, TOP, M.brick), G.segWall(-tw / 2, tz0, -tw / 2, tz1, 1, TOP, M.brick), G.segWall(tw / 2, tz0, tw / 2, tz1, 1, TOP, M.brick)];
    walls.forEach((w) => grp.add(w));
    col(walls);
    // side wings up to the talar floor
    for (const sg of [-1, 1]) grp.add(G.box(4, TF - 0.05, 10.6, M.brick, sg * 12, 0, (tz0 + tz1) / 2 - 0.2, { uvScale: 2 }));
    // front wall above the talar (facing the talar) with the throne-room arch and stair door
    const fw = new THREE.Mesh(
      G.archedWall(tw, TOP - TF, 1, [
        { x: 0, w: 8, spring: 5.8, rise: 3.2 },
        { x: -7, w: 1.7, spring: 2.3, rise: 0.7 },
      ]),
      [new THREE.MeshStandardMaterial({ map: T.toTex(M.canvas.arabYellow, { repeat: [5, 6] }), roughness: 0.8 }), M.brick, M.painted],
    );
    fw.position.set(0, TF, tz1 + 0.01);
    grp.add(fw);
    col(fw);
    // upper façade seen above the talar roof: brick with arched windows
    const up = T.facadeCanvas({ W: tw, H: TOP - TR - 1.2, archPts: G.archOpening(3, 5, 1.6, 1.2), field: null, brick: M.canvas.brickPale, px: 30, band: M.canvas.calligIsfahan, bandW: 0.8 });
    const upMat = new THREE.MeshStandardMaterial({ map: T.toTex(up, { wrap: false }), roughness: 0.9 });
    const upP = new THREE.Mesh(new THREE.PlaneGeometry(tw, TOP - TR - 1.2), upMat);
    upP.position.set(0, TR + 1.2 + (TOP - TR - 1.2) / 2, tz1 + 0.53);
    grp.add(upP);
    // inside walls lined with painted plaster at talar and music levels
    // ground floor inside the tower: cross wall separating stair hall
    // floors
    const holeFloor = (y, tint) => {
      const s = new THREE.Shape();
      s.moveTo(-9.5, -18.5);
      s.lineTo(9.5, -18.5);
      s.lineTo(9.5, -8.5);
      s.lineTo(-9.5, -8.5);
      s.closePath();
      const h = new THREE.Path();
      h.absarc(-7, -14, 2.75, 0, Math.PI * 2, true);
      s.holes.push(h);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false, curveSegments: 20 });
      g.rotateX(Math.PI / 2);
      g.translate(0, y, 0);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
      const m = new THREE.Mesh(g, tint);
      m.receiveShadow = true;
      grp.add(m);
      floor(m);
      return m;
    };
    holeFloor(TF, M.pavingLight);
    holeFloor(MR, M.woodLight);
    // tower roof + parapet + rooftop pavilion
    grp.add(G.box(tw + 0.6, 0.6, 11.6, M.roof, 0, TOP, (tz0 + tz1) / 2));
    for (const [x0, z0, x1, z1] of [
      [-tw / 2, tz0, tw / 2, tz0],
      [tw / 2, tz0, tw / 2, tz1],
      [tw / 2, tz1, -tw / 2, tz1],
      [-tw / 2, tz1, -tw / 2, tz0],
    ])
      grp.add(G.segWall(x0, z0, x1, z1, 0.5, 1.1, M.brickPale, { y0: TOP + 0.6 }));
    const kiosk = new THREE.Group();
    for (const [x, z] of [
      [-2.5, -2.5],
      [2.5, -2.5],
      [-2.5, 2.5],
      [2.5, 2.5],
    ]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4, 8), M.woodLight);
      c.position.set(x, 2, z);
      kiosk.add(c);
    }
    const kr = G.box(6.6, 0.4, 6.6, M.wood, 0, 4, 0);
    kiosk.add(kr);
    const kd = new THREE.Mesh(G.domeGeometry(2.2, 2.4, { bulge: 1.05, point: 0.2, radial: 24 }), M.domeTurqPlain);
    kd.position.y = 4.4;
    kiosk.add(kd);
    const kf = G.finial(0.5, M.gold);
    kf.position.y = 6.9;
    kiosk.add(kf);
    kiosk.position.set(0, TOP + 0.6, -13.5);
    grp.add(kiosk);
  }

  // ------------------------------------------------ talar
  {
    const tl = new THREE.Group();
    tl.position.y = TF;
    grp.add(tl);
    const fl = G.box(28, 0.4, 16.4, M.pavingLight, 0, -0.4, 0, { uvScale: 2.5 });
    tl.add(fl);
    floor(fl);
    // 18 columns: 3 rows of 6
    const colH = TR - TF;
    const shaftG = new THREE.CylinderGeometry(0.26, 0.32, colH - 1.2, 8);
    const baseG = new THREE.CylinderGeometry(0.4, 0.46, 0.7, 12);
    const capG = new THREE.CylinderGeometry(0.75, 0.32, 0.9, 8);
    const xs = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5],
      zs = [7.2, 2.2, -2.8];
    const shafts = new THREE.InstancedMesh(shaftG, M.woodLight, 18);
    const bases = new THREE.InstancedMesh(baseG, M.marble, 18);
    const caps = new THREE.InstancedMesh(capG, M.gold, 18);
    let i = 0;
    for (const z of zs)
      for (const x of xs) {
        shafts.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0.35 + (colH - 1.2) / 2, z));
        bases.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0.35, z));
        caps.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, colH - 0.45, z));
        const c = G.box(0.7, 3, 0.7, G.colliderMat, x, 0, z);
        tl.add(c);
        col(c);
        i++;
      }
    for (const m of [shafts, bases, caps]) {
      m.castShadow = true;
      tl.add(m);
    }
    // beams and coffered ceiling
    for (const x of xs) tl.add(G.box(0.6, 0.7, 17, M.wood, x, colH - 0.3, 0));
    for (const z of zs) tl.add(G.box(29, 0.7, 0.6, M.wood, 0, colH, z));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(29, 17.5), M.woodCeiling);
    const uv = ceil.geometry.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 7, uv.getY(k) * 4);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, colH + 0.66, -0.1);
    tl.add(ceil);
    const roof = G.box(30, 1.1, 18.4, M.wood, 0, colH + 0.7, 0.2);
    roof.material = [M.wood, M.wood, M.roof, M.wood, M.wood, M.wood];
    tl.add(roof);
    // painted frieze under the eaves
    const frieze = new THREE.Mesh(new THREE.PlaneGeometry(30, 1.1), M.bandIsfahan);
    frieze.position.set(0, colH + 1.25, 9.42);
    tl.add(frieze);
    // copper-lined pool in the middle
    const pool = G.box(4.8, 0.35, 4.6, new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.7, roughness: 0.35 }), 0, 0, -0.3);
    tl.add(pool);
    const pw = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4), M.waterCheap);
    pw.rotation.x = -Math.PI / 2;
    pw.position.set(0, 0.33, -0.3);
    tl.add(pw);
    const pc = G.box(4.8, 1.2, 4.6, G.colliderMat, 0, 0, -0.3);
    tl.add(pc);
    col(pc);
    // wooden balustrade on three sides
    const rail = [];
    const railMat = M.wood;
    for (const [x0, z0, x1, z1] of [
      [-14, 8.1, 14, 8.1],
      [-14, -8, -14, 8.1],
      [14, -8, 14, 8.1],
    ]) {
      const r1 = G.segWall(x0, z0, x1, z1, 0.14, 0.12, railMat, { y0: 1.0 });
      const r2 = G.segWall(x0, z0, x1, z1, 0.08, 0.08, railMat, { y0: 0.2 });
      tl.add(r1, r2);
      const L = Math.hypot(x1 - x0, z1 - z0);
      const nP = Math.round(L / 0.45);
      const postG = new THREE.BoxGeometry(0.05, 0.8, 0.05);
      const posts = new THREE.InstancedMesh(postG, railMat, nP);
      for (let k = 0; k < nP; k++) posts.setMatrixAt(k, new THREE.Matrix4().makeTranslation(x0 + ((x1 - x0) * (k + 0.5)) / nP, 0.6, z0 + ((z1 - z0) * (k + 0.5)) / nP));
      tl.add(posts);
      const c = G.segWall(x0, z0, x1, z1, 0.3, 1.8, G.colliderMat);
      tl.add(c);
      rail.push(c);
    }
    col(rail);
    // throne room behind (painted walls)
    for (const [x0, z0, x1, z1] of [
      [-4.5, -8.5, -4.5, -18],
      [4.5, -8.5, 4.5, -18],
      [-4.5, -18, 4.5, -18],
    ]) {
      const w = G.segWall(x0, z0, x1, z1, 0.3, MR - TF - 0.4, M.painted, { unit: 3 });
      tl.add(w);
      col(w);
    }
    // corridor from the stair door to the talar is open floor; lamp
    const lamp = new THREE.PointLight(0xffd29a, 30, 16, 1.4);
    lamp.position.set(0, colH - 2, 0);
    lamp.userData.base = 30;
    tl.add(lamp);
    W.nightLights.push(lamp);
    lamp.intensity = 0;
  }

  // ------------------------------------------------ spiral staircase (ground -> talar -> music room)
  // Angles are measured in the local xz plane as (cos a, sin a); the helix turns with
  // decreasing angle so that it opens toward the gate passage (a=0) at the ground and in
  // the music room, and toward the talar (a=PI/2, +z) at the talar floor.
  {
    const cx = -7,
      cz = -14;
    const R = 2.8,
      rise = 3.6,
      perTurn = 16;
    const nSteps = Math.round((MR / rise) * perTurn);
    const stepG = new THREE.BoxGeometry(2.35, 0.225, 0.95);
    stepG.translate(1.55, -0.1125, 0);
    const steps = new THREE.InstancedMesh(stepG, M.marble, nSteps + 1);
    const q = new THREE.Quaternion();
    for (let i = 0; i <= nSteps; i++) {
      const th = -(i * 2 * Math.PI) / perTurn;
      const y = Math.min((i + 1) * (rise / perTurn), MR);
      // R_y(-th) maps +x to (cos th, 0, sin th)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -th);
      steps.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(cx, y, cz), q, new THREE.Vector3(1, 1, 1)));
    }
    steps.receiveShadow = true;
    grp.add(steps);
    floor(steps);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, MR + 3, 12), M.plaster);
    core.position.set(cx, (MR + 3) / 2, cz);
    grp.add(core);
    col(core);
    const nSeg = 12;
    const segOf = (ang) => Math.round((((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / ((2 * Math.PI) / nSeg)) % nSeg;
    const doors = [
      { seg: segOf(0), y0: 0, y1: 3.2 },
      { seg: segOf(Math.PI / 2), y0: TF, y1: TF + 3 },
      { seg: segOf(0), y0: MR, y1: MR + 3 },
    ];
    for (let k = 0; k < nSeg; k++) {
      const a0 = ((k - 0.5) * 2 * Math.PI) / nSeg,
        a1 = ((k + 0.5) * 2 * Math.PI) / nSeg;
      const p0 = [cx + R * Math.cos(a0), cz + R * Math.sin(a0)],
        p1 = [cx + R * Math.cos(a1), cz + R * Math.sin(a1)];
      const cuts = doors.filter((d) => d.seg === k).sort((u, v) => u.y0 - v.y0);
      let y = 0;
      const ranges = [];
      for (const d of cuts) {
        if (d.y0 > y) ranges.push([y, d.y0]);
        y = d.y1;
      }
      ranges.push([y, MR + 3.4]);
      for (const [y0, y1] of ranges) {
        if (y1 - y0 < 0.05) continue;
        const w = G.segWall(p0[0], p0[1], p1[0], p1[1], 0.3, y1 - y0, M.plaster, { y0 });
        grp.add(w);
        col(w);
      }
    }
    for (const yy of [6, 20]) {
      const sl = new THREE.PointLight(0xffc98a, 8, 12, 1.5);
      sl.position.set(cx, yy, cz);
      grp.add(sl);
    }
  }

  // ------------------------------------------------ music room (top floor)
  {
    const mr = new THREE.Group();
    mr.position.y = MR;
    grp.add(mr);
    const tb = tongBoriCanvas();
    const tbMat = new THREE.MeshStandardMaterial({ map: T.toTex(tb, { repeat: [1, 1] }), roughness: 0.95 });
    const h = TOP - MR - 0.4;
    for (const [x0, z0, x1, z1] of [
      [-9.4, -8.6, 9.4, -8.6],
      [9.4, -8.6, 9.4, -18.4],
      [9.4, -18.4, -9.4, -18.4],
      [-9.4, -18.4, -9.4, -8.6],
    ]) {
      const p = G.segWall(x0, z0, x1, z1, 0.1, h, tbMat, { side: -1, unit: h / 1.6 });
      mr.add(p);
    }
    // ceiling: a shallow cross vault lined with the same cut stucco
    const vault = new THREE.Mesh(new THREE.SphereGeometry(10.5, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: T.toTex(tb, { repeat: [8, 2] }), roughness: 0.95, side: THREE.BackSide }));
    vault.scale.set(0.9, 0.09, 0.46);
    vault.position.set(0, h - 0.9, -13.5);
    mr.add(vault);
    const cs = new THREE.Shape();
    cs.moveTo(-9.5, -5);
    cs.lineTo(9.5, -5);
    cs.lineTo(9.5, 5);
    cs.lineTo(-9.5, 5);
    cs.closePath();
    const eh = new THREE.Path();
    eh.absellipse(0, 0, 9.45, 4.83, 0, Math.PI * 2, true);
    cs.holes.push(eh);
    const ring = new THREE.Mesh(new THREE.ShapeGeometry(cs, 32), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 1, side: THREE.DoubleSide }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, h - 0.9, -13.5);
    mr.add(ring);
    const lamp = new THREE.PointLight(0xffd6a8, 25, 25, 1.4);
    lamp.position.set(0, 4.5, -13.5);
    mr.add(lamp);
  }

  // stone floor through the gate block and tower base
  {
    const f = G.plane(27.6, 25.8, M.pavingLight, 2.5);
    f.rotation.x = -Math.PI / 2;
    f.position.set(0, 0.06, -6.1);
    f.receiveShadow = true;
    grp.add(f);
  }

  // ------------------------------------------------ zones & minimap
  grp.updateMatrixWorld(true);
  const inv = grp.matrixWorld.clone().invert();
  const loc = (p) => new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(inv);
  const inside = (l) => Math.abs(l.x) < 14.5 && l.z > -19.5 && l.z < 9.5;
  W.zones.push({ id: 'aliMusic', audio: 'musicRoom', place: 'aliMusic', test: (p) => { const l = loc(p); return inside(l) && l.y > MR - 0.5 && l.y < TOP; } });
  W.zones.push({ id: 'aliStair', audio: 'aliqapu', place: 'aliStair', test: (p) => { const l = loc(p); return Math.hypot(l.x + 7, l.z + 14) < 3 && l.y < MR; } });
  W.zones.push({ id: 'aliTalar', audio: 'aliqapu', place: 'aliTalar', test: (p) => { const l = loc(p); return inside(l) && l.y > TF - 1 && l.y < MR - 0.5; } });
  W.zones.push({ id: 'aliGate', audio: 'aliqapu', place: 'aliGate', test: (p) => { const l = loc(p); return Math.abs(l.x) < gw / 2 + 0.5 && l.z < 8 && l.z > -19.5 && l.y < gh; } });
  const wp = (x, z) => {
    const v = new THREE.Vector3(x, 0, z).applyMatrix4(grp.matrixWorld);
    return [v.x, v.z];
  };
  W.footprints.push({ color: '#9a7a52', pts: [wp(-14, 8), wp(14, 8), wp(14, -19), wp(-14, -19)] });
  W.footprints.push({ color: '#6b4a2a', pts: [wp(-14, 8), wp(14, 8), wp(14, -8), wp(-14, -8)] });
  W.aliTalarWorld = wp(0, 3);
  return { gap: { side: 'west', from: ALI.z - 14, to: ALI.z + 14 }, group: grp };
}

// front of the gate block: brick with two tiers of blind arches and tile spandrels
function aliFrontCanvas(M) {
  const W = 28,
    H = 13.5,
    px = 40;
  const c = document.createElement('canvas');
  c.width = W * px;
  c.height = H * px;
  const x = c.getContext('2d');
  const pat = x.createPattern(M.canvas.brickPale, 'repeat');
  x.save();
  x.scale(0.3, 0.3);
  x.fillStyle = pat;
  x.fillRect(0, 0, c.width / 0.3, c.height / 0.3);
  x.restore();
  const X = (v) => (v + W / 2) * px,
    Y = (v) => c.height - v * px;
  // marble plinth
  x.fillStyle = '#e4d6b2';
  x.fillRect(0, Y(1.2), c.width, 1.2 * px);
  const blind = (cx, y0, w, sp, ri) => {
    const pts = G.archOpening(w, sp, ri, y0);
    x.save();
    x.beginPath();
    pts.forEach((p, i) => (i ? x.lineTo(X(p[0] + cx), Y(p[1])) : x.moveTo(X(p[0] + cx), Y(p[1]))));
    x.closePath();
    x.fillStyle = '#6d5536';
    x.fill();
    x.clip();
    const tp = x.createPattern(M.canvas.arabLapis, 'repeat');
    x.globalAlpha = 0.25;
    x.fillStyle = tp;
    x.fillRect(0, 0, c.width, c.height);
    x.restore();
    x.strokeStyle = '#2fa9b8';
    x.lineWidth = 6;
    x.stroke();
    // tile rectangle frame
    x.strokeStyle = '#1d4fa0';
    x.lineWidth = 8;
    x.strokeRect(X(cx - w / 2 - 0.35), Y(sp + ri + 0.5), (w + 0.7) * px, (sp + ri + 0.5 - y0 + 0.02) * px);
  };
  for (const cx of [-11.2, -6.6, 6.6, 11.2]) {
    blind(cx, 1.2, 3.2, 3.8, 1.5);
    blind(cx, 7.3, 3.2, 10.2, 1.4);
  }
  // cornice band
  x.fillStyle = '#1d4fa0';
  x.fillRect(0, Y(TF_TOP), c.width, 0.5 * px);
  return c;
}
const TF_TOP = 13.5;

// Tong-bori: stucco with vase- and ewer-shaped cut-outs (Ali Qapu music room)
function tongBoriCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#efe4cc';
  x.fillRect(0, 0, 512, 512);
  const vase = (cx, cy, s, kind) => {
    x.beginPath();
    if (kind === 0) {
      x.moveTo(cx - 0.12 * s, cy - 0.5 * s);
      x.lineTo(cx + 0.12 * s, cy - 0.5 * s);
      x.quadraticCurveTo(cx + 0.1 * s, cy - 0.2 * s, cx + 0.35 * s, cy + 0.05 * s);
      x.quadraticCurveTo(cx + 0.42 * s, cy + 0.45 * s, cx + 0.15 * s, cy + 0.5 * s);
      x.lineTo(cx - 0.15 * s, cy + 0.5 * s);
      x.quadraticCurveTo(cx - 0.42 * s, cy + 0.45 * s, cx - 0.35 * s, cy + 0.05 * s);
      x.quadraticCurveTo(cx - 0.1 * s, cy - 0.2 * s, cx - 0.12 * s, cy - 0.5 * s);
    } else {
      x.moveTo(cx, cy - 0.5 * s);
      x.quadraticCurveTo(cx + 0.3 * s, cy - 0.35 * s, cx + 0.2 * s, cy - 0.1 * s);
      x.quadraticCurveTo(cx + 0.45 * s, cy + 0.2 * s, cx + 0.2 * s, cy + 0.5 * s);
      x.lineTo(cx - 0.2 * s, cy + 0.5 * s);
      x.quadraticCurveTo(cx - 0.45 * s, cy + 0.2 * s, cx - 0.2 * s, cy - 0.1 * s);
      x.quadraticCurveTo(cx - 0.3 * s, cy - 0.35 * s, cx, cy - 0.5 * s);
    }
    x.closePath();
    x.fillStyle = '#3b2a1c';
    x.fill();
    x.strokeStyle = '#fff8e8';
    x.lineWidth = 3;
    x.stroke();
  };
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      const cx = 64 + col * 128,
        cy = 64 + row * 128;
      // arched cell
      x.strokeStyle = '#c8b48a';
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(cx - 54, cy + 60);
      x.lineTo(cx - 54, cy - 20);
      x.quadraticCurveTo(cx - 54, cy - 60, cx, cy - 62);
      x.quadraticCurveTo(cx + 54, cy - 60, cx + 54, cy - 20);
      x.lineTo(cx + 54, cy + 60);
      x.stroke();
      vase(cx, cy + 5, 90, (row + col) % 2);
    }
  return c;
}
