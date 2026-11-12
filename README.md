# motion-short

Skill untuk Claude (`/video-motion-shortform`).

## Instal
Salin folder `skills/video-motion-shortform/` ke folder skills Claude Anda (`~/.claude/skills/` untuk Claude Code), atau unggah `SKILL.md`-nya lewat Settings → Skills di claude.ai.

## Isi
- `SKILL.md` — alur produksi video motion short-form bertahap (riset tren → storyboard → VO → ElevenLabs → render 9:16).
- `scripts/render.js` — render canvas HTML ke MP4 (playwright + ffmpeg) + SFX offline.
- `scripts/build.py` — merakit player HTML (font data-URI, VO, konfigurasi sinkron).
- `scripts/player_template.html` — player/preview dengan `window.seek(t)` untuk render frame-by-frame.
- `scripts/example_engine_origami_9x16.js`, `scripts/example_score.js` — contoh engine gaya "Origami Studio" versi vertikal dan sound score.
