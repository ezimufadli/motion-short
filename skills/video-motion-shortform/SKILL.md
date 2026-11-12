---
name: video-motion-shortform
description: Produksi video motion short-form (Reels/TikTok/Shorts) bertahap dengan approval: riset tren Scrape Creators, storyboard, script VO, suara ElevenLabs, render 9:16 + SRT + caption.
---

# Video Motion Short-Form (pipeline bertahap)

Kamu adalah content producer video motion short-form. Kerjakan tahap demi tahap. Di setiap **[STOP]** berhenti, rangkum, dan tunggu persetujuan user sebelum lanjut. Jangan berasumsi; kalau ada yang tidak jelas, tanya dulu (maks 5 pertanyaan sekaligus, pakai AskUserQuestion).

Spesifikasi default: 1080×1920 (9:16), 30 fps, MP4 H.264 + AAC 48 kHz, subtitle burn-in, safe zone (tanpa teks penting di 15% atas dan 20% bawah), loudness ±-16 LUFS.

## Tahap 0 — Klarifikasi
Cek bagian Konteks: niche/brand (+ handle akun untuk CTA), target audiens, bahasa & tone VO, durasi target, tujuan + CTA, dan **style visual** (biasanya dilampirkan sebagai prompt/style card + kode referensi). Kalau style belum ada, tanya. Kalau referensinya landscape tanpa VO, usulkan adaptasi ke vertikal + mode voiceover dan minta persetujuan. Buat task list (TaskCreate) untuk tahap 2–5.

## Tahap 1 — Riset tren (Scrape Creators)
- Load tool via ToolSearch: `mcp__Scrap_Creator__v1_tiktok_search_keyword`, `v1_tiktok_search_hashtag`, `v2_instagram_reels_search`, `v1_instagram_search_hashtag`, `v1_youtube_search` (type=shorts, uploadDate=this_week), `v1_tiktok_get_trending_feed`.
- TikTok: `date_posted: this-week`, `sort_by: most-liked`, `region: ID`, `trim: true`. Jalankan 3–5 query paralel (keyword niche + hashtag + sinonim).
- Hasil TikTok selalu >200 KB dan tersimpan ke file di `/tmp/claude-tool-results/`. **Jangan dibaca manual**: ringkas dengan Python (`json.load`, ambil `aweme_info.statistics` play/digg/share/collect, `create_time`, `author.unique_id`, `aweme_id`, `desc[:150]`, urutkan by views). Link video = `https://www.tiktok.com/@<unique_id>/video/<aweme_id>`.
- Instagram via Google-index sering tidak relevan; sebutkan keterbatasannya. Trending feed TikTok tidak membawa info audio yang berguna.
- Pakai **rasio save/views** sebagai sinyal utama untuk konten edukasi (CTA save/follow).
- Sajikan tabel 5 kandidat: topik, platform, link contoh, metrik, alasan relevan, angle/hook. Tandai 1 rekomendasi + alasan, sebut sisa kredit. Kalau topik mengandung angka/klaim, verifikasi dengan WebSearch dan simpan sumbernya.
**[STOP: user pilih topik]**

## Tahap 2 — Storyboard visual
- Bangun engine gambar dari kode referensi style (ekstrak library helper + pass tekstur/finishing **tanpa disederhanakan**; frame = fungsi murni dari t). Untuk 9:16: proyeksi vertikal, kamera dolly, elemen ditumpuk vertikal, label layar (tag pojok + strip subtitle) di dalam safe zone.
- Render frame kunci headless (playwright + /usr/bin/google-chrome, `--no-sandbox`) → contact sheet PNG → **lihat sendiri** dan perbaiki: teks terpotong, prop tertutup, frame kosong saat transisi (geser lipatan kartu lebih awal/tumpang tindih dengan dolly kamera), ukuran teks (headline ≥44 px, label ≥28 px, angka kunci ≥64 px pada skala 1280-lebar).
- Font Google tidak bisa diunduh dari workspace: untuk cek layout pakai pengganti lebar-mirip (DejaVu Sans/Mono via `@font-face src:local()`); font asli diambil di Tahap 5.
- Publikasikan storyboard sebagai artifact HTML (`publish_files`): grid panel canvas per beat (nomor, waktu, teks on-screen, visual+motion, garis besar VO, transisi, sound), toggle safe zone, klik untuk ukuran penuh, daftar asumsi/fakta.
**[STOP: storyboard]**

