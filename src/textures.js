// Procedural Persian textures drawn on canvas: brick, haft-rangi tile arabesques,
// girih stars, calligraphy bands, dome skins, paving, water normals.
import * as THREE from 'three';

// ---------- palette ----------
export const P = {
  lapis: '#123a7a',
  lapisDeep: '#0b2657',
  cobalt: '#1d4fa0',
  turq: '#2fa9b8',
  turqLight: '#6fd0d4',
  white: '#f4efe2',
  yellow: '#e2b43c',
  ochre: '#c8913a',
  cream: '#e7d6b0',
  buff: '#d8bf94',
  black: '#1a1a22',
  green: '#3f7d4a',
  brick: '#c9a067',
  brickDark: '#a9804d',
  mortar: '#d9c4a0',
  marble: '#e6d9b8',
};

// ---------- deterministic rng ----------
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

let maxAniso = 8;
export function setMaxAnisotropy(a) {
  maxAniso = a;
}

export function toTex(c, { repeat = [1, 1], srgb = true, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAniso;
  t.needsUpdate = true;
  return t;
}

// draw fn(ctx, dx, dy) at the 9 wrap offsets so a pattern tiles seamlessly
function wrapDraw(w, h, fn) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(dx, dy);
}

function noiseFill(ctx, w, h, amount, r, alpha = 1) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount * alpha;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- brick ----------
export function brickCanvas({ size = 512, rows = 16, cols = 4, color = P.brick, seed = 3, mortar = P.mortar } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, size, size);
  const bh = size / rows;
  const bw = size / cols;
  const base = new THREE.Color(color);
  for (let y = 0; y < rows; y++) {
    const off = (y % 2) * bw * 0.5;
    for (let x = -1; x <= cols; x++) {
      const col = base.clone().offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.08);
      ctx.fillStyle = '#' + col.getHexString();
      ctx.fillRect(x * bw + off + 1.5, y * bh + 1.5, bw - 3, bh - 3);
    }
  }
  noiseFill(ctx, size, size, 18, r);
  return c;
}

