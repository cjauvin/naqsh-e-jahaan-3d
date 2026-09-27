// Qeysarieh Gate (1619), north end: entrance to the Grand Bazaar. Tile mosaic of
// Sagittarius over the arch, frescoes in the niche, and behind it a vaulted bazaar
// street with skylit domes.
import * as THREE from 'three';
import * as G from './geom.js';
import * as T from './textures.js';
import { shopCanvas } from './arcade.js';

export function buildQeysarieh(M, W) {
  const grp = new THREE.Group();
  grp.position.set(0, 0, -256);
  W.scene.add(grp);
  const col = (m) => (Array.isArray(m) ? m.forEach((x) => W.colliders.push(x)) : W.colliders.push(m));

  const PW = 22,
    PH = 19,
    aw = 9,
    sp = 9.5,
    ri = 4.6;
  const archPts = G.archOpening(aw, sp, ri);
  const fc = T.facadeCanvas({ W: PW, H: PH, archPts, field: M.canvas.arabLapis, band: M.canvas.calligIsfahan, bandW: 1.1, dado: 1.6, px: 50, fieldScale: 2, brick: M.canvas.brickPale, brickMargin: 2.2 });
  drawSagittarius(fc, PW, PH, sp + ri + 1.9);
  const facadeMat = new THREE.MeshStandardMaterial({ map: T.toTex(fc, { wrap: false }), roughness: 0.4 });
  const fresco = new THREE.MeshStandardMaterial({ map: T.toTex(frescoCanvas(), { wrap: false }), roughness: 0.95 });
  const p = G.pishtaq({ W: PW, H: PH, archW: aw, archSpring: sp, archRise: ri, frameDepth: 2, facadeMat, backMat: M.brick, revealMat: M.tileLapis, nicheWallMat: fresco, hoodMat: M.muqarnasCream, door: { w: 4.2, spring: 5, rise: 1.8 }, tiers: 8 });
  grp.add(p.group);
  col(p.colliders);
  const nb = -p.nicheDepth;
  const R = aw / 2;
  for (const sg of [-1, 1]) {
    const b = G.box(PW / 2 - R, PH, -nb - 2, M.brick, sg * (R + (PW / 2 - R) / 2), 0, nb / 2 - 1, { uvScale: 2 });
    grp.add(b);
  }
  grp.add(G.box(aw, PH - sp - ri, -nb - 2, M.brick, 0, sp + ri, nb / 2 - 1, { uvScale: 2 }));
  grp.add(G.box(PW + 0.4, 0.6, 2.4, M.tileTurq, 0, PH, -1.2));
  for (const sg of [-1, 1]) grp.add(G.box(1.2, 0.55, 3, M.marble, sg * (R - 0.9), 0, -3.2));
  // small clock-house on top (after the lost naqqareh-khaneh gallery)
  {
    const g = new THREE.Group();
    g.position.set(0, PH + 0.6, -3);
    for (const x of [-3, 0, 3]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3, 8), M.woodLight);
      c.position.set(x * 1.2, 1.5, 1.4);
      g.add(c);
    }
    g.add(G.box(9, 0.3, 4, M.wood, 0, 3, 0));
    g.add(G.box(9, 3, 0.4, M.painted, 0, 0, -1.8));
    grp.add(g);
  }

  // ------------------------------------------------ bazaar street behind the gate
  const L = 84;
  const bw = 6.4;
  const bh = 8.5;
  const z0 = nb,
    z1 = nb - L;
  const shop = shopCanvas(3);
  const shopMat = new THREE.MeshStandardMaterial({ map: T.toTex(shop.map, { wrap: false }), emissiveMap: T.toTex(shop.glow, { wrap: false }), emissive: 0xffc27a, emissiveIntensity: 0.9, roughness: 0.8 });
  const bayW = 4.2;
  const nBays = Math.floor(L / bayW);
  // walls with shop openings
  for (const sg of [-1, 1]) {
    const openings = [];
    for (let i = 0; i < nBays; i++) openings.push({ x: -L / 2 + (i + 0.5) * bayW, w: 2.9, spring: 3.2, rise: 1.2 });
    const wall = new THREE.Mesh(G.archedWall(L, bh - 2.4, 0.6, openings), [M.brickPale, M.brick, M.brickPale]);
    const uv = wall.geometry.attributes.uv;
    const nor = wall.geometry.attributes.normal;
    for (let i = 0; i < uv.count; i++) if (Math.abs(nor.getZ(i)) > 0.9) uv.setXY(i, uv.getX(i) * (L / 3), uv.getY(i) * ((bh - 2.4) / 3));
    wall.position.set(sg * (bw / 2), 0, (z0 + z1) / 2);
    wall.rotation.y = sg > 0 ? -Math.PI / 2 : Math.PI / 2;
    grp.add(wall);
    col(wall);
    // shop fronts inside the openings
    const sg2 = new THREE.PlaneGeometry(2.9, 4.4);
    const im = new THREE.InstancedMesh(sg2, shopMat, nBays);
    for (let i = 0; i < nBays; i++) {
      const z = z0 - (i + 0.5) * bayW;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(sg * (bw / 2 + 0.58), 2.2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sg > 0 ? -Math.PI / 2 : Math.PI / 2), new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, m);
    }
    grp.add(im);
  }
  // domed vault bays with oculi and light shafts
  const nDomes = Math.floor(L / 6);
  const vaultMat = new THREE.MeshStandardMaterial({ map: M.brickPale.map, roughness: 1, side: THREE.BackSide });
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
  const shafts = [];
  for (let i = 0; i < nDomes; i++) {
    const z = z0 - (i + 0.5) * 6;
    const d = new THREE.Mesh(new THREE.SphereGeometry(bw / 2 + 0.3, 20, 8, 0, Math.PI * 2, 0.35, Math.PI / 2 - 0.35), vaultMat);
    d.scale.y = 0.75;
    d.position.set(0, bh - 2.4, z);
    grp.add(d);
    const arch = G.box(bw + 0.4, 0.6, 0.6, M.brick, 0, bh - 2.6, z - 3);
    grp.add(arch);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, bh + 0.5, 12, 1, true), shaftMat);
    sh.position.set(0.8, (bh + 0.5) / 2 - 0.3, z + 0.9);
    sh.rotation.z = 0.12;
    sh.rotation.x = -0.12;
    grp.add(sh);
    shafts.push(sh);
    // exterior roof domes with lanterns
    const od = new THREE.Mesh(new THREE.SphereGeometry(bw / 2 + 0.7, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.roof);
    od.scale.y = 0.6;
    od.position.set(0, bh - 1.7, z);
    grp.add(od);
    const lant = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.8, 8), M.roof);
    lant.position.set(0, bh + 0.9, z);
    grp.add(lant);
  }
  grp.add(G.box(bw + 14, bh - 2.4, 0.6, M.brick, 0, 0, z1 - 0.3));
  // far end fades into darkness
  const endMat = new THREE.MeshBasicMaterial({ color: 0x1a120a });
  const end = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), endMat);
  end.position.set(0, bh / 2, z1 + 0.02);
  grp.add(end);
  const endC = G.box(bw, 4, 0.5, G.colliderMat, 0, 0, z1 + 1);
  grp.add(endC);
  col(endC);
  // roofs over the shops
  for (const sg of [-1, 1]) grp.add(G.box(8, 0.4, L, M.roof, sg * (bw / 2 + 4), bh - 2.4, (z0 + z1) / 2));
  const floorM = G.plane(bw, L, M.paving, 2.5);
  floorM.rotation.x = -Math.PI / 2;
  floorM.position.set(0, 0.03, (z0 + z1) / 2);
  grp.add(floorM);
  // warm lamps
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight(0xffb870, 18, 24, 1.6);
    l.position.set(0, 5.2, z0 - 8 - i * 20);
    grp.add(l);
  }
  W.updaters.push((dt, t) => {
    const k = 0.06 + 0.02 * Math.sin(t * 0.3);
    shaftMat.opacity = k * (W.dayFactor ?? 1);
  });

  // ------------------------------------------------ zones
  W.zones.push({ id: 'bazaar', audio: 'bazaar', place: 'bazaar', test: (p) => Math.abs(p.x) < bw / 2 + 1 && p.z < -256 + nb + 0.5 && p.z > -256 + z1 - 2 && p.y < 12 });
  W.zones.push({ id: 'qeyNiche', audio: 'bazaar', place: 'qeysarieh', test: (p) => Math.abs(p.x) < 11 && p.z < -256 + 1 && p.z > -256 + nb && p.y < 20 });
  W.footprints.push({ color: '#8a7658', pts: [[-bw / 2 - 8, -256 + z0], [bw / 2 + 8, -256 + z0], [bw / 2 + 8, -256 + z1], [-bw / 2 - 8, -256 + z1]] });
  W.footprints.push({ color: '#2f6fa8', pts: [[-PW / 2, -256], [PW / 2, -256], [PW / 2, -258], [-PW / 2, -258]] });
  return { gap: { side: 'north', from: -PW / 2, to: PW / 2 }, group: grp };
}