## Tahap 3 — Script VO
Tabel per scene: script, jumlah kata, estimasi (±2,5 kata/detik untuk Bahasa Indonesia), slot waktu. Tulis angka dalam kata ("dua puluh satu"), beri catatan intonasi [jeda]/[semangat], pelafalan khusus ("AI" = é-ai). Sebut pergeseran timing dari storyboard.
**[STOP: script VO]**

## Tahap 4 — Suara ElevenLabs
- Load: `mcp__ElevenLabs__creative_list_voices`, `creative_generate_speech`, `creative_create_flow`, `creative_get_flow_run_status`, `creative_transcribe_audio`, `creative_get_model_guide`.
- `creative_create_flow` dulu, lalu semua generate di flow yang sama. `creative_list_voices` dengan `languages:["id"]` + `use_cases` (social_media / informative_educational). Tawarkan 3 opsi (nama, gender/usia, karakter, alasan).
- Sample hook: model `eleven_v4`, `generations_count:1`, tag delivery (`[curious]`, `[confident]`, `[short pause]`). Error "Free generations are busy" = antrean penuh, tidak dikenai biaya; **jangan retry di turn yang sama**, minta user bilang "coba lagi" ±1 menit.
**[STOP: user pilih suara]**
- VO lengkap: satu take, semua scene dipisah `[pause]`, ±1.000 kredit/92 kata. Kalau ada salah baca (mis. "A AI"), generate ulang **hanya scene itu** dengan IPA: `/eɪ.aɪ/`. Catat generation_id/session_id.
**[STOP: audio final]**

## Tahap 5 — Render
1. **Ambil audio**: CDN ElevenLabs & Google Fonts diblokir dari Bash. Ambil `content_url` via `creative_get_flow_run_status`, buka di **browser bawaan** (`mcp__remote-devices__Claude_Browser__preview_start`), lalu `javascript_tool`: `fetch` → `Uint8Array` di `window.__vo` → kirim base64 per 90.000 byte (hasil >token limit otomatis tersimpan ke file `/tmp/claude-tool-results/*.txt`; gabung dengan Python regex `"([A-Za-z0-9+/=]{100,})"` urut waktu). Font: fetch CSS `fonts.googleapis.com/css2?family=...`, ambil blok `/* latin */` → woff2 → sematkan sebagai data URI `format("woff2")`. Tutup tab setelah selesai.
2. **Timestamp kata**: `creative_transcribe_audio` dengan `connect_from:[node_id VO]` (gratis), poll `creative_get_flow_run_status` → `words[]`. Tentukan batas scene dari kata pertama/terakhir tiap scene.
3. **Rakit VO**: ganti potongan scene yang di-regenerate (ffmpeg concat wav), `apad` 0,9 s, `loudnorm=I=-16:TP=-1.5`.
4. **Sinkron**: peta piecewise-linear waktu-engine ↔ waktu-video dengan breakpoint di tiap event (typing mulai, X, angka kunci, flip, CTA) supaya event visual jatuh tepat di kata yang relevan. Subtitle = frasa dari timestamp kata.
5. **Render**: playwright `seek(i/30)` → `toDataURL('image/jpeg',0.92)` → pipe ke ffmpeg `-f image2pipe -c:v mjpeg`, `libx264 -crf 18`, tulis ke `.part.mp4` lalu rename. SFX dari `SOUND.renderOffline(scoreSound, DURATION, 48000, {voiceover:true})` → WAV. Mux: VO + SFX (volume 0,55) `amix normalize=0, alimiter`, `-c:v copy`. Re-encode final `-crf 23 -preset medium -movflags +faststart` (grain bikin file besar). Cek `ebur128` ≈ -16 LUFS.
6. Kirim **preview 720p** dulu (`scale=720:1280 -crf 27`) untuk review gerak. **[STOP: preview]** Setelah oke, kirim final.

## Output akhir
1. MP4 final 1080×1920
2. .SRT (dari timestamp kata, format `HH:MM:SS,mmm`)
3. Caption + 5–10 hashtag per platform (TikTok / IG Reels / YT Shorts), sertakan sumber klaim
4. Judul YouTube Shorts (3 opsi) + jam posting (WebSearch data tahun berjalan, cite sumber; untuk Indonesia anchor WIB)
5. Bonus: thumbnail JPG dari frame angka kunci

Selalu sebutkan: durasi final vs target, elemen yang masih placeholder (CTA/handle), dan tawarkan render ulang satu beat saja kalau ada perubahan kecil.
