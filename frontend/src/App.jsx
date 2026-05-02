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
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
  }, []);

  const onFileChange = (e) => handleFile(e.target.files[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

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

      const res = await fetch("/api/edit", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Server error");

      const mime = data.mimeType || "image/png";
      const dataUrl = `data:${mime};base64,${data.image}`;
      setResultUrl(dataUrl);
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
        <h1>360 Room Furnish AI</h1>
        <p>Upload a 360° equirectangular room image and furnish or unfurnish it with Gemini AI</p>
      </header>

      <main>
        <section className="upload-section">
          <div
            className={`dropzone${dragging ? " dragging" : ""}${originalUrl ? " has-image" : ""}`}
            onClick={() => fileRef.current.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            {originalUrl ? (
              <span>Image loaded — click to replace</span>
            ) : (
              <>
                <span className="drop-icon">⬆</span>
                <span>Drop, paste (Ctrl+V), or click to browse</span>
                <span className="drop-hint">JPG or PNG · up to 20 MB</span>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={onFileChange}
            style={{ display: "none" }}
          />

          <div className="actions">
            <button
              className="btn btn-furnish"
              disabled={!originalUrl || loading}
              onClick={() => runEdit("furnish")}
            >
              {loading ? "Processing…" : "Furnish Room"}
            </button>
            <button
              className="btn btn-unfurnish"
              disabled={!originalUrl || loading}
              onClick={() => runEdit("unfurnish")}
            >
              {loading ? "Processing…" : "Unfurnish Room"}
            </button>
          </div>

          {loading && (
            <div className="status">
              <span className="spinner" /> Sending to Gemini — this may take 30–60 seconds…
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </section>

        {(originalUrl || resultUrl) && (
          <section className="viewers">
            {originalUrl && (
              <PannellumViewer imageUrl={originalUrl} label="Original" />
            )}
            {resultUrl && (
              <PannellumViewer imageUrl={resultUrl} label="AI Result" />
            )}
          </section>
        )}

        {resultUrl && (
          <div className="download-row">
            <button className="btn btn-download" onClick={downloadResult}>
              ⬇ Download Result
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
