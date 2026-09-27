// Shared material library built from procedural canvas textures.
import * as THREE from 'three';
import * as T from './textures.js';

const { P } = T;

export function buildMaterials() {
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);

  // --- raw canvases (some reused by facade compositions)
  const C = (M.canvas = {});
  C.brick = T.brickCanvas({ size: 512, rows: 16, cols: 4 });
  C.brickPale = T.brickCanvas({ size: 512, rows: 16, cols: 4, color: '#d6b584', seed: 8 });
  C.arabLapis = T.arabesqueCanvas({ size: 512, seed: 3 });
  C.arabDeep = T.arabesqueCanvas({ size: 512, ground: P.lapisDeep, vine: P.white, vine2: P.turq, leaf: P.turqLight, flower: P.yellow, flowerCore: P.white, seed: 5 });
  C.arabTurq = T.arabesqueCanvas({ size: 512, ground: '#2a93a6', vine: P.white, vine2: P.yellow, leaf: P.lapis, flower: P.white, flowerCore: P.lapis, seed: 9 });
  C.arabYellow = T.arabesqueCanvas({ size: 512, ground: '#d9b45a', vine: P.lapisDeep, vine2: P.white, leaf: P.turq, flower: P.white, flowerCore: P.lapis, seed: 12 });
  C.star = T.starCanvas({ size: 512 });
  C.starBlue = T.starCanvas({ size: 512, ground: P.lapis, star: P.turq, cross: P.yellow, line: P.white });
  C.bannai = T.bannaiCanvas({});
  C.bannaiBlue = T.bannaiCanvas({ ground: '#1f4d8f', a: P.turq, b: P.yellow });
  C.calligBasmala = T.calligraphyCanvas({ text: 'بسم الله الرحمن الرحیم', reps: 2 });
  C.calligIsfahan = T.calligraphyCanvas({ text: 'اصفهان نصف جهان', reps: 2 });
  C.calligLotf = T.calligraphyCanvas({ text: 'مسجد شیخ لطف الله', reps: 2, ground: '#0e2f6b' });
  C.calligShah = T.calligraphyCanvas({ text: 'مسجد شاه', reps: 3 });
  C.calligDrum = T.calligraphyCanvas({ text: 'الله اکبر', reps: 4, w: 2048, h: 192 });
  C.calligWhiteOnTurq = T.calligraphyCanvas({ text: 'بسم الله الرحمن الرحیم', ground: '#1d7f93', reps: 2 });

  // --- basic building materials (uv in meters on boxes; repeat = 1 texture per 2 m)
  const brickTex = T.toTex(C.brick);
  M.brick = std({ map: brickTex, roughness: 0.92, color: 0xffffff });
  M.brickPale = std({ map: T.toTex(C.brickPale), roughness: 0.92 });
  M.plaster = std({ color: 0xe9dcc2, roughness: 0.95 });
  M.plasterWarm = std({ color: 0xdcc39a, roughness: 0.95 });
  M.roof = std({ color: 0xc7ab7e, roughness: 1 });
  M.marble = std({ color: 0xe8dcbc, roughness: 0.45 });
  M.marbleDark = std({ color: 0x9c907a, roughness: 0.4 });
  M.blackStone = std({ color: 0x1b1b1f, roughness: 0.3 });
  M.wood = std({ color: 0x5a3820, roughness: 0.75 });
  M.woodLight = std({ color: 0x8a5a33, roughness: 0.7 });
  M.gold = std({ color: 0xd8b25a, metalness: 0.85, roughness: 0.3 });
  M.door = std({ color: 0x3a2414, roughness: 0.6, metalness: 0.1 });
  M.dark = std({ color: 0x1a130e, roughness: 1 });
  M.grille = std({ color: 0x2a2320, roughness: 0.8, emissive: 0x3a2a14, emissiveIntensity: 0.25 });

  // --- tile materials
  const tile = (canvas, rep = 1, rough = 0.32) => std({ map: T.toTex(canvas, { repeat: [rep, rep] }), roughness: rough, metalness: 0.02 });
  M.tileLapis = tile(C.arabLapis);
  M.tileDeep = tile(C.arabDeep);
  M.tileTurq = tile(C.arabTurq);
  M.tileYellow = tile(C.arabYellow);
  M.tileStar = tile(C.star);
  M.tileStarBlue = tile(C.starBlue);
  M.bannai = std({ map: T.toTex(C.bannai, { repeat: [3, 6] }), roughness: 0.6 });
  M.bannaiBlue = std({ map: T.toTex(C.bannaiBlue, { repeat: [3, 6] }), roughness: 0.45 });
  // muqarnas cells: small-scale tile
  M.muqarnas = std({ map: T.toTex(T.starCanvas({ size: 256, n: 2, ground: P.lapis, star: P.turq, cross: P.white, line: P.yellow }), { repeat: [6, 6] }), roughness: 0.35, side: THREE.DoubleSide });
  M.muqarnasTurq = std({ map: T.toTex(T.starCanvas({ size: 256, n: 2, ground: P.turq, star: P.lapis, cross: P.yellow, line: P.white }), { repeat: [6, 6] }), roughness: 0.35, side: THREE.DoubleSide });
  M.muqarnasCream = std({ map: T.toTex(T.starCanvas({ size: 256, n: 2, ground: '#e3cfa2', star: '#caa66a', cross: P.turq, line: P.white }), { repeat: [6, 6] }), roughness: 0.6, side: THREE.DoubleSide });

  // calligraphy bands (not repeating vertically)
  const band = (c, rx = 1) => {
    const t = T.toTex(c, { repeat: [rx, 1] });
    t.wrapT = THREE.ClampToEdgeWrapping;
    return std({ map: t, roughness: 0.35 });
  };
  M.bandBasmala = band(C.calligBasmala);
  M.bandIsfahan = band(C.calligIsfahan);
  M.bandDrum = band(C.calligDrum, 4);
  M.bandDrumShah = band(C.calligBasmala, 5);
  M.bandMinaret = band(C.calligDrum, 2);

  // --- dome skins
  {
    const c = T.arabesqueCanvas({ size: 1024, ground: '#3aa7c4', vine: P.yellow, vine2: P.white, leaf: P.lapis, flower: P.white, flowerCore: P.yellow, cells: 2, tileGrid: 0, seed: 31, lineW: 1.3 });
    T.latticeOver(c, { cols: 2, rows: 2, color: P.yellow, width: 10, outline: P.lapisDeep });
    const t = T.toTex(c, { repeat: [8, 1.2] });
    M.domeShah = std({ map: t, roughness: 0.28, metalness: 0.05 });
  }
  {
    const c = T.arabesqueCanvas({ size: 1024, ground: '#e0c19c', vine: '#15294f', vine2: P.white, leaf: '#1e5f8c', flower: P.white, flowerCore: '#15294f', cells: 2, tileGrid: 0, seed: 41, lineW: 1.2 });
    T.latticeOver(c, { cols: 2, rows: 2, color: P.white, width: 10, outline: '#15294f' });
    const t = T.toTex(c, { repeat: [8, 1.3] });
    M.domeLotf = std({ map: t, roughness: 0.35, metalness: 0.03 });
  }
  M.domeTurqPlain = std({ map: T.toTex(C.arabTurq, { repeat: [6, 2] }), roughness: 0.3 });
  M.lotfInterior = std({ map: T.toTex(T.lotfollahDomeInteriorCanvas({}), { wrap: false }), roughness: 0.55, side: THREE.BackSide });
  M.lotfInterior.map.wrapS = THREE.RepeatWrapping;

  // --- ground
  M.paving = std({ map: T.toTex(T.pavingCanvas({}), { repeat: [1, 1] }), roughness: 0.85 });
  M.pavingLight = std({ map: T.toTex(T.pavingCanvas({ color: '#d9c7a2', seed: 5, n: 4 })), roughness: 0.8 });
  M.grass = new THREE.MeshLambertMaterial({ map: T.toTex(T.grassCanvas({})) });
  M.gravel = std({ map: T.toTex(T.gravelCanvas({})), roughness: 1 });
  M.poolStone = std({ color: 0xcfc3a5, roughness: 0.7 });
  M.poolBottom = std({ color: 0x3f8d93, roughness: 0.6 });
  M.waterNormals = T.toTex(T.waterNormalCanvas({}), { srgb: false });
  M.waterCheap = std({ color: 0x3d7f95, roughness: 0.05, metalness: 0.6, normalMap: M.waterNormals, transparent: true, opacity: 0.92 });

  // --- interiors
  M.woodCeiling = std({ map: T.toTex(T.woodCeilingCanvas({})), roughness: 0.6 });
  M.painted = std({ map: T.toTex(T.paintedPlasterCanvas({})), roughness: 0.9 });

  // --- foliage
  M.leaves = new THREE.MeshLambertMaterial({ color: 0x6f9a45 });
  M.leaves2 = new THREE.MeshLambertMaterial({ color: 0x86ad55 });
  M.trunk = new THREE.MeshLambertMaterial({ color: 0x6b5a45 });

  // --- night lamps
  M.lamp = new THREE.MeshStandardMaterial({ color: 0xffd79a, emissive: 0xffb35c, emissiveIntensity: 0 });
  M.lampables = [M.lamp];

  // name materials after their key (useful when debugging)
  for (const [k, v] of Object.entries(M)) if (v && v.isMaterial && !v.name) v.name = k;
  return M;
}