// the centaur-archer (Sagittarius) tile panel above the arch
function drawSagittarius(c, W, H, yc) {
  const x = c.getContext('2d');
  const px = c.width / W;
  const cx = c.width / 2,
    cy = c.height - yc * px;
  const s = px * 1.3;
  x.save();
  x.fillStyle = '#123a7a';
  x.strokeStyle = '#e2b43c';
  x.lineWidth = s * 0.12;
  x.beginPath();
  x.roundRect(cx - 3 * s, cy - 1.4 * s, 6 * s, 2.8 * s, s * 0.3);
  x.fill();
  x.stroke();
  x.translate(cx, cy + 0.3 * s);
  x.fillStyle = '#f0c75e';
  // horse body
  x.beginPath();
  x.ellipse(0.2 * s, 0, 1.2 * s, 0.45 * s, 0, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = s * 0.14;
  x.strokeStyle = '#f0c75e';
  for (const lx of [-0.7, -0.4, 0.8, 1.1]) {
    x.beginPath();
    x.moveTo(lx * s, 0.2 * s);
    x.lineTo((lx + (lx > 0 ? 0.2 : -0.2)) * s, 0.95 * s);
    x.stroke();
  }
  // dragon tail
  x.strokeStyle = '#2fa9b8';
  x.lineWidth = s * 0.16;
  x.beginPath();
  x.moveTo(1.3 * s, -0.1 * s);
  x.bezierCurveTo(2.2 * s, -0.8 * s, 2.4 * s, 0.6 * s, 1.9 * s, -0.9 * s);
  x.stroke();
  // human torso and head
  x.fillStyle = '#f4efe2';
  x.fillRect(-1.1 * s, -1.05 * s, 0.45 * s, 0.9 * s);
  x.beginPath();
  x.arc(-0.88 * s, -1.2 * s, 0.22 * s, 0, Math.PI * 2);
  x.fill();
  // bow and arrow
  x.strokeStyle = '#f4efe2';
  x.lineWidth = s * 0.07;
  x.beginPath();
  x.arc(-1.4 * s, -0.7 * s, 0.6 * s, Math.PI * 0.6, Math.PI * 1.4);
  x.stroke();
  x.beginPath();
  x.moveTo(-0.6 * s, -0.75 * s);
  x.lineTo(-2.2 * s, -0.75 * s);
  x.stroke();
  x.restore();
}

// a Safavid-style fresco: ochre ground, riders and trees, framed
function frescoCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1024;
  const x = c.getContext('2d');
  const r = T.rng(8);
  x.fillStyle = '#d9c29a';
  x.fillRect(0, 0, 512, 1024);
  x.fillStyle = '#1d4fa0';
  x.fillRect(0, 0, 512, 500);
  // painted panel in the upper half
  x.fillStyle = '#e7d5ad';
  x.fillRect(24, 540, 464, 300);
  x.strokeStyle = '#8a2f22';
  x.lineWidth = 6;
  x.strokeRect(24, 540, 464, 300);
  for (let i = 0; i < 4; i++) {
    const hx = 80 + i * 110,
      hy = 720;
    x.fillStyle = ['#6b3b22', '#f2efe8', '#3b2a1c', '#9a6a3a'][i];
    x.beginPath();
    x.ellipse(hx, hy, 34, 14, 0, 0, Math.PI * 2);
    x.fill();
    x.fillRect(hx - 28, hy, 5, 34);
    x.fillRect(hx + 22, hy, 5, 34);
    x.beginPath();
    x.moveTo(hx + 26, hy - 6);
    x.lineTo(hx + 44, hy - 30);
    x.lineTo(hx + 50, hy - 24);
    x.fill();
    x.fillStyle = ['#b8452f', '#1f4f9a', '#2c8a8f', '#d6a33c'][i];
    x.fillRect(hx - 6, hy - 38, 14, 26);
    x.fillStyle = '#f4e2c4';
    x.beginPath();
    x.arc(hx + 1, hy - 46, 7, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fff';
    x.fillRect(hx - 6, hy - 58, 14, 7);
  }
  for (let i = 0; i < 6; i++) {
    x.fillStyle = `hsl(${100 + r() * 30},35%,${30 + r() * 15}%)`;
    x.beginPath();
    x.arc(50 + r() * 420, 600 + r() * 60, 16 + r() * 12, 0, Math.PI * 2);
    x.fill();
  }
  // tile field in the lower half (blue arabesque dots)
  for (let i = 0; i < 400; i++) {
    x.fillStyle = r() < 0.5 ? '#e2b43c' : '#f4efe2';
    x.beginPath();
    x.arc(r() * 512, r() * 500, 2 + r() * 3, 0, Math.PI * 2);
    x.fill();
  }
  return c;
}
