import { useEffect, useRef } from "react";

export default function PannellumViewer({ imageUrl, label, loading = false }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!imageUrl || !containerRef.current || !window.pannellum) return;

    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    viewerRef.current = window.pannellum.viewer(containerRef.current, {
      type: "equirectangular",
      panorama: imageUrl,
      autoLoad: true,
      showControls: true,
      compass: false,
      showFullscreenCtrl: true,
      mouseZoom: true,
    });

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [imageUrl]);

  return (
    <div className="viewer-wrapper">
      <div className="viewer-label">{label}</div>
      <div className="pannellum-outer">
        <div ref={containerRef} className="pannellum-container" />

        {!imageUrl && !loading && (
          <div className="viewer-placeholder">
            <span className="placeholder-icon">◻</span>
            <span>AI result will appear here</span>
          </div>
        )}

        {loading && (
          <div className="viewer-overlay">
            <div className="scan-line" />
            <div className="overlay-pulse" />
            <div className="overlay-center">
              <div className="overlay-spinner" />
              <span>Generating…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
