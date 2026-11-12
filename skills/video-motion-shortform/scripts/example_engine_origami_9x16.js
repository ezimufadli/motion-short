// =====================================================================
// ORIGAMI STUDIO — vertical 9:16 (1080x1920 logical) explainer
// "Rumus prompt AI: Peran + Tugas + Konteks + Format"
// Rendering, texture, crease and finishing passes are ported from the
// reference styles/origami.js EXPLAIN() unchanged in strength.
// Every frame is a pure function of t.
// =====================================================================
(function () {
  const TAU = Math.PI * 2;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };

  // paper fibre texture tile (reference makeTex, unchanged)
  const makeTex = (seed) => {
    const S = 256, cv = H.layer(S, S), x = cv.getContext('2d'), r = H.rng(seed);
    const img = x.createImageData(S, S), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = r(); const w = n > 0.5; d[i] = d[i + 1] = d[i + 2] = w ? 255 : 0; d[i + 3] = Math.abs(n - 0.5) * 34; }
    x.putImageData(img, 0, 0);
    x.lineCap = 'round';
    for (let n = 0; n < 260; n++) {
      const px = r() * S, py = r() * S, len = r.range(3, 14), a = r() * TAU;
      x.strokeStyle = r() < 0.6 ? `rgba(255,255,255,${r.range(0.06, 0.16)})` : `rgba(60,40,20,${r.range(0.04, 0.09)})`;
      x.lineWidth = r.range(0.4, 0.9);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        x.beginPath(); x.moveTo(px + ox * S, py + oy * S); x.lineTo(px + ox * S + Math.cos(a) * len, py + oy * S + Math.sin(a) * len); x.stroke();
      }
    }
    return cv;
  };

  const OXC = {};
  const SG = (px) => `700 ${px}px "Space Grotesk"`;
  const SM = (px, w = 700) => `${w} ${px}px "Space Mono"`;
  const BROWN = [176, 122, 76], CREAM = [246, 242, 233], INK = '#23242a', GREY = '#5e5e66', RED = [214, 74, 58], GREEN = [92, 170, 104], MUS = [241, 182, 68], IND = [58, 82, 150], CORAL = [240, 138, 126], TEAL = [44, 160, 150];
  // the four parts of a prompt: paper colour + print colour
  const PARTS = [
    { name: 'PERAN', q: 'AI jadi siapa?', col: [232, 112, 84], ink: '#d4473a' },
    { name: 'TUGAS', q: 'Mau dia ngapain?', col: MUS, ink: '#b8800c' },
    { name: 'KONTEKS', q: 'Buat siapa, kenapa?', col: TEAL, ink: '#23887e' },
    { name: 'FORMAT', q: 'Hasilnya kayak apa?', col: IND, ink: '#34509c' },
  ];

  // ----------------------------------------------------------------- timeline
  // stations along the long studio table (world x)
  const SX = [0, 6.5, 13, 19.5, 26, 32.5, 39, 45.5];
  const DOLLY = [[2.7, 3.4], [6.8, 7.5], [13.6, 14.3], [17.7, 18.4], [21.7, 22.4], [25.7, 26.4], [29.7, 30.4]];
  const PT0 = [14, 18, 22, 26]; // start of each part beat
  const DURATION = 40;

  const EXPLAIN = (ctx, W, H_, t, opts = {}) => {
    const seg = (a, b) => H.ease.inOut(H.clamp((t - a) / (b - a)));
    const pop = (a, d = 0.45) => { const u = H.clamp((t - a) / d); if (u <= 0) return 0; const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
    const typed = (s, a, b) => s.slice(0, Math.round(s.length * H.clamp((t - a) / (b - a))));

    // ---- camera: dollies along the table, pushes in on the wrong answer, rises for the CTA ----
    let cx = 0; DOLLY.forEach(([a, b]) => { cx += 6.5 * seg(a, b); });
    const zoom = seg(5.0, 5.4) * (1 - seg(6.2, 6.7));
    const rise = seg(34.9, 35.8);
    const E = [cx + zoom * 0.3, 4.3 - zoom * 0.2 - rise * 0.2, 7.6 - zoom * 0.6 - rise * 0.6];
    const TG = [cx + zoom * 0.3, 1.25 + zoom * 0.75, 0.1 - zoom * 0.9 + rise * 0.4];
    const fwd = norm(sub(TG, E)), right = norm(cross(fwd, [0, 1, 0])), up = cross(right, fwd);
    const F = 1500, PCX = W / 2, PCY = H_ * 0.455;
    const proj = (p) => { const d = sub(p, E); const z = dot(d, fwd); return [PCX + (F * dot(d, right)) / z, PCY - (F * dot(d, up)) / z, z]; };
    const Lkey = norm([-0.55, 1.0, 0.55]), Lfill = norm([0.9, 0.25, 0.35]), Ls = mul(Lkey, -1);
    const faces = [];
    const face = (pts, col, extra = {}) => faces.push({ pts, col, ...extra });

    // ---- prop builders (tent / arrowFlat / bubble / strip / column / star from the reference) ----
    const tent = (x, z, w, h, rot, u, paint, col = CREAM) => {
      if (u <= 0) return;
      const dz = 0.34, Lf = Math.hypot(h, dz), th = Math.atan2(h, dz) * Math.min(1, u);
      const T = (p) => add(rotY(p, rot), [x, 0, z]);
      const rid = [0, Lf * Math.sin(th), dz - Lf * Math.cos(th)];
      const BLf = [-w, 0.003, dz], BRf = [w, 0.003, dz], TR = [w, rid[1], rid[2]], TL = [-w, rid[1], rid[2]];
      const bz = rid[2] - dz * Math.min(1, u);
      face([TL, TR, [w, 0.003, bz], [-w, 0.003, bz]].map(T), col.map((v) => v * 0.97));
      face([BLf, BRf, TR, TL].map(T), col, { map: [T(TL), T(TR), T(BLf)], paint });
    };
    const arrowFlat = (x0, z0, x1, z1, p, col, label) => {
      if (p <= 0) return;
      const ex = H.lerp(x0, x1, p), ez = H.lerp(z0, z1, p), a = Math.atan2(ez - z0, ex - x0);
      const len = Math.hypot(ex - x0, ez - z0), dx = Math.cos(a), dz = Math.sin(a), nx = -dz, nz2 = dx;
      const hw = 0.22, hl = Math.min(0.55, len * 0.5), y = 0.012, cr = 0.05;
      const P = (s, n, yy = y) => [x0 + dx * s + nx * n, yy, z0 + dz * s + nz2 * n];
      const sEnd = len - hl;
      const fr = nz2 > 0;
      const lab = label ? { map: fr ? [P(0, 0, y + cr), P(sEnd, 0, y + cr), P(0, hw)] : [P(sEnd, 0, y + cr), P(0, 0, y + cr), P(sEnd, -hw)], paint: label } : {};
      face([P(0, -hw), P(sEnd, -hw), P(sEnd, 0, y + cr), P(0, 0, y + cr)], col, fr ? {} : lab);
      face([P(0, 0, y + cr), P(sEnd, 0, y + cr), P(sEnd, hw), P(0, hw)], col.map((v) => v * 0.98), fr ? lab : {});
      face([P(sEnd, -hw * 2.2), P(len, 0, y + cr * 0.4), P(sEnd, 0, y + cr * 1.6)], col);
      face([P(sEnd, 0, y + cr * 1.6), P(len, 0, y + cr * 0.4), P(sEnd, hw * 2.2)], col);
    };
    // standing speech bubble panel (reference bubble, with a size factor s); flips about its vertical axis (phi)
    const bubble = (x, z, u, phi, front, back, shake = 0, s = 1) => {
      if (u <= 0) return;
      const w = 1.0, h = 0.66 * Math.min(1, u), y0 = 0.55;
      const T = (p) => add(rotY(mul(p, s), phi), [x + shake, 0, z]);
      const seeBack = Math.cos(phi) < 0;
      const TL = T([-w * 0.85, y0 + h * 1.2, 0.002]), TR = T([w * 0.85, y0 + h * 1.2, 0.002]), BL = T([-w * 0.85, y0 - h * 0.05, 0.002]);
      const map = { map: seeBack ? [TR, TL, T([w * 0.85, y0 - h * 0.05, 0.002])] : [TL, TR, BL], paint: seeBack ? back : front };
      const P2 = [[-w, y0 + h * 0.2], [-w * 0.8, y0 - h * 0.05], [-0.5, y0 - h * 0.15], [-0.75, 0.02], [-0.2, y0 - h * 0.18], [w * 0.8, y0 - h * 0.1], [w, y0 + h * 0.4], [w * 0.85, y0 + h * 1.2], [-w * 0.85, y0 + h * 1.25]];
      const A0 = [0.38, y0 + h * 1.4], A1 = [-0.05, y0 - h * 0.4];
      const sd = (p) => (A1[0] - A0[0]) * (p[1] - A0[1]) - (A1[1] - A0[1]) * (p[0] - A0[0]);
      const halves = [[], []];
      P2.forEach((p, i) => {
        const q = P2[(i + 1) % P2.length], sp = sd(p), sq = sd(q);
        halves[sp >= 0 ? 0 : 1].push([p[0], p[1], 0]);
        if ((sp >= 0) !== (sq >= 0)) { const k = sp / (sp - sq), m = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, 0.045]; halves[0].push(m); halves[1].push(m); }
      });
      halves.forEach((hp, i) => { if (hp.length >= 3) face(hp.map(T), CREAM.map((v) => v * (i ? 1.0 : 0.97)), map); });
      return (p) => T(p); // local->world, for strips on the bubble
    };
    const strip = (a, b, wdt, col) => {
      const d = sub(b, a), n = norm([-d[1], d[0], 0]), m = mul(add(a, b), 0.5);
      face([add(a, mul(n, wdt)), add(m, [n[0] * wdt, n[1] * wdt, 0.04]), add(m, [-n[0] * wdt, -n[1] * wdt, 0.04]), add(a, mul(n, -wdt))], col);
      face([add(m, [n[0] * wdt, n[1] * wdt, 0.04]), add(b, mul(n, wdt)), add(b, mul(n, -wdt)), add(m, [-n[0] * wdt, -n[1] * wdt, 0.04])], col.map((v) => v * 0.94));
    };
    const column = (x, z, hgt, col, r0 = 0.3) => {
      if (hgt <= 0.02) return;
      const n = 12;
      const ring = (y) => Array.from({ length: n }, (_, k) => { const a = ((k + 0.5) / n) * TAU, r = k % 2 ? r0 * 0.82 : r0; return [x + Math.cos(a) * r, y, z + Math.sin(a) * r]; });
      const A = ring(0.01), B = ring(hgt);
      for (let k = 0; k < n; k++) { const k2 = (k + 1) % n; face([A[k], A[k2], B[k2], B[k]], k % 2 ? col.map((v) => v * 0.92) : col); }
      const cc = [x, hgt + 0.035, z];
      for (let k = 0; k < n; k++) face([B[k], B[(k + 1) % n], cc], col.map((v) => Math.min(255, v * (k % 2 ? 1.0 : 1.06))));
    };
    const star = (x, y, z, s, spin) => {
      const c = [x, y, z], pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, rr = (i % 2 ? 0.42 : 1) * s; pts.push(add(c, rotY([Math.cos(a) * rr, -Math.sin(a) * rr, 0], spin))); }
      const f1 = add(c, rotY([0, 0, 0.3 * s], spin)), f2 = add(c, rotY([0, 0, -0.3 * s], spin));
      for (let i = 0; i < 10; i++) { face([pts[i], pts[(i + 1) % 10], f1], i % 2 ? MUS : MUS.map((v) => v * 0.85)); face([pts[(i + 1) % 10], pts[i], f2], MUS.map((v) => v * 0.8)); }
    };
    // standing paper panel with one vertical centre crease, hinged up from the table (u 0..1); lean = final tilt back
    const panel = (x, z, w, h, rot, u, paint, col = CREAM, lean = 0.12) => {
      if (u <= 0) return;
      const th = (Math.PI / 2 - lean) * Math.min(1, u);
      const T = (p) => add(rotY(p, rot), [x, 0, z]);
      const L = (px, py, pz = 0) => T([px, py * Math.sin(th) + 0.004, -py * Math.cos(th) + pz]);
      const ridge = 0.06 * Math.min(1, u);
      const TL = L(-w, h), TR = L(w, h), BL = L(-w, 0), BR = L(w, 0), TM = L(0, h, ridge), BM = L(0, 0, ridge);
      const map = { map: [TL, TR, BL], paint };
      face([BL, BM, TM, TL], col.map((v) => v * 0.98), map);
      face([BM, BR, TR, TM], col, map);
      return L;
    };
    const printer = (lines, opt = {}) => (c, w, h) => {
      c.fillStyle = opt.ink || INK; c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach(([txt, fr, yy, col, fnt]) => {
        if (!txt) return;
        const ff = fnt || SG;
        let px = fr * h; c.font = ff(px); const mw = c.measureText(txt).width; if (mw > w * 0.9) { px *= (w * 0.9) / mw; c.font = ff(px); }
        c.fillStyle = col || opt.ink || INK; c.fillText(txt, w / 2, h * yy);
      });
    };
    const bar = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

    // ================= scene =================
    // ---- BEAT 1 (0-3): hook — the question card folds up, the answer stamps in front ----
    {
      const x0 = SX[0], away = 1 - seg(3.35, 3.7);
      tent(x0, 0.4, 2.0, 1.6, 0, seg(0.05, 0.7) * away, printer([['Jawaban AI', 0.24, 0.3], ['kamu jelek?', 0.28, 0.64, '#e45a3e']]));
      const wob = t < 3.3 ? Math.sin(t * 9) * 0.03 : 0;
      bubble(x0 + 0.85, -2.1, pop(0.35, 0.45) * away, 0.12, printer([['?', 0.9, 0.52, '#e45a3e']]), null, wob, 1.6);
      tent(x0, 2.0, 1.85, 0.62, 0, pop(1.25, 0.4) * away, printer([['Bukan AI-nya.', 0.5, 0.55]]));
    }

    // ---- BEAT 2 (3-7): the 3-word prompt -> a generic answer (wrong) ----
    {
      const x0 = SX[1], away = 1 - seg(7.4, 7.8);
      tent(x0, 1.95, 2.0, 0.66, 0, seg(3.05, 3.45) * (1 - seg(5.0, 5.35)), (c, w, h) => {
        printer([['prompt kamu:', 0.27, 0.22, GREY, (p) => SM(p, 400)], ['"' + typed('ringkas laporan ini', 3.5, 4.2) + '"', 0.38, 0.66, INK, SM]])(c, w, h);
      });
      arrowFlat(x0 - 0.1, 1.35, x0 + 0.15, -0.55, seg(4.4, 4.8) * (1 - seg(5.0, 5.35)), MUS);
      const bu = pop(4.7, 0.4) * away;
      const shake = t > 5.1 && t < 5.6 ? Math.sin(t * 55) * 0.05 * (5.6 - t) * 2.2 : 0;
      const LB = bubble(x0 + 0.15, -1.6, bu, -0.05, printer([['Jawaban', 0.26, 0.36, GREY], ['generik...', 0.3, 0.66, GREY]]), null, shake, 1.7);
      if (LB && t > 5.1 && t < 7.8) {
        const xs = pop(5.1, 0.3) * away, c0 = LB([0.78, 1.32, 0.07]);
        strip(add(c0, [-0.32 * xs, 0.32 * xs, 0]), add(c0, [0.32 * xs, -0.32 * xs, 0]), 0.08, RED);
        strip(add(c0, [-0.32 * xs, -0.32 * xs, 0.03]), add(c0, [0.32 * xs, 0.32 * xs, 0.03]), 0.08, RED);
      }
    }

    // ---- BEAT 3 (7-11): the key number — ~21 words vs < 9 ----
    {
      const x0 = SX[2], away = 1 - seg(10.9, 11.3);
      const n = Math.round(H.lerp(9, 21, Math.pow(H.clamp((t - 8.5) / 1.1), 1.6)));
      tent(x0 - 1.2, 0.9, 1.0, 1.5, 0.06, seg(7.15, 7.6) * away, printer([['< 9', 0.46, 0.38, '#6a6a70'], ['kata', 0.17, 0.74, GREY]]));
      tent(x0 + 1.2, 0.9, 1.0, 1.5, -0.06, seg(8.0, 8.5) * away, printer([['±' + n, 0.46, 0.38, t > 9.6 ? '#e45a3e' : INK], ['kata', 0.17, 0.74, GREY]]));
      column(x0 - 1.2, -0.9, (9 / 21) * 2.7 * H.ease.out(H.clamp((t - 7.25) / 0.5)) * away, [200, 196, 186]);
      column(x0 + 1.2, -0.9, (n / 21) * 2.7 * H.ease.out(H.clamp((t - 8.1) / 0.5)) * away, n >= 21 ? RED : MUS);
      tent(x0 - 1.15, 2.15, 0.95, 0.5, 0.06, seg(8.0, 8.3) * away, printer([['kita biasanya', 0.44, 0.55, GREY]]));
      tent(x0 + 1.15, 2.15, 0.95, 0.5, -0.06, seg(8.9, 9.2) * away, printer([['prompt efektif', 0.44, 0.55, '#e45a3e']]));
      const sp = pop(9.6, 0.5) * away;
      if (sp > 0) star(x0 + 1.2, 3.15 + 0.1 * Math.sin(t * 3), -0.9, 0.42 * sp, (t - 9.6) * 2.5);
    }

    // ---- BEAT 4 (11-14): the number card refolds into the formula heading ----
    {
      const x0 = SX[2], away = 1 - seg(14.3, 14.6);
      tent(x0, -0.2, 2.0, 1.55, 0, seg(11.3, 11.9) * away, printer([['Rumusnya:', 0.17, 0.27, GREY], ['4 unsur', 0.38, 0.64, '#e45a3e']]));
      PARTS.forEach((P, i) => {
        const r = Math.floor(i / 2), cI = i % 2;
        tent(x0 + (cI ? 1.05 : -1.05), 1.4 + r * 0.75, 0.95, 0.42, 0, pop(12.15 + i * 0.3, 0.4) * away, printer([[P.name, 0.56, 0.56, '#fbf7ee']]), P.col);
      });
    }

    // ---- BEATS 5-8 (14-30): one station per part ----
    const EX = [
      ['"Kamu analis', 'data senior."'],
      ['"Ringkas laporan', 'penjualan Oktober."'],
      ['"Untuk rapat direksi,', 'fokus ke penurunan."'],
      ['"3 poin,', 'maks 80 kata."'],
    ];
    PARTS.forEach((P, i) => {
      const x0 = SX[3 + i], t0 = PT0[i], away = 1 - seg(t0 + 4.4, t0 + 4.7);
      if (t < t0 - 1.0 || t > t0 + 4.8) return;
      // prop at the back of the station, taller than the title card
      const up = seg(t0 + 0.15, t0 + 0.7) * away;
      if (i === 0) { // ID badge on a paper lanyard clip
        const L = panel(x0 + 1.25, -1.9, 0.72, 2.9, -0.18, up, (c, w, h) => {
          bar(c, 0, 0, w, h * 0.16, '#e4704f');
          c.fillStyle = '#e8d9c6'; c.beginPath(); c.arc(w / 2, h * 0.42, w * 0.2, 0, TAU); c.fill();
          c.fillStyle = '#c9654c'; c.beginPath(); c.arc(w / 2, h * 0.39, w * 0.11, 0, TAU); c.fill();
          c.beginPath(); c.ellipse(w / 2, h * 0.53, w * 0.18, h * 0.07, 0, Math.PI, TAU); c.fill();
          bar(c, w * 0.2, h * 0.7, w * 0.6, h * 0.05, '#5e5e66'); bar(c, w * 0.28, h * 0.8, w * 0.44, h * 0.035, '#a9a59c');
        }, CREAM, 0.1);
        if (L && up > 0.98) { strip(L(-0.12, 2.9, 0.02), L(0, 3.25, 0.02), 0.06, [200, 196, 186]); strip(L(0.12, 2.9, 0.02), L(0, 3.25, 0.02), 0.06, [200, 196, 186]); }
      } else if (i === 1) { // checklist clipboard; the first box gets a green tick
        const L = panel(x0 + 1.25, -1.9, 0.8, 2.9, -0.18, up, (c, w, h) => {
          bar(c, w * 0.32, 0, w * 0.36, h * 0.07, '#8a8478');
          for (let k = 0; k < 3; k++) { const y = h * (0.24 + k * 0.24); c.strokeStyle = '#5e5e66'; c.lineWidth = w * 0.025; c.strokeRect(w * 0.12, y - w * 0.08, w * 0.16, w * 0.16); bar(c, w * 0.36, y - w * 0.02, w * (k ? 0.42 : 0.5), w * 0.05, '#a9a59c'); }
        }, [236, 226, 204], 0.1);
        const vs = pop(t0 + 2.0, 0.35) * away;
        if (L && vs > 0) { const a = L(-0.5, 2.2, 0.08); strip(add(a, [-0.14 * vs, 0.02, 0]), add(a, [0.0, -0.14 * vs, 0]), 0.05, GREEN); strip(add(a, [0.0, -0.14 * vs, 0.02]), add(a, [0.28 * vs, 0.24 * vs, 0.02]), 0.05, GREEN); }
      } else if (i === 2) { // folder: back sheet standing, front cover leaning out, a tab on top
        panel(x0 + 1.25, -2.05, 0.85, 2.8, -0.18, up, (c, w, h) => {
          bar(c, w * 0.1, h * 0.12, w * 0.5, h * 0.07, '#23887e');
          for (let k = 0; k < 5; k++) bar(c, w * 0.1, h * (0.3 + k * 0.1), w * (k % 2 ? 0.6 : 0.78), h * 0.03, '#a9a59c');
        }, CREAM, 0.08);
        panel(x0 + 1.25, -1.8, 0.9, 1.9, -0.18, up, (c, w, h) => { bar(c, w * 0.62, 0, w * 0.3, h * 0.12, '#1f7a71'); }, TEAL, 0.42);
      } else { // numbered list sheet: 1-2-3 bars
        panel(x0 + 1.25, -1.9, 0.8, 2.9, -0.18, up, (c, w, h) => {
          c.textAlign = 'center'; c.textBaseline = 'middle';
          for (let k = 0; k < 3; k++) { const y = h * (0.22 + k * 0.25); c.fillStyle = '#34509c'; c.font = SG(w * 0.2); c.fillText(String(k + 1), w * 0.2, y); bar(c, w * 0.36, y - w * 0.03, w * (k === 1 ? 0.4 : 0.5), w * 0.06, '#a9a59c'); }
        }, [228, 232, 242], 0.1);
      }
      // title card: number, part name, the question it answers
      tent(x0 - 0.45, 0.15, 1.45, 1.75, 0.04, seg(t0 - 0.25, t0 + 0.3) * away, printer([[String(i + 1), 0.4, 0.27, P.ink], [P.name, 0.21, 0.6], [P.q, 0.155, 0.86, GREY]]));
      // example card: the line of the prompt, typed on
      const ex = EX[i], all = ex.join(' '), shown = typed(all, t0 + 1.15, t0 + 2.35);
      let k0 = 0; const rows = ex.map((ln) => { const r = shown.slice(k0, k0 + ln.length); k0 += ln.length + 1; return r; });
      const hh = ex.length === 3 ? 1.05 : 0.72;
      tent(x0 - 0.1, 2.0, 1.95, hh, 0, seg(t0 + 0.7, t0 + 1.1) * away, (c, w, h) => {
        bar(c, 0, 0, w * 0.035, h, H.rgba(P.col, 1));
        const fr = ex.length === 3 ? 0.21 : 0.29;
        rows.forEach((r, j) => printer([[r, fr, (j + 0.5) / ex.length * 0.92 + 0.04, INK, SM]])(c, w, h));
      });
      // arrow on the table to the next station
      if (i < 3) arrowFlat(x0 + 1.9, 1.05, x0 + 4.5, 1.05, seg(t0 + 3.05, t0 + 3.75), P.col);
    });

    // ---- BEAT 9 (30-35): the four parts print onto one prompt sheet; the answer bubble flips to "siap kirim" ----
    const SHORT = ['analis data senior', 'ringkas laporan Okt', 'untuk rapat direksi', '3 poin, maks 80 kata'];
    {
      const x0 = SX[7], away = 1 - seg(34.85, 35.25);
      panel(x0 - 0.05, 1.15, 1.78, 2.15, 0, seg(30.1, 30.65) * away, (c, w, h) => {
        c.textBaseline = 'middle'; c.textAlign = 'left';
        c.font = SM(h * 0.06, 400); c.fillStyle = GREY; c.fillText('prompt kamu sekarang:', w * 0.06, h * 0.09);
        PARTS.forEach((P, i) => {
          const st = 30.75 + i * 0.4; if (t < st) return;
          const y = h * (0.26 + i * 0.205);
          bar(c, w * 0.05, y - h * 0.075, w * 0.03, h * 0.15, H.rgba(P.col, 1));
          c.font = SG(h * 0.055); c.fillStyle = P.ink; c.fillText(P.name, w * 0.11, y - h * 0.055);
          let px = h * 0.085; c.font = SM(px); const txt = typed(SHORT[i], st, st + 0.35), mw = c.measureText(SHORT[i]).width;
          if (mw > w * 0.86) { px *= (w * 0.86) / mw; c.font = SM(px); }
          c.fillStyle = INK; c.fillText(txt, w * 0.11, y + h * 0.04);
        });
      }, [244, 240, 230], 0.16);
      arrowFlat(x0 + 1.95, 1.5, x0 + 1.75, -1.9, seg(32.45, 32.8) * away, MUS);
    }
    // bubble survives into the CTA
    {
      const x0 = SX[7];
      const bu = pop(32.6, 0.4), phi = Math.PI * seg(33.05, 33.45);
      const L = bubble(x0 + 0.75, -3.3, bu, phi, printer([['Jawaban', 0.26, 0.36, GREY], ['generik...', 0.3, 0.66, GREY]]), printer([['Siap', 0.3, 0.34, '#2f8a5a'], ['kirim!', 0.34, 0.68, '#2f8a5a']]), 0, 1.5);
      const vs = pop(33.5, 0.35);
      if (L && vs > 0) { const c0 = L([0.62, 1.42, 0.06]); strip(add(c0, [-0.3 * vs, 0.02, 0]), add(c0, [-0.08 * vs, -0.24 * vs, 0]), 0.08, GREEN); strip(add(c0, [-0.08 * vs, -0.24 * vs, 0.02]), add(c0, [0.42 * vs, 0.36 * vs, 0.02]), 0.08, GREEN); }
    }

    // ---- BEAT 10 (35-40): takeaway + CTA ----
    {
      const x0 = SX[7];
      tent(x0, 0.75, 2.0, 1.45, 0, seg(35.3, 35.9), (c, w, h) => {
        const lines = [[['Peran', 0], [' + ', -1], ['Tugas', 1]], [['+ ', -1], ['Konteks', 2], [' + ', -1], ['Format', 3]]];
        c.textBaseline = 'middle'; c.textAlign = 'left';
        lines.forEach((ln, j) => {
          let px = h * 0.25; c.font = SG(px);
          let tw = ln.reduce((s, [s2]) => s + c.measureText(s2).width, 0);
          if (tw > w * 0.92) { px *= (w * 0.92) / tw; c.font = SG(px); tw = ln.reduce((s, [s2]) => s + c.measureText(s2).width, 0); }
          let xx = (w - tw) / 2;
          ln.forEach(([s2, pi]) => { c.fillStyle = pi < 0 ? GREY : PARTS[pi].ink; c.fillText(s2, xx, h * (0.32 + j * 0.36)); xx += c.measureText(s2).width; });
        });
      });
      tent(x0, 2.05, 1.75, 0.58, 0, pop(36.4, 0.45), (c, w, h) => {
        // bookmark glyph + label
        c.fillStyle = '#e45a3e'; const bx = w * 0.13, by = h * 0.22, bw = h * 0.36, bh = h * 0.58;
        c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw, by + bh); c.lineTo(bx + bw / 2, by + bh * 0.72); c.lineTo(bx, by + bh); c.closePath(); c.fill();
        c.font = SG(h * 0.46); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = INK; c.fillText('Save & follow', w * 0.25, h * 0.54);
      });
      const sp = pop(36.85, 0.5);
      if (sp > 0) star(x0 - 1.45, 2.75 + 0.1 * Math.sin(t * 3), -2.0, 0.36 * sp, (t - 36.85) * 2.5);
    }

    // ================= render (reference pipeline) =================
    faces.forEach((f) => {
      const [a, b, c] = f.pts;
      let n = norm(cross(sub(b, a), sub(c, a)));
      const cen = mul(f.pts.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / f.pts.length);
      if (dot(n, sub(E, cen)) < 0) n = mul(n, -1);
      const I = 0.36 + 0.7 * Math.max(0, dot(n, Lkey)) + 0.16 * Math.max(0, dot(n, Lfill)) + 0.1 * Math.max(0, -n[1]);
      f.rgb = f.col.map((ch, i) => Math.min(255, ch * I * [1.04, 1, 0.95][i]));
      f.I = I; f.n = n; f.cen = cen;
      f.sp = f.pts.map(proj); f.z = f.sp.reduce((s, p) => s + p[2], 0) / f.sp.length;
    });
    const vis = faces.filter((f) => f.sp.every((p) => p[2] > 0.5));
    {
      const ek = (p) => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000) + ',' + Math.round(p[2] * 1000);
      const edges = new Map();
      vis.forEach((f, fi) => f.pts.forEach((p, i) => {
        const q = f.pts[(i + 1) % f.pts.length], a = ek(p), b = ek(q), k = a < b ? a + '|' + b : b + '|' + a;
        const e = edges.get(k); if (e) e.push(fi); else edges.set(k, [fi]);
        (f.ek || (f.ek = []))[i] = k;
      }));
      vis.forEach((f, fi) => {
        f.ekind = f.ek.map((k) => {
          const fs = edges.get(k);
          if (!fs || fs.length !== 2) return 0;
          const g = vis[fs[0] === fi ? fs[1] : fs[0]];
          const d = dot(sub(g.cen, f.cen), f.n);
          return d > 0.004 ? -1 : d < -0.004 ? 1 : 0;
        });
      });
    }
    vis.sort((a, b) => b.z - a.z);
    // backdrop: seamless paper sweep (reference gradient, re-laid for a tall frame)
    const bgKey = 'bg' + W + 'x' + H_;
    ctx.drawImage(OXC[bgKey] || (OXC[bgKey] = (() => {
      const C = H.layer(W, H_), c = C.getContext('2d');
      const bg = c.createLinearGradient(0, 0, 0, H_);
      bg.addColorStop(0, '#c9d3cf'); bg.addColorStop(0.3, '#dde3de'); bg.addColorStop(0.5, '#e6e6de'); bg.addColorStop(1, '#d8d5ca');
      c.fillStyle = bg; c.fillRect(0, 0, W, H_);
      const spot = c.createRadialGradient(W * 0.44, H_ * 0.4, 40, W * 0.47, H_ * 0.45, H_ * 0.62); spot.addColorStop(0, 'rgba(255,252,240,0.6)'); spot.addColorStop(1, 'rgba(255,252,240,0)');
      c.fillStyle = spot; c.fillRect(0, 0, W, H_);
      c.globalAlpha = 0.6; c.fillStyle = c.createPattern(OXC.tex || (OXC.tex = makeTex(5)), 'repeat'); c.fillRect(0, 0, W, H_);
      return C;
    })()), 0, 0);
    const lowL = (key, sc0) => { const w = Math.ceil(W * sc0), h = Math.ceil(H_ * sc0); let L = OXC[key]; if (!L || L.width !== w || L.height !== h) { L = OXC[key] = H.layer(w, h); } const c = L.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h); c.setTransform(sc0, 0, 0, sc0, 0, 0); return [L, c]; };
    {
      const [SL, sc] = lowL('SLh', 0.5); sc.fillStyle = '#000';
      vis.forEach((f) => { if (f.pts.every((p) => p[1] < 0.02)) return; sc.beginPath(); f.pts.forEach((p, i) => { const s = proj(add(p, mul(Ls, p[1] / -Ls[1]))); i ? sc.lineTo(s[0], s[1]) : sc.moveTo(s[0], s[1]); }); sc.closePath(); sc.fill(); });
      const [CL, cc] = lowL('CLh', 0.5); cc.fillStyle = '#000';
      vis.forEach((f) => {
        let mn = 1e9; f.pts.forEach((p) => { if (p[1] < mn) mn = p[1]; });
        if (mn > 0.22) return;
        cc.beginPath(); f.pts.forEach((p, i) => { const s = proj([p[0], 0, p[2]]); i ? cc.lineTo(s[0], s[1]) : cc.moveTo(s[0], s[1]); }); cc.closePath(); cc.fill();
      });
      const w = SL.width, h = SL.height; let M = OXC.SM; if (!M || M.width !== w || M.height !== h) M = OXC.SM = H.layer(w, h);
      const m = M.getContext('2d'); m.globalAlpha = 1; m.filter = 'none'; m.fillStyle = '#fff'; m.fillRect(0, 0, w, h);
      m.filter = 'blur(6px)'; m.globalAlpha = 0.38; m.drawImage(SL, 0, 0);
      m.filter = 'blur(2.5px)'; m.globalAlpha = 0.6; m.drawImage(CL, 0, 0);
      m.filter = 'none'; m.globalAlpha = 1;
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(M, 0, 0, W, H_); ctx.restore();
    }
    const olKey = 'OL' + W + 'x' + H_;
    const OL = OXC[olKey] || (OXC[olKey] = H.layer(W, H_)), o = OL.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H_); o.lineJoin = 'round';
    const Lscr = [-0.6, -0.8];
    vis.forEach((f) => {
      const sp = f.sp;
      let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
      sp.forEach((p) => { if (p[0] < mnx) mnx = p[0]; if (p[0] > mxx) mxx = p[0]; if (p[1] < mny) mny = p[1]; if (p[1] > mxy) mxy = p[1]; });
      if (mxx < -20 || mnx > W + 20 || mxy < -20 || mny > H_ + 20) return;
      const gx = (mnx + mxx) / 2, gy = (mny + mxy) / 2, rr = Math.max(1, Math.max(mxx - mnx, mxy - mny) / 2);
      const g = o.createLinearGradient(gx + Lscr[0] * rr, gy + Lscr[1] * rr, gx - Lscr[0] * rr, gy - Lscr[1] * rr);
      g.addColorStop(0, H.rgba(f.rgb.map((v) => Math.min(255, v * 1.05)), 1)); g.addColorStop(1, H.rgba(f.rgb.map((v) => v * 0.94), 1));
      o.beginPath(); sp.forEach((p, i) => (i ? o.lineTo(p[0], p[1]) : o.moveTo(p[0], p[1]))); o.closePath();
      o.fillStyle = g; o.fill();
      o.strokeStyle = H.rgba(f.rgb, 1); o.lineWidth = 0.7; o.stroke();
      o.strokeStyle = `rgba(255,255,250,${0.05 + 0.08 * Math.min(1, f.I)})`; o.lineWidth = 0.6; o.stroke();
      for (const kind of [-1, 1]) {
        let any = false;
        sp.forEach((p, i) => { if (f.ekind[i] !== kind) return; if (!any) { o.beginPath(); any = true; } const q = sp[(i + 1) % sp.length]; o.moveTo(p[0], p[1]); o.lineTo(q[0], q[1]); });
        if (!any) continue;
        if (kind < 0) { o.strokeStyle = H.rgba(f.rgb.map((v) => v * 0.55), 0.55); o.lineWidth = 0.9; }
        else { o.strokeStyle = `rgba(255,250,242,${0.1 + 0.2 * H.clamp(f.I - 0.5)})`; o.lineWidth = 0.8; }
        o.stroke();
      }
      if (f.paint) {
        const [p0, p1, p3] = f.map.map(proj), cw = 400, ch = 400 * (Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) / Math.max(1, Math.hypot(p1[0] - p0[0], p1[1] - p0[1])));
        if (ch > 2 && ch < 4000) {
          o.save(); o.beginPath(); sp.forEach((p, i) => (i ? o.lineTo(p[0], p[1]) : o.moveTo(p[0], p[1]))); o.closePath(); o.clip();
          o.setTransform((p1[0] - p0[0]) / cw, (p1[1] - p0[1]) / cw, (p3[0] - p0[0]) / ch, (p3[1] - p0[1]) / ch, p0[0], p0[1]);
          f.paint(o, cw, ch); o.restore();
        }
      }
    });
    o.save(); o.globalCompositeOperation = 'source-atop'; o.globalAlpha = 0.9; o.fillStyle = o.createPattern(OXC.tex, 'repeat'); o.fillRect(0, 0, W, H_); o.restore();
    ctx.drawImage(OL, 0, 0);

    // ---- screen-space paper labels: corner tag + burned-in subtitle strip (inside the safe zone) ----
    paperLabel(ctx, 64, H_ * 0.155, 'TIPS AI · KERJA', SM(40), 'left');
    if (opts.sub) paperLabel(ctx, W / 2, H_ * 0.795, opts.sub, SG(50), 'center', W * 0.86, true);

    // emphasis: key-light flares on the wrong answer, the key number and the fixed answer
    const flash = Math.max(Math.exp(-Math.pow((t - 5.2) * 5, 2)), Math.exp(-Math.pow((t - 9.65) * 5, 2)), Math.exp(-Math.pow((t - 33.55) * 5, 2)));
    if (flash > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,240,215,${flash * 0.18})`; ctx.fillRect(0, 0, W, H_); ctx.restore(); }
    H.vignette(ctx, W, H_, 0.28, '30,40,40');
    H.grain(ctx, W, H_, 0.022, 3 + Math.floor(t * 24));
    if (opts.safe) { ctx.save(); ctx.fillStyle = 'rgba(214,74,58,0.18)'; ctx.fillRect(0, 0, W, H_ * 0.15); ctx.fillRect(0, H_ * 0.8, W, H_ * 0.2); ctx.restore(); }
  };

  // a small cream paper label lying flat on top of the frame (soft shadow, fibre texture)
  function paperLabel(ctx, x, y, text, font, align, maxW, bottom) {
    ctx.save(); ctx.font = font;
    const lines = [];
    if (maxW) { let cur = ''; text.split(' ').forEach((w) => { const s = cur ? cur + ' ' + w : w; if (ctx.measureText(s).width > maxW - 60 && cur) { lines.push(cur); cur = w; } else cur = s; }); if (cur) lines.push(cur); } else lines.push(text);
    const lh = parseInt(font.match(/(\d+)px/)[1], 10) * 1.22;
    const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 56, th = lh * lines.length + 30;
    const x0 = align === 'center' ? x - tw / 2 : x, y0 = bottom ? y - th : y - th / 2;
    ctx.shadowColor = 'rgba(40,40,30,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 7;
    ctx.fillStyle = '#f6f2e9'; ctx.fillRect(x0, y0, tw, th);
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 0.9; ctx.fillStyle = ctx.createPattern(OXC.tex || (OXC.tex = makeTex(5)), 'repeat'); ctx.fillRect(x0, y0, tw, th); ctx.globalAlpha = 1;
    ctx.fillStyle = '#e45a3e'; ctx.fillRect(x0, y0, 8, th);
    ctx.fillStyle = INK; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, x0 + tw / 2 + 4, y0 + 15 + lh * (i + 0.5)));
    ctx.restore();
  }

  window.ORIGAMI = { explainer: EXPLAIN, DURATION, W: 1080, H: 1920 };
})();