// ---------- arabesque (islimi) tile field ----------
// Tileable spiral vines with leaves and khatai rosettes, drawn over a ground color.
export function arabesqueCanvas({
  size = 512,
  ground = P.lapis,
  vine = P.white,
  vine2 = P.yellow,
  leaf = P.turq,
  flower = P.white,
  flowerCore = P.yellow,
  cells = 2,
  seed = 7,
  tileGrid = 8,
  gridAlpha = 0.18,
  lineW = 1,
} = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, size, size);
  const cs = size / cells;
  const lw = (cs / 70) * lineW;

  // spiral centers on a checker arrangement, alternating rotation direction
  const centers = [];
  for (let i = 0; i < cells; i++)
    for (let j = 0; j < cells; j++) {
      centers.push({ x: (i + 0.25) * cs, y: (j + 0.25) * cs, dir: 1 });
      centers.push({ x: (i + 0.75) * cs, y: (j + 0.75) * cs, dir: -1 });
    }

  const spiral = (cx, cy, R, dir, a0, turns) => {
    const pts = [];
    const steps = 50;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const a = a0 + dir * t * turns * Math.PI * 2;
      const rr = R * (1 - 0.82 * t);
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a), a]);
    }
    return pts;
  };
  const stroke = (pts, color, w) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  };
  const leafAt = (x, y, ang, len, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0);
    ctx.fill();
    ctx.strokeStyle = vine;
    ctx.lineWidth = lw * 0.5;
    ctx.stroke();
    ctx.restore();
  };
  const rosette = (x, y, R, petals, col, core) => {
    ctx.save();
    ctx.translate(x, y);
    for (let p = 0; p < petals; p++) {
      ctx.rotate((Math.PI * 2) / petals);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(R * 0.55, 0, R * 0.48, R * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ground;
      ctx.lineWidth = lw * 0.4;
      ctx.stroke();
    }
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.cobalt;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  wrapDraw(size, size, (dx, dy) => {
    // connecting S-vines between neighbouring spiral centres
    for (const a of centers) {
      for (const b of centers) {
        const ddx = b.x - a.x,
          ddy = b.y - a.y;
        const d = Math.hypot(ddx, ddy);
        if (d < cs * 0.72 && d > 1 && a.dir === 1) {
          const mx = (a.x + b.x) / 2 + dx,
            my = (a.y + b.y) / 2 + dy;
          ctx.strokeStyle = vine;
          ctx.lineWidth = lw * 2.2;
          ctx.beginPath();
          ctx.moveTo(a.x + dx, a.y + dy);
          ctx.bezierCurveTo(mx - ddy * 0.35, my + ddx * 0.35, mx + ddy * 0.35, my - ddx * 0.35, b.x + dx, b.y + dy);
          ctx.stroke();
          ctx.strokeStyle = vine2;
          ctx.lineWidth = lw * 1.0;
          ctx.stroke();
        }
      }
    }
    for (const s of centers) {
      const R = cs * 0.26;
      const pts = spiral(s.x + dx, s.y + dy, R, s.dir, s.dir > 0 ? 0 : Math.PI, 1.15);
      stroke(pts, vine, lw * 2.4);
      stroke(pts, vine2, lw * 1.1);
      // leaves along spiral
      for (let k = 6; k < pts.length - 6; k += 7) {
        const p = pts[k];
        leafAt(p[0], p[1], p[2] + (s.dir * Math.PI) / 2 + 0.4, R * 0.42 * (1 - k / pts.length * 0.6), leaf);
      }
      const end = pts[pts.length - 1];
      rosette(end[0], end[1], R * 0.42, 8, flower, flowerCore);
    }
    // small rosettes between
    for (const s of centers) {
      if (s.dir < 0) continue;
      rosette(s.x + cs * 0.5 + dx, s.y + dy, cs * 0.07, 6, flowerCore, flower);
      rosette(s.x + dx, s.y + cs * 0.5 + dy, cs * 0.06, 5, leaf, flower);
    }
  });

  if (tileGrid) {
    ctx.strokeStyle = `rgba(0,0,0,${gridAlpha})`;
    ctx.lineWidth = Math.max(1, size / 512);
    const g = size / tileGrid;
    for (let i = 0; i <= tileGrid; i++) {
      ctx.beginPath();
      ctx.moveTo(i * g, 0);
      ctx.lineTo(i * g, size);
      ctx.moveTo(0, i * g);
      ctx.lineTo(size, i * g);
      ctx.stroke();
    }
  }
  noiseFill(ctx, size, size, 10, r);
  return c;
}

// ---------- ogee lattice over arabesque (dome skins) ----------
export function latticeOver(c, { cols = 4, rows = 3, color = P.white, width = 6, outline = P.black, fill = null } = {}) {
  const ctx = c.getContext('2d');
  const w = c.width,
    h = c.height;
  const cw = w / cols,
    rh = h / rows;
  const path = (phase) => {
    ctx.beginPath();
    for (let i = -1; i <= cols; i++) {
      const x0 = (i + phase) * cw;
      for (let k = 0; k <= 60; k++) {
        const t = k / 60;
        const y = t * h;
        const x = x0 + Math.sin(t * rows * Math.PI * 2) * cw * 0.25;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    }
  };
  const drawLattice = () => {
    for (const phase of [0, 0.5]) {
      ctx.save();
      if (phase) {
        ctx.translate(0, rh / 2);
      }
      path(phase);
      ctx.restore();
      ctx.stroke();
    }
  };
  // ogee: two families of sine curves offset by half period -> ogival cells
  const curves = [];
  for (let i = -1; i <= cols; i++) {
    for (const sgn of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= 120; k++) {
        const t = k / 120;
        const y = t * h;
        const x = (i + 0.5) * cw + sgn * Math.sin(t * rows * Math.PI * 2) * cw * 0.5;
        pts.push([x, y]);
      }
      curves.push(pts);
    }
  }
  const strokeAll = (col, lw) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    for (const pts of curves) {
      ctx.beginPath();
      pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
  };
  if (outline) strokeAll(outline, width * 1.8);
  strokeAll(color, width);
  // knots
  for (let i = -1; i <= cols; i++)
    for (let j = 0; j <= rows * 2; j++) {
      const x = (i + 0.5) * cw,
        y = (j * h) / (rows * 2);
      ctx.fillStyle = fill || color;
      ctx.beginPath();
      ctx.arc(x, y, width * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  void drawLattice;
  return c;
}

// ---------- girih 8-point star field ----------
export function starCanvas({ size = 512, n = 4, ground = P.turq, star = P.lapis, cross = P.white, line = P.white, seed = 11 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, size, size);
  const g = size / n;
  const star8 = (x, y, R, col) => {
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8 + Math.PI / 8;
      const rr = k % 2 ? R * 0.62 : R;
      const px = x + rr * Math.cos(a),
        py = y + rr * Math.sin(a);
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = g * 0.03;
    ctx.stroke();
  };
  const crossAt = (x, y, R) => {
    ctx.beginPath();
    const s = R * 0.38;
    ctx.moveTo(x - s, y - R);
    ctx.lineTo(x + s, y - R);
    ctx.lineTo(x + s, y - s);
    ctx.lineTo(x + R, y - s);
    ctx.lineTo(x + R, y + s);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x + s, y + R);
    ctx.lineTo(x - s, y + R);
    ctx.lineTo(x - s, y + s);
    ctx.lineTo(x - R, y + s);
    ctx.lineTo(x - R, y - s);
    ctx.lineTo(x - s, y - s);
    ctx.closePath();
    ctx.fillStyle = cross;
    ctx.fill();
    ctx.strokeStyle = P.lapisDeep;
    ctx.lineWidth = g * 0.02;
    ctx.stroke();
  };
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      star8(i * g, j * g, g * 0.42, star);
      ctx.fillStyle = P.yellow;
      ctx.beginPath();
      ctx.arc(i * g, j * g, g * 0.1, 0, Math.PI * 2);
      ctx.fill();
      crossAt((i + 0.5) * g, (j + 0.5) * g, g * 0.3);
    }
  noiseFill(ctx, size, size, 8, rng(seed));
  return c;
}

// ---------- banna'i minaret skin: brick + glazed lozenge net ----------
export function bannaiCanvas({ size = 512, ground = P.brick, a = P.turq, b = P.lapis, rows = 8, cols = 6 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, size, size);
  const cw = size / cols,
    rh = size / rows;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = i * cw + cw / 2,
        y = j * rh + rh / 2;
      ctx.fillStyle = (i + j) % 2 ? a : b;
      ctx.beginPath();
      ctx.moveTo(x, y - rh * 0.48);
      ctx.lineTo(x + cw * 0.48, y);
      ctx.lineTo(x, y + rh * 0.48);
      ctx.lineTo(x - cw * 0.48, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = P.white;
      ctx.fillRect(x - cw * 0.08, y - rh * 0.08, cw * 0.16, rh * 0.16);
    }
  ctx.strokeStyle = 'rgba(80,50,20,0.35)';
  ctx.lineWidth = 2;
  for (let j = 0; j <= rows * 4; j++) {
    ctx.beginPath();
    ctx.moveTo(0, (j * rh) / 4);
    ctx.lineTo(size, (j * rh) / 4);
    ctx.stroke();
  }
  noiseFill(ctx, size, size, 12, rng(5));
  return c;
}

// ---------- calligraphy band ----------
export function calligraphyCanvas({
  text = 'بسم الله الرحمن الرحیم',
  w = 2048,
  h = 256,
  ground = P.lapisDeep,
  ink = P.white,
  border = P.yellow,
  font = 'Amiri',
  reps = 2,
  weight = 700,
} = {}) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  // small arabesque vines behind the letters
  ctx.strokeStyle = P.turq;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = h * 0.012;
  for (let x = 0; x < w; x += h * 0.5) {
    ctx.beginPath();
    ctx.arc(x + h * 0.25, h * 0.55, h * 0.18, 0, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  const fs = h * 0.62;
  ctx.font = `${weight} ${fs}px "${font}", "Noto Naskh Arabic", "Geeza Pro", serif`;
  for (let i = 0; i < reps; i++) {
    const cx = ((i + 0.5) * w) / reps;
    const m = ctx.measureText(text).width;
    const sx = Math.min(1.6, (w / reps) * 0.92 / m);
    ctx.save();
    ctx.translate(cx, h * 0.52);
    ctx.scale(sx, 1);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = h * 0.02;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = border;
  ctx.fillRect(0, 0, w, h * 0.05);
  ctx.fillRect(0, h * 0.95, w, h * 0.05);
  ctx.fillStyle = P.turq;
  ctx.fillRect(0, h * 0.05, w, h * 0.025);
  ctx.fillRect(0, h * 0.925, w, h * 0.025);
  return c;
}

// ---------- plain tiled field (e.g. turquoise hexagons for walls) ----------
export function hexTileCanvas({ size = 256, a = P.turq, b = P.lapis, line = P.white } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, size, size);
  const n = 4;
  const R = size / n / 2;
  for (let j = -1; j <= n * 2; j++)
    for (let i = -1; i <= n; i++) {
      const x = i * R * 2 + (j % 2) * R;
      const y = j * R;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const ang = (k * Math.PI) / 2;
        const px = x + Math.cos(ang) * R * 0.95,
          py = y + Math.sin(ang) * R * 0.95;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = a;
      ctx.fill();
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  return c;
}

// ---------- pishtaq / facade composition ----------
// Draws a full facade image for a rectangular frame W x H (meters) containing a
// pointed arch opening. Arch geometry is passed in as outline points (meters).
export function facadeCanvas({
  W,
  H,
  archPts, // array of [x,y] in meters, x centered at 0, y from ground
  px = 40, // pixels per meter
  maxPx = 2048,
  field, // canvas used as spandrel pattern
  band, // calligraphy canvas for frame band
  bandW = 1.2,
  border = 0.35,
  dado = 0, // height of marble dado
  ground = P.lapisDeep,
  frameColor = P.turq,
  brick = null, // brick canvas to use outside tile panel (margins)
  brickMargin = 0,
  archFill = null, // canvas pattern for a blind arch interior
  archFillScale = 1.5, // meters per pattern repeat
  fieldScale = 2.2,
}) {
  let s = px;
  if (W * s > maxPx) s = maxPx / W;
  if (H * s > maxPx) s = Math.min(s, maxPx / H);
  const cw = Math.round(W * s),
    ch = Math.round(H * s);
  const c = canvas(cw, ch);
  const ctx = c.getContext('2d');
  const X = (x) => (x + W / 2) * s;
  const Y = (y) => ch - y * s;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, cw, ch);
  if (brick) {
    const pat = ctx.createPattern(brick, 'repeat');
    ctx.save();
    ctx.scale(s / 40, s / 40);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, (cw * 40) / s, (ch * 40) / s);
    ctx.restore();
  }
  const m = brickMargin;
  // tile field
  if (field) {
    const pat = ctx.createPattern(field, 'repeat');
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(-W / 2 + m), Y(H - m), (W - 2 * m) * s, (H - 2 * m - dado) * s);
    ctx.clip();
    const k = (s * fieldScale) / field.width; // meters per pattern repeat
    ctx.scale(k, k);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, cw / k, ch / k);
    ctx.restore();
  }
  // outer border
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = border * s;
  ctx.strokeRect(X(-W / 2 + m) + (border * s) / 2, Y(H - m) + (border * s) / 2, (W - 2 * m) * s - border * s, (H - 2 * m) * s - border * s);
  ctx.strokeStyle = P.white;
  ctx.lineWidth = Math.max(2, 0.06 * s);
  ctx.strokeRect(X(-W / 2 + m) + border * s, Y(H - m) + border * s, (W - 2 * m) * s - 2 * border * s, (H - 2 * m) * s - 2 * border * s);

  if (archFill && archPts) {
    const pat = ctx.createPattern(archFill, 'repeat');
    ctx.save();
    ctx.beginPath();
    archPts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
    ctx.closePath();
    ctx.clip();
    const k = (s * archFillScale) / archFill.width;
    ctx.scale(k, k);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, cw / k, ch / k);
    ctx.restore();
  }
  // calligraphy band as inverted U around the arch
  if (band && archPts) {
    const aw = Math.max(...archPts.map((p) => Math.abs(p[0]))) * 2;
    const ah = Math.max(...archPts.map((p) => p[1]));
    const gx = aw / 2 + bandW * 0.7 + border;
    const top = Math.min(H - m - border - bandW, ah + bandW * 0.9);
    const drawBand = (x0, y0, x1, y1, vertical) => {
      ctx.save();
      if (!vertical) {
        ctx.drawImage(band, X(x0), Y(y1), (x1 - x0) * s, (y1 - y0) * s);
      } else {
        // rotate band for vertical segments
        const bx = X(x0),
          by = Y(y1),
          bw = (x1 - x0) * s,
          bh = (y1 - y0) * s;
        ctx.translate(bx + bw / 2, by + bh / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(band, -bh / 2, -bw / 2, bh, bw);
      }
      ctx.restore();
    };
    drawBand(-gx - bandW, top, gx + bandW, top + bandW, false);
    drawBand(-gx - bandW, dado, -gx, top, true);
    drawBand(gx, dado, gx + bandW, top, true);
    // spandrel arabesque with a bold rosette each side
    // arch rope moulding
    ctx.beginPath();
    archPts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
    ctx.strokeStyle = P.turq;
    ctx.lineWidth = 0.45 * s;
    ctx.stroke();
    ctx.strokeStyle = P.white;
    ctx.lineWidth = 0.12 * s;
    ctx.setLineDash([0.2 * s, 0.12 * s]);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const sg of [-1, 1]) {
      const rx = sg * (aw / 2 + bandW * 0.2) * 0.72,
        ry = ah * 0.9;
      ctx.fillStyle = P.yellow;
      ctx.beginPath();
      ctx.arc(X(rx), Y(ry), 0.55 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.lapisDeep;
      ctx.beginPath();
      ctx.arc(X(rx), Y(ry), 0.32 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = P.white;
      ctx.lineWidth = 0.06 * s;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(X(rx) + Math.cos(a) * 0.32 * s, Y(ry) + Math.sin(a) * 0.32 * s);
        ctx.lineTo(X(rx) + Math.cos(a) * 0.55 * s, Y(ry) + Math.sin(a) * 0.55 * s);
        ctx.stroke();
      }
    }
  }
  // marble dado
  if (dado > 0) {
    const g = ctx.createLinearGradient(0, Y(dado), 0, Y(0));
    g.addColorStop(0, '#efe3c2');
    g.addColorStop(1, '#d8c9a3');
    ctx.fillStyle = g;
    ctx.fillRect(0, Y(dado), cw, dado * s);
    ctx.strokeStyle = 'rgba(120,90,50,0.5)';
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 1.2) {
      ctx.strokeRect(X(-W / 2 + x), Y(dado), 1.2 * s, dado * s);
    }
    ctx.fillStyle = 'rgba(160,120,70,0.15)';
    const r = rng(9);
    for (let i = 0; i < 300; i++) ctx.fillRect(r() * cw, Y(dado) + r() * dado * s, r() * 30, 1);
  }
  return c;
}

