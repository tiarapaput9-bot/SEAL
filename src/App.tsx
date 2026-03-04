import React from 'react';
import { Download, History, Link as LinkIcon, Video, Music, Info, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

console.log("App component rendering");

interface VideoFormat {
  quality: string;
  container: string;
  itag?: number;
  type: 'video' | 'audio';
}

interface VideoInfo {
  source: string;
  title: string;
  thumbnail: string;
  duration?: number;
  formats: VideoFormat[];
}

interface HistoryItem {
  id: number;
  url: string;
  title: string;
  thumbnail: string;
  format: string;
  timestamp: string;
}

export default function App() {
  const [url, setUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [videoInfo, setVideoInfo] = React.useState<VideoInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<HistoryItem[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleGetInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Gagal mengambil informasi video');
      const data = await res.json();
      setVideoInfo(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format: VideoFormat) => {
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&itag=${format.itag || ''}&format=${format.type}&title=${encodeURIComponent(videoInfo?.title || 'video')}`;
    window.location.href = downloadUrl;
    
    // Refresh history after a short delay
    setTimeout(fetchHistory, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Download size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight">LinkDownloader</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-indigo-600 transition-colors">Beranda</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Cara Penggunaan</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">FAQ</a>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight"
          >
            Unduh Video & Audio <br />
            <span className="text-indigo-600">Dari Mana Saja.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg max-w-2xl mx-auto"
          >
            Tempel tautan video dari YouTube, TikTok, atau platform lainnya dan unduh dalam hitungan detik.
          </motion.p>
        </section>

        {/* Search Input */}
        <section className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleGetInfo} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <LinkIcon size={20} />
            </div>
            <input
              type="text"
              placeholder="Tempel tautan video di sini (misal: https://youtube.com/...)"
              className="w-full pl-12 pr-32 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading || !url}
              className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md shadow-indigo-200"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Analisis'}
            </button>
          </form>
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-center gap-3 text-sm"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {videoInfo && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-16"
            >
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <img 
                  src={videoInfo.thumbnail} 
                  alt={videoInfo.title}
                  className="w-full aspect-video object-cover rounded-2xl mb-4"
                  referrerPolicy="no-referrer"
                />
                <h2 className="font-bold text-xl text-slate-900 line-clamp-2 mb-2">{videoInfo.title}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Info size={14} /> {videoInfo.source.toUpperCase()}</span>
                  {videoInfo.duration && (
                    <span>{Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}</span>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Video size={20} className="text-indigo-600" /> Video
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {videoInfo.formats.filter(f => f.type === 'video').map((format, i) => (
                      <button
                        key={i}
                        onClick={() => handleDownload(format)}
                        className="p-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex flex-col items-center"
                      >
                        <span className="text-slate-900 font-bold">{format.quality}</span>
                        <span className="text-xs opacity-60 uppercase">{format.container}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Music size={20} className="text-emerald-600" /> Audio
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {videoInfo.formats.filter(f => f.type === 'audio').map((format, i) => (
                      <button
                        key={i}
                        onClick={() => handleDownload(format)}
                        className="p-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all flex flex-col items-center"
                      >
                        <span className="text-slate-900 font-bold">{format.quality}</span>
                        <span className="text-xs opacity-60 uppercase">{format.container}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* History Section */}
        <section className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <History size={22} className="text-slate-400" /> Riwayat Unduhan
            </h3>
          </div>
          
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                    {item.format === 'audio' ? <Music size={20} /> : <Video size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate">{item.title}</h4>
                    <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-emerald-500">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
                <p>Belum ada riwayat unduhan.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-200 mt-12 text-center text-sm text-slate-500">
        <p>&copy; 2024 LinkDownloader. Dibuat dengan ❤️ untuk kemudahan berbagi.</p>
      </footer>
    </div>
  );
}
