// First-person walking (pointer lock, collisions, floor following), free flight,
// and an aerial orbit view. Touch: left side drag = move, right side drag = look.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const UP = new THREE.Vector3(0, 1, 0);
const EYE = 1.65;

export class Explorer {
  constructor(camera, dom, { colliders = [], floors = [] } = {}) {
    this.camera = camera;
    this.dom = dom;
    this.colliders = colliders;
    this.floors = floors;
    this.pos = new THREE.Vector3(0, 0, 0); // feet position
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.mode = 'walk';
    this.keys = new Set();
    this.locked = false;
    this.vy = 0;
    this.stepDist = 0;
    this.onStep = null;
    this.onModeChange = null;
    this.onLockChange = null;
    this.ray = new THREE.Raycaster();
    this.ray.firstHitOnly = true;
    this.anim = null;
    this.touchMove = new THREE.Vector2();
    this.orbit = new OrbitControls(camera, dom);
    this.orbit.enabled = false;
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI * 0.49;
    this.orbit.minDistance = 20;
    this.orbit.maxDistance = 1200;
    this.orbit.target.set(0, 10, 0);
    this._bind();
  }

  _bind() {
    const d = this.dom;
    d.addEventListener('click', () => {
      if (this.mode !== 'orbit' && !this.locked && !this.isTouch) this.lock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === d;
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    // touch
    this.touches = new Map();
    d.addEventListener(
      'touchstart',
      (e) => {
        this.isTouch = true;
        if (this.mode === 'orbit') return;
        for (const t of e.changedTouches) {
          const left = t.clientX < window.innerWidth * 0.4;
          this.touches.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, left });
        }
        e.preventDefault();
      },
      { passive: false },
    );
    d.addEventListener(
      'touchmove',
      (e) => {
        if (this.mode === 'orbit') return;
        for (const t of e.changedTouches) {
          const s = this.touches.get(t.identifier);
          if (!s) continue;
          if (s.left) {
            this.touchMove.set((t.clientX - s.x0) / 60, (t.clientY - s.y0) / 60).clampLength(0, 1);
          } else {
            this.yaw -= (t.clientX - s.x) * 0.005;
            this.pitch -= (t.clientY - s.y) * 0.005;
            this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
          }
          s.x = t.clientX;
          s.y = t.clientY;
        }
        e.preventDefault();
      },
      { passive: false },
    );
    const end = (e) => {
      for (const t of e.changedTouches) {
        const s = this.touches.get(t.identifier);
        if (s?.left) this.touchMove.set(0, 0);
        this.touches.delete(t.identifier);
      }
    };
    d.addEventListener('touchend', end);
    d.addEventListener('touchcancel', end);
  }