// ---------- Lotfollah interior dome: concentric lemon (turanj) net ----------
// u = azimuth (0..1), v = 0 at springing -> 1 at apex. Cells shrink toward apex.
export function lotfollahDomeInteriorCanvas({
  w = 2048,
  h = 1024,
  around = 32,
  bgParams = { ground: '#c88f2e', vine: '#f2e2b0', vine2: '#2a6f9a', leaf: '#e7c35a', flower: '#f6ecd0', flowerCore: '#2a6f9a' },
  netOuter = '#f4ecd6',
  netInner = '#2b8c9c',
  apex = '#f8e7a8',
} = {}) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const r = rng(21);
  // background: ochre-yellow arabesque
  const bg = arabesqueCanvas({ size: 256, ...bgParams, cells: 1, tileGrid: 0, seed: 4 });
  // rows of cells, spacing in elevation proportional to cos(elev) so cells stay ~square
  const rows = [];
  let phi = 0;
  const dTheta = (Math.PI * 2) / around;
  while (phi < Math.PI / 2 - 0.08) {
    const d = dTheta * Math.cos(phi) * 1.05;
    rows.push([phi, phi + d]);
    phi += d;
  }
  const V = (ph) => h - (ph / (Math.PI / 2)) * h; // canvas y
  // fill with background pattern, scaled per row so arabesque shrinks with cells
  for (const [a, b] of rows) {
    const y0 = V(b),
      y1 = V(a);
    const rowH = y1 - y0;
    const cellW = w / around;
    for (let i = 0; i < around; i++) {
      ctx.drawImage(bg, i * cellW, y0, cellW, rowH);
    }
  }
  // lemon-shaped lozenges: net of two diagonal families through cell corners
  const lemon = (cx, top, bot, halfW) => {
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.quadraticCurveTo(cx + halfW * 1.25, (top + bot) / 2, cx, bot);
    ctx.quadraticCurveTo(cx - halfW * 1.25, (top + bot) / 2, cx, top);
    ctx.closePath();
  };
  rows.forEach(([a, b], ri) => {
    const y0 = V(b),
      y1 = V(a);
    const cellW = w / around;
    const off = (ri % 2) * 0.5;
    for (let i = -1; i <= around; i++) {
      const cx = (i + 0.5 + off) * cellW;
      const pad = (y1 - y0) * 0.02;
      lemon(cx, y0 - (y1 - y0) * 0.5 + pad, y1 + (y1 - y0) * 0.5 - pad, cellW * 0.5);
      ctx.strokeStyle = netOuter;
      ctx.lineWidth = Math.max(2, cellW * 0.07);
      ctx.stroke();
      ctx.strokeStyle = netInner;
      ctx.lineWidth = Math.max(1, cellW * 0.03);
      ctx.stroke();
    }
  });
  // apex sunburst medallion
  const apexY = 0;
  const g = ctx.createLinearGradient(0, apexY, 0, h * 0.08);
  g.addColorStop(0, apex);
  g.addColorStop(1, 'rgba(200,143,46,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h * 0.08);
  noiseFill(ctx, w, h, 10, r);
  return c;
}

