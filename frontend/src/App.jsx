import { useState, useCallback, useRef, useEffect } from "react";
import PannellumViewer from "./components/PannellumViewer";
import HistoryModal from "./components/HistoryModal";

const MAX_HISTORY = 6;

const RESOLUTIONS = [
  { id: "1k", label: "1K", hint: "Default" },
  { id: "2k", label: "2K", hint: "Sharper" },
  { id: "4k", label: "4K", hint: "Best" },
];

const STYLES = [
  { id: "modern",       label: "Modern" },
  { id: "minimalist",   label: "Minimalist" },
  { id: "scandinavian", label: "Scandinavian" },
  { id: "industrial",   label: "Industrial" },
  { id: "bohemian",     label: "Bohemian" },
  { id: "luxury",       label: "Luxury" },
];

export default function App() {
  const [originalUrl, setOriginalUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultMime, setResultMime] = useState("image/png");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState([]);
  const [modalItem, setModalItem] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [selectedRes, setSelectedRes] = useState("1k");
  const fileRef = useRef(null);
  const uploadedFile = useRef(null);
  const mainSyncRef = useRef({ pitch: 0, yaw: 0, hfov: 100, source: null });

  // Elapsed timer
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload a JPG or PNG image.");
      return;
    }
    setError(null);
    setResultUrl(null);
    uploadedFile.current = file;
    setOriginalUrl(URL.createObjectURL(file));
  }, []);

  const onFileChange = (e) => handleFile(e.target.files[0]);
  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  useEffect(() => {
    const onPaste = (e) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(
        (i) => i.kind === "file" && i.type.startsWith("image/")
      );
      if (item) handleFile(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  const runEdit = async (action) => {
    if (!uploadedFile.current) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append("image", uploadedFile.current);
      formData.append("action", action);
      if (action === "furnish") formData.append("style", selectedStyle);
      formData.append("resolution", selectedRes);

      const base = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${base}/api/edit`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Server error");

      const mime = data.mimeType || "image/png";
      const url = `data:${mime};base64,${data.image}`;
      setResultUrl(url);
      setResultMime(mime);
      const styleLabel = action === "furnish"
        ? STYLES.find((s) => s.id === selectedStyle)?.label
        : null;
      setHistory((prev) => [
        { url, mime, action, style: styleLabel, originalUrl, ts: Date.now() },
        ...prev,
      ].slice(0, MAX_HISTORY));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const ext = resultMime.includes("jpeg") || resultMime.includes("jpg") ? "jpg" : "png";
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `room-result.${ext}`;
    a.click();
  };

  return (
    <div className="app">
      <header>
        <p className="header-eyebrow">Powered by Nano Banana 2</p>
        <h1>360° Room Furnish AI</h1>
        <p className="header-sub">Upload an equirectangular image and furnish or unfurnish it in seconds</p>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <p className="history-label">History</p>
          {history.length === 0 ? (
            <p className="history-empty">No generations yet</p>
          ) : (
            history.map((item) => (
              <button
                key={item.ts}
                className="history-thumb"
                onClick={() => setModalItem(item)}
              >
                <img src={item.url} alt={item.action} />
                <span className="history-tag">
                  {item.action === "furnish" ? (item.style ?? "Furnished") : "Unfurnished"}
                </span>
              </button>
            ))
          )}
        </aside>

        <main>
        <div className="card upload-card">
          <div
            className={`dropzone${dragging ? " dragging" : ""}${originalUrl ? " has-image" : ""}`}
            onClick={() => fileRef.current.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            {originalUrl ? (
              <>
                <span className="drop-icon has">✓</span>
                <span>Image loaded — click or paste to replace</span>
              </>
            ) : (
              <>
                <span className="drop-icon">↑</span>
                <span className="drop-main">Drop, paste (Ctrl+V), or click to browse</span>
                <span className="drop-hint">JPG or PNG · up to 20 MB</span>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={onFileChange} style={{ display: "none" }} />

          <button
            className="btn btn-paste"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                  const type = item.types.find((t) => t.startsWith("image/"));
                  if (type) { handleFile(await item.getType(type)); break; }
                }
              } catch {
                setError("Clipboard access denied — use Ctrl+V instead.");
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="4" rx="1"/>
              <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/>
            </svg>
            Paste image
          </button>

          <div className="presets">
            <span className="presets-label">Style</span>
            {STYLES.map((s) => (
              <button
                key={s.id}
                className={`preset-chip${selectedStyle === s.id ? " active" : ""}`}
                onClick={() => setSelectedStyle(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="presets">
            <span className="presets-label">Resolution</span>
            {RESOLUTIONS.map((r) => (
              <button
                key={r.id}
                className={`preset-chip${selectedRes === r.id ? " active" : ""}`}
                onClick={() => setSelectedRes(r.id)}
                title={r.hint}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="actions">
            <button className="btn btn-furnish" disabled={!originalUrl || loading} onClick={() => runEdit("furnish")}>
              Furnish Room
            </button>
            <button className="btn btn-unfurnish" disabled={!originalUrl || loading} onClick={() => runEdit("unfurnish")}>
              Unfurnish Room
            </button>
          </div>

          {error && <div className="error">{error}</div>}
        </div>

        {originalUrl && (
          <section className="viewers">
            <PannellumViewer imageUrl={originalUrl} label="Original" syncRef={mainSyncRef} syncId="original" />
            <PannellumViewer imageUrl={resultUrl} label="AI Result" loading={loading} elapsed={elapsed} syncRef={mainSyncRef} syncId="result" />
          </section>
        )}

        {resultUrl && (
          <div className="download-row">
            <button className="btn btn-download" onClick={downloadResult}>
              Download Result
            </button>
          </div>
        )}

        </main>
      </div>

      {modalItem && (
        <HistoryModal item={modalItem} onClose={() => setModalItem(null)} />
      )}
    </div>
  );
}