  lock() {
    try {
      const p = this.dom.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {
      /* pointer lock is optional */
    }
  }
  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  setMode(m) {
    if (m === this.mode) return;
    const prev = this.mode;
    this.mode = m;
    if (m === 'orbit') {
      this.unlock();
      this.orbit.enabled = true;
      // aim orbit at what we were looking at
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const tgt = this.camera.position.clone().addScaledVector(dir, 60);
      tgt.y = Math.max(5, Math.min(30, tgt.y));
      if (prev !== 'orbit') {
        this.orbit.target.copy(tgt);
        if (this.camera.position.y < 40) {
          this.camera.position.addScaledVector(dir, -80);
          this.camera.position.y += 80;
        }
      }
      this.orbit.update();
    } else {
      this.orbit.enabled = false;
      if (prev === 'orbit') {
        // derive yaw/pitch from the orbit camera
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        this.yaw = Math.atan2(-dir.x, -dir.z);
        this.pitch = Math.asin(dir.y);
        this.pos.copy(this.camera.position);
        this.pos.y -= EYE;
        if (m === 'walk') {
          // drop to the ground below
          const g = this.floorAt(this.pos, 400);
          this.pos.y = g ?? 0;
          this.pitch = Math.max(-0.3, this.pitch);
        }
      } else if (m === 'walk') {
        const g = this.floorAt(this.pos, 400);
        this.pos.y = g ?? 0;
      }
    }
    this.onModeChange?.(m);
  }

  // Teleport with a smooth camera move
  goTo({ pos, yaw, pitch = 0, mode = 'walk' }, dur = 1.6) {
    if (mode !== this.mode) this.setMode(mode);
    if (mode === 'orbit') {
      const from = { p: this.camera.position.clone(), t: this.orbit.target.clone() };
      this.anim = { t: 0, dur, kind: 'orbit', from, to: { p: new THREE.Vector3(...pos.cam), t: new THREE.Vector3(...pos.target) } };
      return;
    }
    const from = { p: this.pos.clone(), yaw: this.yaw, pitch: this.pitch };
    let dy = yaw - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.anim = { t: 0, dur, kind: 'fp', from, to: { p: new THREE.Vector3(...pos), yaw: this.yaw + dy, pitch } };
    this.vy = 0;
  }

  floorAt(p, above = 0.6) {
    this.ray.set(new THREE.Vector3(p.x, p.y + above, p.z), new THREE.Vector3(0, -1, 0));
    this.ray.far = above + 200;
    const hits = this.ray.intersectObjects(this.floors, false);
    return hits.length ? hits[0].point.y : null;
  }

  _blocked(from, dir, dist) {
    this.ray.far = dist + 0.35;
    for (const h of [0.45, 1.3]) {
      this.ray.set(new THREE.Vector3(from.x, from.y + h, from.z), dir);
      const hits = this.ray.intersectObjects(this.colliders, false);
      if (hits.length) return hits[0];
    }
    return null;
  }

  _tryMove(delta) {
    const len = delta.length();
    if (len < 1e-6) return 0;
    const dir = delta.clone().divideScalar(len);
    const hit = this._blocked(this.pos, dir, len);
    if (!hit) {
      this.pos.add(delta);
      return len;
    }
    // slide along the wall
    const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : dir.clone().negate();
    n.y = 0;
    n.normalize();
    const slide = delta.clone().addScaledVector(n, -delta.dot(n));
    const sl = slide.length();
    if (sl > 1e-5) {
      const sdir = slide.clone().divideScalar(sl);
      if (!this._blocked(this.pos, sdir, sl)) {
        this.pos.add(slide);
        return sl;
      }
    }
    return 0;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    const cam = this.camera;
    if (this.anim) {
      const a = this.anim;
      a.t += dt / a.dur;
      const k = a.t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * a.t);
      if (a.kind === 'orbit') {
        cam.position.lerpVectors(a.from.p, a.to.p, k);
        this.orbit.target.lerpVectors(a.from.t, a.to.t, k);
        this.orbit.update();
      } else {
        this.pos.lerpVectors(a.from.p, a.to.p, k);
        // arc up a little during long moves
        const dist = a.from.p.distanceTo(a.to.p);
        this.pos.y += Math.sin(Math.PI * k) * Math.min(40, dist * 0.15);
        this.yaw = a.from.yaw + (a.to.yaw - a.from.yaw) * k;
        this.pitch = a.from.pitch + (a.to.pitch - a.from.pitch) * k;
      }
      if (a.t >= 1) this.anim = null;
      if (a.kind === 'orbit') return;
    } else if (this.mode === 'orbit') {
      this.orbit.update();
      return;
    } else {
      this._move(dt);
    }
    cam.position.set(this.pos.x, this.pos.y + EYE + (this.bob || 0), this.pos.z);
    cam.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }

  _move(dt) {
    const k = this.keys;
    const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - this.touchMove.y;
    const s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + this.touchMove.x;
    const run = k.has('ShiftLeft') || k.has('ShiftRight');
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3().addScaledVector(fwd, f).addScaledVector(right, s);
    if (wish.lengthSq() > 1) wish.normalize();

    if (this.mode === 'fly') {
      const speed = run ? 60 : 16;
      const look = new THREE.Vector3();
      this.camera.getWorldDirection(look);
      const v = new THREE.Vector3().addScaledVector(look, f).addScaledVector(right, s);
      const up = (k.has('KeyE') || k.has('Space') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
      v.addScaledVector(UP, up);
      this.vel.lerp(v.multiplyScalar(speed), 1 - Math.exp(-dt * 6));
      this.pos.addScaledVector(this.vel, dt);
      const g = this.floorAt(this.pos, 0.5);
      if (g !== null && this.pos.y < g) this.pos.y = g;
      this.bob = 0;
      return;
    }

    // walk
    const speed = run ? 8.5 : 3.4;
    const target = wish.multiplyScalar(speed);
    this.vel.x += (target.x - this.vel.x) * (1 - Math.exp(-dt * 10));
    this.vel.z += (target.z - this.vel.z) * (1 - Math.exp(-dt * 10));
    const delta = new THREE.Vector3(this.vel.x * dt, 0, this.vel.z * dt);
    const moved = this._tryMove(delta);

    // floor following with step-up and gravity
    const g = this.floorAt(this.pos, 0.7);
    if (g !== null) {
      if (g >= this.pos.y - 0.05) {
        this.pos.y += (g - this.pos.y) * Math.min(1, dt * 14);
        this.vy = 0;
      } else {
        this.vy -= 9.8 * dt;
        this.pos.y += this.vy * dt;
        if (this.pos.y <= g) {
          this.pos.y = g;
          this.vy = 0;
        }
      }
    }
    // head bob & footsteps
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.stepDist += moved;
    this.bobPhase = (this.bobPhase || 0) + moved * 2.2;
    this.bob = Math.sin(this.bobPhase) * 0.035 * Math.min(1, sp / 3);
    const stride = run ? 1.5 : 0.8;
    if (this.stepDist > stride) {
      this.stepDist = 0;
      this.onStep?.(run ? 1.2 : 0.8);
    }
    this.speed = sp;
  }
}