// ---------- ground materials ----------
export function pavingCanvas({ size = 512, color = '#cdb892', seed = 13, n = 6 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#9c8a6c';
  ctx.fillRect(0, 0, size, size);
  const g = size / n;
  const base = new THREE.Color(color);
  for (let j = 0; j < n; j++) {
    const off = (j % 2) * g * 0.5;
    for (let i = -1; i < n; i++) {
      const col = base.clone().offsetHSL(0, (r() - 0.5) * 0.05, (r() - 0.5) * 0.08);
      ctx.fillStyle = '#' + col.getHexString();
      ctx.fillRect(i * g + off + 2, j * g + 2, g - 4, g - 4);
    }
  }
  noiseFill(ctx, size, size, 22, r);
  return c;
}

export function grassCanvas({ size = 512, seed = 17 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#4d7a33';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const x = r() * size,
      y = r() * size;
    const l = 30 + r() * 25;
    ctx.fillStyle = `hsl(${85 + r() * 25},${40 + r() * 20}%,${l}%)`;
    ctx.fillRect(x, y, 1.5, 3 + r() * 3);
  }
  return c;
}

export function gravelCanvas({ size = 512, seed = 19, color = '#d2bf98' } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 12000; i++) {
    const x = r() * size,
      y = r() * size;
    ctx.fillStyle = `hsla(35,${20 + r() * 20}%,${55 + r() * 30}%,0.6)`;
    ctx.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
  }
  return c;
}

