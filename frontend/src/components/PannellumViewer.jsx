import { useEffect, useRef } from "react";

export default function PannellumViewer({ imageUrl, label }) {
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
      <div ref={containerRef} className="pannellum-container" />
    </div>
  );
}
