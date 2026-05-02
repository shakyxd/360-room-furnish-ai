import { useEffect, useRef } from "react";

export default function PannellumViewer({ imageUrl, label, loading = false, elapsed = 0, syncRef, syncId }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!imageUrl || !containerRef.current || !window.pannellum) return;

    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    const timerId = setTimeout(() => {
      if (!containerRef.current) return;
      viewerRef.current = window.pannellum.viewer(containerRef.current, {
        type: "equirectangular",
        panorama: imageUrl,
        autoLoad: true,
        showControls: true,
        compass: false,
        showFullscreenCtrl: true,
        mouseZoom: true,
      });

      // Sync setup
      if (syncRef && syncId && viewerRef.current) {
        const el = containerRef.current;
        let dragging = false;
        let rafId;

        const onDown = () => { dragging = true; };
        const onUp = () => { dragging = false; };

        const loop = () => {
          const v = viewerRef.current;
          if (!v) return;
          if (dragging) {
            syncRef.current = { pitch: v.getPitch(), yaw: v.getYaw(), hfov: v.getHfov(), source: syncId };
          } else if (syncRef.current?.source !== syncId) {
            const { pitch, yaw, hfov } = syncRef.current ?? {};
            if (pitch != null) {
              v.setPitch(pitch, false);
              v.setYaw(yaw, false);
              v.setHfov(hfov, false);
            }
          }
          rafId = requestAnimationFrame(loop);
        };

        el.addEventListener("mousedown", onDown);
        el.addEventListener("touchstart", onDown, { passive: true });
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchend", onUp);
        rafId = requestAnimationFrame(loop);

        viewerRef.current._syncCleanup = () => {
          cancelAnimationFrame(rafId);
          el.removeEventListener("mousedown", onDown);
          el.removeEventListener("touchstart", onDown);
          window.removeEventListener("mouseup", onUp);
          window.removeEventListener("touchend", onUp);
        };
      }
    }, 50);

    return () => {
      clearTimeout(timerId);
      if (viewerRef.current) {
        viewerRef.current._syncCleanup?.();
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [imageUrl, syncRef, syncId]);

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
              <span className="overlay-elapsed">{elapsed}s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
