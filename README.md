# Web Video + Pesan (kirim email otomatis dari server)

## Cara kerja
Pengunjung klik video → pop up (logo Google + "Pesan") → klik "Pesan" → pop up Nama / Nama belakang → "Kirim ke Email".
Server langsung mengirim email ke alamat tujuan (tanpa membuka aplikasi email pengunjung).
Tidak ada panel admin. Alamat tujuan hanya ada di file `.env` di server, jadi pengunjung tidak bisa melihat atau mengubahnya.

## Menjalankan
1. Pasang Node.js 18+.
2. `npm install`
3. Salin `.env.example` menjadi `.env`, lalu isi.
   - Gmail: aktifkan verifikasi 2 langkah di akun pengirim, buat "App Password" (Akun Google > Keamanan > Sandi aplikasi), pakai sebagai `SMTP_PASS`.
4. Taruh video Anda di `public/video.mp4` (atau `public/video.webm`).
5. `npm start`, buka http://localhost:3000

## CARA MENGUBAH ALAMAT EMAIL TUJUAN
1. Buka file `.env` (di folder yang sama dengan `server.js`).
2. Ubah baris: `TARGET_EMAIL=poppopdev83@gmail.com` menjadi alamat baru, misalnya `TARGET_EMAIL=emailbaru@gmail.com`.
3. Simpan file, lalu restart server (`Ctrl+C` lalu `npm start`).
   - Di hosting (Render/Railway): ubah variabel `TARGET_EMAIL` di menu Environment, simpan, lalu server restart otomatis / klik Restart.
4. Tes: kirim satu pesan dari web dan cek inbox alamat baru (juga folder Spam).

## Agar bisa dikunjungi semua orang (deploy)
1. Unggah folder ini ke GitHub (file `.env` jangan ikut, sudah ada di .gitignore).
2. Buat layanan Web Service di Render atau Railway dari repo itu.
   - Build command: `npm install`  |  Start command: `npm start`
3. Isi Environment Variables: `TARGET_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
4. Hosting memberi alamat web publik (https) yang bisa dibagikan ke siapa saja.
5. Catatan: file video di `public/` ikut ter-deploy bersama kode. Hindari video yang terlalu besar di GitHub (batas 100 MB per file).

## Keamanan
- Jangan membagikan isi `.env`.
- Ada pembatas laju: 5 pesan per 10 menit per IP.
