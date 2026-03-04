import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import express from 'express';
import cors from 'cors';
import ytdl from 'ytdl-core';
import Database from 'better-sqlite3';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
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

  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'LinkDownloader',
          short_name: 'LinkDownloader',
          description: 'Unduh Video & Audio Dari Mana Saja',
          theme_color: '#4f46e5',
          icons: [
            {
              src: 'https://picsum.photos/seed/downloader/192/192',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://picsum.photos/seed/downloader/512/512',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      }),
      {
        name: 'api-server',
        configureServer(server) {
          const app = express();
          app.use(cors());
          app.use(express.json());

          app.get("/api/health", (req, res) => {
            res.json({ status: "ok" });
          });

          app.get("/api/info", async (req, res) => {
            const { url } = req.query;
            if (!url || typeof url !== "string") return res.status(400).json({ error: "URL is required" });
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
              res.status(500).json({ error: "Failed to fetch video info" });
            }
          });

          app.get("/api/download", async (req, res) => {
            const { url, itag, format, title } = req.query;
            if (!url || typeof url !== "string") return res.status(400).json({ error: "URL is required" });
            try {
              if (ytdl.validateURL(url)) {
                const titleStr = typeof title === "string" ? title : "video";
                const formatStr = typeof format === "string" ? format : "video";
                const filename = `${titleStr.replace(/[^a-z0-9]/gi, '_')}.${formatStr === "audio" ? "mp3" : "mp4"}`;
                res.header("Content-Disposition", `attachment; filename="${filename}"`);
                const options: any = { quality: itag ? Number(itag) : (formatStr === "audio" ? "highestaudio" : "highestvideo") };
                ytdl(url, options).pipe(res);
                const stmt = db.prepare("INSERT INTO history (url, title, thumbnail, format) VALUES (?, ?, ?, ?)");
                stmt.run(url, titleStr, "", formatStr);
              } else {
                res.status(400).json({ error: "Only YouTube is supported" });
              }
            } catch (error) {
              res.status(500).json({ error: "Download failed" });
            }
          });

          app.get("/api/history", (req, res) => {
            const history = db.prepare("SELECT * FROM history ORDER BY timestamp DESC LIMIT 10").all();
            res.json(history);
          });

          server.middlewares.use(app);
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
