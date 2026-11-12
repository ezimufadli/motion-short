// Timeline glue: storyboard (engine) time <-> video time, subtitles, and the paper sound score.
(function () {
  // beat starts on the engine's own clock (storyboard) and on the video clock (follows the VO)
  const SB = (window.TL_PAIRS ? window.TL_PAIRS.SB : [0, 3, 7, 11, 14, 18, 22, 26, 30, 35, 40]).slice();
  let VB = (window.TL_PAIRS ? window.TL_PAIRS.VB : (window.VO_BEATS || [0, 3, 7, 12.5, 15.5, 19.5, 23.5, 27.8, 32.1, 36.6, 41.1])).slice();
  const pw = (x, A, B) => { // piecewise-linear map from breakpoints A to B
    if (x <= A[0]) return B[0] + (x - A[0]);
    for (let i = 0; i < A.length - 1; i++) if (x <= A[i + 1]) return B[i] + ((x - A[i]) / (A[i + 1] - A[i])) * (B[i + 1] - B[i]);
    return B[B.length - 1] + (x - A[A.length - 1]);
  };
  const toEngine = (tv) => pw(tv, VB, SB);
  const toVideo = (te) => pw(te, SB, VB);
  const DURATION = VB[VB.length - 1];

  // subtitle cues on the video clock: [start, end, text] (from the approved VO script; retimed to the real VO later)
  const SUBS = window.VO_SUBS || [
    [0.15, 1.5, 'Jawaban AI kamu jelek?'], [1.55, 2.95, 'Bukan salah AI-nya.'],
    [3.1, 5.2, 'Kalau prompt-mu cuma "ringkas laporan ini"…'], [5.25, 6.9, 'ya hasilnya generik.'],
    [7.1, 9.2, 'Rata-rata kita nulis di bawah 9 kata.'], [9.3, 12.3, 'Prompt terbaik? Sekitar 21.'],
    [12.6, 14.0, 'Itu menurut panduan Google.'], [14.05, 15.4, 'Rumusnya: 4 unsur.'],
    [15.6, 17.3, 'Satu, peran: kasih AI posisi.'], [17.35, 19.4, '"Kamu analis data senior."'],
    [19.6, 21.2, 'Dua, tugas: mau dia ngapain.'], [21.25, 23.4, '"Ringkas laporan penjualan Oktober."'],
    [23.6, 25.0, 'Tiga, konteks: buat siapa.'], [25.05, 27.7, '"Untuk rapat direksi, fokus ke penurunan."'],
    [27.9, 29.5, 'Empat, format: bentuk hasilnya.'], [29.55, 32.0, '"3 poin, maks 80 kata."'],
    [32.2, 33.4, 'Gabungin empatnya.'], [33.45, 36.4, 'Jawaban yang tadinya generik… sekarang siap kirim.'],
    [36.7, 38.6, 'Save biar nggak lupa,'], [38.65, 40.4, 'follow buat tips AI lainnya.'],
  ];
  const subAt = (tv) => { for (const [a, b, s] of SUBS) if (tv >= a && tv < b) return s; return ''; };

  // ---- paper sound score, written on the engine clock and scheduled on the video clock ----
  function scoreSound(k0) {
    const V = toVideo;
    const k = {
      play: (n, t, o) => k0.play(n, V(t), o),
      noise: (t, o) => k0.noise(V(t), o),
      tone: (t, o) => k0.tone(V(t), o),
    };
    const POP = 1 - 1.5 / 2.5;
    const seg = (t, a, b) => H.ease.inOut(H.clamp((t - a) / (b - a)));
    const crease = (t, g = 1, p = 0, minor = true) => {
      k.noise(t, { dur: 0.028, filter: 'bandpass', f: 1700, q: 1.1, gain: 0.55 * g, a: 0.001, pan: p, minor });
      k.noise(t, { dur: 0.07, color: 'brown', filter: 'lowpass', f: 520, gain: 0.42 * g, a: 0.002, pan: p, minor });
    };
    const fold = (t0, t1, g = 1, p = 0, minor = true) => {
      const d = (V(t1) - V(t0)) || 0.2;
      k.noise(t0, { dur: d, color: 'pink', filter: 'bandpass', f: [[0, 520], [d, 1300]], q: 0.6, gain: 0.095 * g, a: d * 0.55, pan: p, minor: true });
      for (let i = 1; i <= 3; i++) k0.noise(V(t0) + d * (0.25 + i * 0.17), { dur: 0.018, filter: 'bandpass', f: 1500 + i * 250, q: 1.2, gain: 0.07 * g, a: 0.001, pan: p, minor: true });
      crease(t1, g, p, minor);
    };
    const slideSheet = (t0, t1, g = 1, p = 0) => {
      const d = (V(t1) - V(t0)) || 0.2;
      k.noise(t0, { dur: d, filter: 'bandpass', f: [[0, 700], [d, 1000]], q: 0.7, gain: 0.08 * g, a: d * 0.4, hold: d * 0.3, pan: p, minor: true });
      crease(t1, 0.45 * g, p);
    };
    const flatten = (t, g = 0.6, p = 0) => { k.play('paper', t, { dur: 0.3, gain: 0.22 * g, pan: p, minor: true }); crease(t + 0.35, 0.35 * g, p); };
    const glide = (t0, t1) => { const d = V(t1) - V(t0); k.noise(t0, { dur: d, color: 'brown', filter: 'lowpass', f: [[0, 220], [d * 0.5, 420], [d, 220]], gain: 0.09, a: d * 0.5 }); };
    const tick = (t, g, p) => { k.noise(t, { dur: 0.02, filter: 'bandpass', f: 1500, q: 1.6, gain: 0.26 * g, a: 0.001, pan: p, minor: true }); k.tone(t, { f: 240, dur: 0.03, gain: 0.05 * g, pan: p, minor: true }); };
    const typing = (t0, t1, chars, g = 0.5) => { // mono print typed on: keys at <= 12/s
      const n = Math.max(2, Math.min(Math.round((V(t1) - V(t0)) * 12), chars));
      for (let i = 0; i < n; i++) k0.play('key', V(t0) + (i / n) * (V(t1) - V(t0)), { gain: g * (0.7 + 0.3 * ((i * 7) % 5) / 5), minor: true });
    };

    k0.bed('room', 0, DURATION, { gain: 0.3 });

    // BEAT 1
    fold(0.05, 0.7, 1.4, 0, false);
    fold(0.35, 0.35 + POP * 0.45, 0.7, 0.25);
    fold(1.25, 1.25 + POP * 0.4, 1.0, 0, false);
    glide(2.7, 3.4); flatten(3.35, 0.6);
    // BEAT 2
    fold(3.05, 3.45, 0.9);
    typing(3.5, 4.2, 19, 0.55);
    slideSheet(4.4, 4.8, 1, 0.05);
    fold(4.7, 4.7 + POP * 0.4, 0.9, 0.1);
    const tX = 5.1 + POP * 0.3;
    k.play('slap', tX, { gain: 0.55, pan: 0.3 }); k.play('thud', tX, { f: 120, gain: 0.55, pan: 0.2 });
    k.tone(tX + 0.02, { f: 'D3', type: 'triangle', dur: 0.16, gain: 0.2, filter: 'lowpass', f2: 700 });
    k.tone(tX + 0.18, { f: 'A2', type: 'triangle', dur: 0.32, gain: 0.22, filter: 'lowpass', f2: 600 });
    k.play('paper', 5.3, { dur: 0.35, gain: 0.28, pan: 0.2, minor: true });
    glide(6.8, 7.5); flatten(7.4, 0.5);
    // BEAT 3: the key number
    fold(7.15, 7.6, 1.0, -0.35);
    for (let j = 0; j < 4; j++) k.noise(7.25 + j * 0.045, { dur: 0.03, filter: 'bandpass', f: 1100 + j * 90, q: 1.3, gain: 0.14, a: 0.002, pan: -0.35, minor: true });
    fold(8.0, 8.5, 1.0, 0.35); fold(8.0, 8.3, 0.5, -0.35); fold(8.9, 9.2, 0.5, 0.35);
    for (let j = 0; j < 4; j++) k.noise(8.1 + j * 0.045, { dur: 0.03, filter: 'bandpass', f: 1100 + j * 90, q: 1.3, gain: 0.14, a: 0.002, pan: 0.35, minor: true });
    { let last = -1, lastT = -1; for (let t = 8.5; t < 9.6; t += 1 / 120) { const n = Math.round(H.lerp(9, 21, Math.pow(H.clamp((t - 8.5) / 1.1), 1.6))); if (n !== last && V(t) - lastT >= 1 / 12) { tick(t, 0.6, 0.35); last = n; lastT = V(t); } } }
    k.play('impact', 9.6, { gain: 1.25, pan: 0.25 });
    k.noise(9.6, { dur: 0.15, color: 'pink', filter: 'bandpass', f: [[0, 700], [0.15, 1800]], q: 0.6, gain: 0.26, a: 0.03, pan: 0.25 });
    k.play('ding', 9.6, { f: 'E5', gain: 0.65, pan: 0.3 });
    // BEAT 4
    flatten(10.9, 0.8);
    fold(11.3, 11.9, 1.1, 0, false);
    ['C5', 'E5', 'G5', 'C6'].forEach((f, i) => { const tl = 12.15 + i * 0.3 + POP * 0.4; crease(tl, 0.7, (i % 2 ? 0.3 : -0.3)); k.tone(tl, { f, type: 'triangle', dur: 0.12, gain: 0.05, minor: true }); });
    glide(13.6, 14.3); flatten(14.3, 0.5);
    // BEATS 5-8: one station per part
    const LEN = [24, 34, 40, 21];
    [14, 18, 22, 26].forEach((t0, i) => {
      fold(t0 - 0.25, t0 + 0.3, 1.0, -0.15, false);
      fold(t0 + 0.15, t0 + 0.7, 0.8, 0.35);
      if (i === 2) fold(t0 + 0.25, t0 + 0.75, 0.6, 0.4);
      fold(t0 + 0.7, t0 + 1.1, 0.8, 0);
      typing(t0 + 1.15, t0 + 2.35, LEN[i], 0.5);
      if (i === 1) { crease(t0 + 2.0 + POP * 0.35, 1.0, 0.35, false); k.play('ding', t0 + 2.05, { f: 'G5', gain: 0.25, pan: 0.35, minor: true }); }
      if (i < 3) slideSheet(t0 + 3.05, t0 + 3.75, 1.0, 0.4);
      flatten(t0 + 4.4, 0.5);
      if (i < 3) glide(t0 + 3.7, t0 + 4.4);
    });
    glide(29.7, 30.4);
    // BEAT 9: the prompt sheet fills, the bubble flips to "siap kirim"
    fold(30.1, 30.65, 1.1, 0, false);
    [0, 1, 2, 3].forEach((i) => typing(30.75 + i * 0.4, 31.1 + i * 0.4, 18, 0.45));
    slideSheet(32.45, 32.8, 1.0, 0.3);
    fold(32.6, 32.6 + POP * 0.4, 0.9, 0.3);
    k.noise(33.08, { dur: 0.32, color: 'pink', filter: 'bandpass', f: [[0, 420], [0.16, 900], [0.32, 420]], q: 0.7, gain: 0.18, a: 0.14, pan: 0.3 });
    const tV = 33.5 + POP * 0.35;
    crease(tV, 1.3, 0.35, false);
    k.play('success', tV, { f: 'G5', gain: 0.6, pan: 0.35 });
    // BEAT 10: takeaway + CTA
    flatten(34.85, 0.8); glide(34.9, 35.8);
    fold(35.3, 35.9, 1.3, 0, false);
    fold(36.4, 36.4 + POP * 0.45, 1.0, 0, false);
    k.play('paper', 36.85, { dur: 0.25, gain: 0.2, pan: -0.4, minor: true });
    ['C4', 'G4', 'E5'].forEach((f, i) => k.play('ding', 37.0 + i * 0.09, { f, gain: 0.48 - i * 0.04, pan: (i - 1) * 0.25 }));
  }

  window.TL = { SB, get VB() { return VB; }, setBeats: (b) => { VB = b.slice(); }, toEngine, toVideo, DURATION, SUBS, subAt, scoreSound };
})();
