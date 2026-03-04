import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import ytdl from "ytdl-core";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("downloads.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT,
    title TEXT,
    thumbnail TEXT,
    format TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    console.log("Health check requested");
    res.json({ status: "ok" });
  });

  app.get("/test", (req, res) => {
    console.log("Test route requested");
    res.send("Server is alive and responding");
  });

  app.get("/api/info", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      if (ytdl.validateURL(url)) {
        const info = await ytdl.getInfo(url);
        const formats = ytdl.filterFormats(info.formats, "audioandvideo");
        const audioOnly = ytdl.filterFormats(info.formats, "audioonly");
        
        res.json({
          source: "youtube",
          title: info.videoDetails.title,
          thumbnail: info.videoDetails.thumbnails[0].url,
          duration: Number(info.videoDetails.lengthSeconds),
          formats: [
            ...formats.map(f => ({ quality: f.qualityLabel, container: f.container, itag: f.itag, type: "video" })),
            ...audioOnly.map(f => ({ quality: f.audioBitrate + "kbps", container: f.container, itag: f.itag, type: "audio" }))
          ]
        });
      } else {
        res.json({
          source: "other",
          title: "Video from " + new URL(url).hostname,
          thumbnail: "https://picsum.photos/seed/video/400/225",
          formats: [
            { quality: "720p", container: "mp4", type: "video" },
            { quality: "128kbps", container: "mp3", type: "audio" }
          ]
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch video info" });
    }
  });

  app.get("/api/download", async (req, res) => {
    const { url, itag, format, title } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      if (ytdl.validateURL(url)) {
        const titleStr = typeof title === "string" ? title : "video";
        const formatStr = typeof format === "string" ? format : "video";
        const filename = `${titleStr.replace(/[^a-z0-9]/gi, '_')}.${formatStr === "audio" ? "mp3" : "mp4"}`;
        res.header("Content-Disposition", `attachment; filename="${filename}"`);
        
        const options: any = {
          quality: itag ? Number(itag) : (formatStr === "audio" ? "highestaudio" : "highestvideo")
        };
        
        ytdl(url, options).pipe(res);

        const stmt = db.prepare("INSERT INTO history (url, title, thumbnail, format) VALUES (?, ?, ?, ?)");
        stmt.run(url, titleStr, "", formatStr);
      } else {
        res.status(400).json({ error: "Only YouTube is supported in this demo" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  app.get("/api/history", (req, res) => {
    const history = db.prepare("SELECT * FROM history ORDER BY timestamp DESC LIMIT 10").all();
    res.json(history);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      console.log(`Serving index.html for: ${url}`);
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        console.error(`Error serving index.html: ${e}`);
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

