require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  PORT = 3000,
  TARGET_EMAIL = "poppopdev83@gmail.com",
  RESEND_API_KEY,
} = process.env;

if (!RESEND_API_KEY) {
  console.error("Isi RESEND_API_KEY di Environment Variables");
  process.exit(1);
}

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

app.use((req, res, next) => {
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
    return next();
  }
  express.json({ limit: "10kb" })(req, res, next);
});

app.use(express.static(path.join(__dirname, "public")));

// Video: taruh file public/video.mp4 (atau video.webm)
app.get("/api/config", (req, res) => {
  const file = ["video.mp4", "video.webm"].find((f) => fs.existsSync(path.join(__dirname, "public", f)));
  res.json({ videoUrl: file ? "/" + file : "" });
});

app.post("/api/pesan", async (req, res) => {
  console.log("DEBUG req.body:", JSON.stringify(req.body));

  if (limited("pesan:" + req.ip, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: "Terlalu banyak percobaan, coba lagi nanti." });
  }

  const nama = String(req.body.nama || "").trim().slice(0, 80);
  const belakang = String(req.body.belakang || "").trim().slice(0, 80);

  if (!nama || !belakang) {
    return res.status(400).json({ error: "Nama dan nama belakang wajib diisi." });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: TARGET_EMAIL,
        subject: "Pesan baru",
        text: `Format:\nNama: ${nama}\nNama belakang: ${belakang}`,
      }),
    });

    if (!r.ok) {
      throw new Error(await r.text());
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("Gagal kirim email:", e.message);
    res.status(500).json({ error: "Gagal mengirim email." });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log("Server berjalan di port " + PORT));
}

module.exports = app;
