// A fixed pool of point lights reassigned to the lamps nearest the viewer.
// Three.js evaluates every light in every standard-material fragment (even at zero
// intensity), so the scene keeps a constant, small light count: the modules still place
// PointLights/SpotLights where lamps belong; after the build they are converted to
// "lamp specs" and removed, and this rig picks the most relevant ones each moment.
import * as THREE from 'three';

export class LightRig {
  constructor(scene, count = 3) {
    this.specs = [];
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 1, 1.5);
      scene.add(l);
      this.lights.push(l);
    }
    this.lampOn = 0;
    this._t = 0;
  }

  // Convert every point/spot light in the scene (except the rig's own) into specs.
  harvest(scene) {
    const found = [];
    scene.traverse((o) => {
      if ((o.isPointLight || o.isSpotLight) && !this.lights.includes(o)) found.push(o);
    });
    const p = new THREE.Vector3();
    for (const o of found) {
      o.getWorldPosition(p);
      const night = o.userData.base !== undefined;
      let pos = p.clone(),
        distance = o.distance || 60,
        decay = o.decay,
        intensity = night ? o.userData.base : o.intensity;
      if (o.isSpotLight) {
        // floodlight: a point lamp part-way toward the lit façade
        const t = new THREE.Vector3();
        o.target.getWorldPosition(t);
        pos = p.clone().lerp(t, 0.55);
        pos.y = Math.max(pos.y, 8);
        distance = p.distanceTo(t) * 1.4;
        decay = 1.2;
        intensity = o.userData.base * 0.22;
      }
      this.specs.push({ pos, color: o.color.clone(), intensity, distance, decay, night });
      if (o.isSpotLight) o.target.removeFromParent();
      o.removeFromParent();
    }
  }

  // indoor: the viewer is inside a building, so outdoor night lamps are ignored and
  // the building's own lamps take priority
  update(dt, camPos, force = false, indoor = false) {
    this._t -= dt;
    if (this._t > 0 && !force) return;
    this._t = 0.25;
    const scored = [];
    for (const s of this.specs) {
      const inten = s.night ? s.intensity * this.lampOn : s.intensity;
      if (inten <= 0.001 || (indoor && s.night)) continue;
      const d = s.pos.distanceTo(camPos);
      if (d > s.distance * 1.2 + 20) continue;
      let score = inten / (1 + (d * d) / (s.distance * s.distance * 0.25));
      if (!s.night && d < s.distance * 0.7) score *= 8; // the lamp of the room you are in
      scored.push({ s, inten, score });
    }
    scored.sort((a, b) => b.score - a.score);
    this.lights.forEach((l, i) => {
      const e = scored[i];
      if (!e) {
        l.intensity = 0;
        return;
      }
      l.position.copy(e.s.pos);
      l.color.copy(e.s.color);
      l.intensity = e.inten;
      l.distance = e.s.distance;
      l.decay = e.s.decay;
    });
  }
}
