// node render.js player.html out.mp4 [fps] [scale]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { spawn } = require('child_process'); const fs = require('fs');
(async () => {
  const [,, page, out, fpsA, scaleA] = process.argv; const fps = +(fpsA || 30), sc = +(scaleA || 1);
  const W = Math.round(1080 * sc), Hh = Math.round(1920 * sc);
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.route('**/fonts.googleapis.com/**', (r) => r.abort());
  await p.goto('file://' + require('path').resolve(page) + '#render');
  await p.waitForFunction(() => window.READY);
  const D = await p.evaluate(() => window.DURATION);
  // sound: the score rendered offline (voiceover mode), written as a WAV
  const sb = await p.evaluate(async () => {
    const r = await SOUND.renderOffline(window.scoreSound, window.DURATION, 48000, { voiceover: true });
    const i16 = new Int16Array(r.inter.length); for (let i = 0; i < r.inter.length; i++) i16[i] = Math.max(-1, Math.min(1, r.inter[i])) * 32767;
    let s = ''; const u8 = new Uint8Array(i16.buffer); for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return { b64: btoa(s), peak: r.peak };
  });
  const pcm = Buffer.from(sb.b64, 'base64'); const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(48000, 24); hdr.writeUInt32LE(48000 * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(out.replace(/\.mp4$/, '_sfx.wav'), Buffer.concat([hdr, pcm])); console.log('sfx peak', sb.peak.toFixed(3));
  const tmp = out.replace(/\.mp4$/, '.part.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${W}:${Hh}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(D * fps), T0 = Date.now();
  for (let i = 0; i < N; i++) {
    const d = await p.evaluate((t) => { window.seek(t); return document.getElementById('cv').toDataURL('image/jpeg', 0.92); }, i / fps);
    if (!ff.stdin.write(Buffer.from(d.slice(23), 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log('frame', i, '/', N, ((Date.now() - T0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); fs.renameSync(tmp, out.replace(/\.mp4$/, '_video.mp4'));
  await b.close(); console.log('done', N, 'frames', ((Date.now() - T0) / 1000).toFixed(0) + 's');
})();
