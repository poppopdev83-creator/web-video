require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const {
  PORT = 3000,
  TARGET_EMAIL = "poppopdev83@gmail.com",
  SMTP_HOST, SMTP_PORT = 465, SMTP_USER, SMTP_PASS,
} = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error("Isi SMTP_HOST, SMTP_USER, dan SMTP_PASS di file .env");
  process.exit(1);
}

const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// Pembatas laju: 5 pesan per 10 menit per IP
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Video: taruh file public/video.mp4 (atau video.webm)
app.get("/api/config", (req, res) => {
  const file = ["video.mp4", "video.webm"].find((f) => fs.existsSync(path.join(__dirname, "public", f)));
  res.json({ videoUrl: file ? "/" + file : "" });
});

app.post("/api/pesan", async (req, res) => {
  if (limited("pesan:" + req.ip, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: "Terlalu banyak percobaan, coba lagi nanti." });
  }
  const nama = String(req.body.nama || "").trim().slice(0, 80);
  const belakang = String(req.body.belakang || "").trim().slice(0, 80);
  if (!nama || !belakang) {
    return res.status(400).json({ error: "Nama dan nama belakang wajib diisi." });
  }
  try {
    await mailer.sendMail({
      from: `"Web Video" <${SMTP_USER}>`,
      to: TARGET_EMAIL, // diatur di file .env, tidak bisa diubah pengunjung
      subject: "Pesan baru",
      text: `Format:\nNama: ${nama}\nNama belakang: ${belakang}`,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Gagal kirim email:", e.message);
    res.status(500).json({ error: "Gagal mengirim email." });
  }
});

app.listen(PORT, () => console.log("Server berjalan di port " + PORT));
