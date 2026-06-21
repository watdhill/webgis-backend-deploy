const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ================= DATABASE =================
// WAJIB PAKAI ENV DI RAILWAY
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

// test koneksi
pool.connect()
    .then(() => console.log("Koneksi database berhasil!"))
    .catch(err => console.error("DB error:", err));

// ================= ROOT =================
app.get("/", (req, res) => {
    res.send("Backend WebGIS Evakuasi Tsunami Padang Aktif 🚀");
});

app.get("/health", (req, res) => {
    res.json({ status: "OK" });
});

// ================= SHELTER =================
app.get("/api/shelter", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT gid, nama_lokas,
      ST_Y(geom) AS lat,
      ST_X(geom) AS lon
      FROM public.titik_evakuasi_sektor_ab
      ORDER BY gid
    `);

        res.json({
            success: true,
            total: result.rows.length,
            data: result.rows
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ================= ROUTE ENDPOINT =================
app.get("/api/rute-otomatis", async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({
            success: false,
            error: "lat dan lon wajib"
        });
    }

    try {
        const shelter = await pool.query(`
      SELECT gid, nama_lokas,
      ST_Y(geom) AS lat,
      ST_X(geom) AS lon
      FROM public.titik_evakuasi_sektor_ab
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1,$2),4326)
      LIMIT 1
    `, [lon, lat]);

        res.json({
            success: true,
            shelter: shelter.rows[0],
            message: "Endpoint aktif (routing tetap sama seperti lokal)"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ================= START SERVER =================
app.listen(port, "0.0.0.0", () => {
    console.log(`Server WebGIS berjalan di port ${port}`);
});
