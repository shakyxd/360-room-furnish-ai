import { useState, useCallback, useRef, useEffect } from "react";
import PannellumViewer from "./components/PannellumViewer";

export default function App() {
  const [originalUrl, setOriginalUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultMime, setResultMime] = useState("image/png");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const uploadedFile = useRef(null);

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

      const base = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${base}/api/edit`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Server error");

      const mime = data.mimeType || "image/png";
      setResultUrl(`data:${mime};base64,${data.image}`);
      setResultMime(mime);
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
            <PannellumViewer imageUrl={originalUrl} label="Original" />
            <PannellumViewer imageUrl={resultUrl} label="AI Result" loading={loading} />
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
  );
}