// tileable water normal map from periodic sine waves
export function waterNormalCanvas({ size = 256 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const r = rng(99);
  const waves = [];
  for (let i = 0; i < 14; i++) {
    waves.push({ kx: Math.round((r() - 0.5) * 16), ky: Math.round((r() - 0.5) * 16), a: 0.4 + r(), p: r() * 6.28 });
  }
  const H = (x, y) => {
    let h = 0;
    for (const w of waves) h += w.a * Math.sin(((w.kx * x + w.ky * y) / size) * Math.PI * 2 + w.p);
    return h;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = H(x + 1, y) - H(x - 1, y);
      const dy = H(x, y + 1) - H(x, y - 1);
      const n = new THREE.Vector3(-dx * 0.6, -dy * 0.6, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

// coffered wooden ceiling (Ali Qapu talar)
export function woodCeilingCanvas({ size = 512 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a2b18';
  ctx.fillRect(0, 0, size, size);
  const n = 4,
    g = size / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = i * g + g / 2,
        y = j * g + g / 2;
      ctx.fillStyle = '#6b3f1f';
      ctx.fillRect(i * g + 4, j * g + 4, g - 8, g - 8);
      ctx.save();
      ctx.translate(x, y);
      for (let k = 0; k < 8; k++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = k % 2 ? '#c99a3e' : '#8a2f22';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(g * 0.36, g * 0.1);
        ctx.lineTo(g * 0.36, -g * 0.1);
        ctx.fill();
      }
      ctx.fillStyle = '#e1c46a';
      ctx.beginPath();
      ctx.arc(0, 0, g * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  ctx.strokeStyle = '#d7ae55';
  ctx.lineWidth = 3;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.moveTo(i * g, 0);
    ctx.lineTo(i * g, size);
    ctx.moveTo(0, i * g);
    ctx.lineTo(size, i * g);
    ctx.stroke();
  }
  return c;
}

// painted plaster (Safavid wall painting: floral on cream)
export function paintedPlasterCanvas({ size = 512, seed = 23 } = {}) {
  const c = arabesqueCanvas({ size, ground: '#e8d9b5', vine: '#8a5a2a', vine2: '#b88a3a', leaf: '#6f8f5a', flower: '#b64a3a', flowerCore: '#e0b050', cells: 2, tileGrid: 0, seed, lineW: 0.6 });
  return c;
}

// simple vertical gradient canvas
export function gradientCanvas(stops, w = 4, h = 256) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([t, col]) => g.addColorStop(t, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return c;
}

// Arcade bay face: brick with a tile-framed pointed arch and tiled spandrels
export function bayFaceCanvas({ W, H, arches, px = 48, spandrel, brick }) {
  const cw = Math.round(W * px),
    ch = Math.round(H * px);
  const c = canvas(cw, ch);
  const ctx = c.getContext('2d');
  const pat = ctx.createPattern(brick, 'repeat');
  ctx.save();
  ctx.scale(0.25, 0.25);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, cw * 4, ch * 4);
  ctx.restore();
  const X = (x) => (x + W / 2) * px;
  const Y = (y) => ch - y * px;
  for (const a of arches) {
    const { pts, frame = 0.35, top } = a;
    const aw = Math.max(...pts.map((p) => Math.abs(p[0]))) * 2;
    const ah = Math.max(...pts.map((p) => p[1]));
    const base = Math.min(...pts.map((p) => p[1]));
    // rectangular tile frame around arch
    const fx0 = -aw / 2 - frame,
      fx1 = aw / 2 + frame,
      fy1 = top ?? ah + frame;
    if (spandrel) {
      const sp = ctx.createPattern(spandrel, 'repeat');
      ctx.save();
      ctx.beginPath();
      ctx.rect(X(fx0), Y(fy1), (fx1 - fx0) * px, (fy1 - base) * px);
      ctx.clip();
      ctx.scale(0.18, 0.18);
      ctx.fillStyle = sp;
      ctx.fillRect(0, 0, cw / 0.18, ch / 0.18);
      ctx.restore();
    }
    ctx.strokeStyle = P.turq;
    ctx.lineWidth = frame * px * 0.35;
    ctx.strokeRect(X(fx0), Y(fy1), (fx1 - fx0) * px, (fy1 - base) * px);
    ctx.strokeStyle = P.white;
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
    ctx.lineWidth = frame * px * 0.5;
    ctx.strokeStyle = P.white;
    ctx.stroke();
    ctx.lineWidth = frame * px * 0.25;
    ctx.strokeStyle = P.cobalt;
    ctx.stroke();
  }
  return c;
}
