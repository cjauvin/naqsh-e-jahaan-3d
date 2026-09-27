// Merge static single-material meshes that share a material into spatial chunks to cut
// draw calls. Originals are hidden (not removed) so collision/floor raycasts still work.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeStatic(scene, { cell = 140 } = {}) {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  const isDynamic = (o) => {
    for (let p = o; p; p = p.parent) if (p.userData.dynamic) return true;
    return false;
  };
  const hide = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.children.length || !o.visible) return;
    const g = o.geometry;
    const keys = Object.keys(g.attributes);
    if (keys.length !== 3 || !g.attributes.normal || !g.attributes.uv) return;
    if (isDynamic(o)) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (g.boundingSphere.radius > 400) return; // ground-sized meshes stay alone
    const c = g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);
    const cellKey = `${Math.floor(c.x / cell)},${Math.floor(c.z / cell)}`;
    // one entry per (material, geometry range)
    const parts = [];
    if (Array.isArray(o.material)) {
      if (!g.groups.length || o.material.some((m) => !m || m.transparent || !m.visible)) return;
      for (const gr of g.groups) parts.push({ mat: o.material[gr.materialIndex], range: gr });
    } else {
      if (!o.material.visible || o.material.transparent) return;
      parts.push({ mat: o.material, range: null });
    }
    for (const { mat, range } of parts) {
      const key = `${mat.uuid}|${+o.castShadow}${+o.receiveShadow}|${cellKey}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ o, mat, range });
    }
    hide.push(o);
  });
  let before = 0,
    after = 0;
  for (const list of groups.values()) {
    before += list.length;
    const geos = list.map(({ o, range }) => {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      if (range) g = slice(g, range.start, range.count);
      g.applyMatrix4(o.matrixWorld);
      g.clearGroups();
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    const { o, mat } = list[0];
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = o.castShadow;
    m.receiveShadow = o.receiveShadow;
    m.matrixAutoUpdate = false;
    scene.add(m);
    after++;
  }
  for (const o of hide) o.visible = false;
  return { before, after };
}

// sub-range of a non-indexed geometry (vertex range)
function slice(g, start, count) {
  const out = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(g.attributes)) {
    const end = Math.min(a.count, start + count);
    out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, end * a.itemSize), a.itemSize));
  }
  return out;
}
