// Reflective pools: three.js Water with a procedural normal map. Far away the
// reflection pass is switched off and a cheap glossy material is shown instead.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

export function makePool(W, M, { w, h, x = 0, y = 0.35, z = 0, rotY = 0, parent = null, reflectDist = 260, texSize = 512, reflectWhen = null }) {
  const geo = new THREE.PlaneGeometry(w, h);
  const water = new Water(geo, {
    textureWidth: texSize,
    textureHeight: texSize,
    waterNormals: M.waterNormals,
    sunDirection: new THREE.Vector3(0, 1, 0),
    sunColor: 0xfff0d0,
    waterColor: 0x1d5a6a,
    distortionScale: 0.7,
    fog: true,
    alpha: 1,
  });
  water.material.uniforms.size.value = 3.5;
  water.rotation.x = -Math.PI / 2;
  // layer 2: never drawn inside another pool's reflection pass
  water.layers.set(2);
  const cheap = new THREE.Mesh(geo, M.waterCheap);
  cheap.rotation.x = -Math.PI / 2;
  const g = new THREE.Group();
  g.userData.dynamic = true;
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.add(water, cheap);
  (parent || W.scene).add(g);
  const wp = new THREE.Vector3();
  W.updaters.push((dt, t, cam) => {
    water.material.uniforms.time.value = t * 0.35;
    g.getWorldPosition(wp);
    const d = cam.position.distanceTo(wp);
    const near = d < reflectDist && cam.position.y > wp.y && (!reflectWhen || reflectWhen(cam.position));
    water.visible = near;
    cheap.visible = !near;
  });
  const obj = {
    group: g,
    setSun(dir, color, night) {
      water.material.uniforms.sunDirection.value.copy(dir).normalize();
      water.material.uniforms.sunColor.value.copy(color).multiplyScalar(1 - night * 0.9);
      water.material.uniforms.waterColor.value.set(0x1d5a6a).multiplyScalar(1 - night * 0.7);
    },
  };
  W.waters.push(obj);
  return obj;
}
