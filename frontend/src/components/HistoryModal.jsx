import { useEffect, useRef, useState, useCallback } from "react";
import PannellumViewer from "./PannellumViewer";

export default function HistoryModal({ item, onClose }) {
  const [sliderPos, setSliderPos] = useState(50);
  const sliderWrapRef = useRef(null);
  const draggingSlider = useRef(false);
  const modalSyncRef = useRef({ pitch: 0, yaw: 0, hfov: 100, source: null });

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onSliderMouseDown = (e) => {
    e.preventDefault();
    draggingSlider.current = true;
  };

  const onMouseMove = useCallback((e) => {
    if (!draggingSlider.current || !sliderWrapRef.current) return;
    const rect = sliderWrapRef.current.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onMouseUp = useCallback(() => { draggingSlider.current = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onMouseMove);
    window.addEventListener("touchend", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onMouseMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const download = () => {
    const ext = item.mime.includes("jpeg") || item.mime.includes("jpg") ? "jpg" : "png";
    const a = document.createElement("a");
    a.href = item.url;
    a.download = `room-${item.style ?? item.action}.${ext}`;
    a.click();
  };

  const hasOriginal = !!item.originalUrl;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {item.action === "furnish" ? (item.style ?? "Furnished") : "Unfurnished"}
            {hasOriginal && <span className="modal-hint"> — drag the handle to compare</span>}
          </span>
          <div className="modal-actions">
            <button className="btn btn-download" onClick={download}>Download</button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-viewer">
          {hasOriginal ? (
            <div className="slider-wrap" ref={sliderWrapRef}>
              {/* AI result — full width behind */}
              <div className="slider-layer slider-after">
                <PannellumViewer imageUrl={item.url} label="" syncRef={modalSyncRef} syncId="after" />
              </div>

              {/* Original — clipped to left of handle */}
              <div className="slider-layer slider-before" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <PannellumViewer imageUrl={item.originalUrl} label="" syncRef={modalSyncRef} syncId="before" />
              </div>

              {/* Labels */}
              <div className="slider-label slider-label-left" style={{ opacity: sliderPos > 15 ? 1 : 0 }}>Original</div>
              <div className="slider-label slider-label-right" style={{ opacity: sliderPos < 85 ? 1 : 0 }}>
                {item.style ?? "AI Result"}
              </div>

              {/* Draggable handle */}
              <div className="slider-handle" style={{ left: `${sliderPos}%` }} onMouseDown={onSliderMouseDown} onTouchStart={onSliderMouseDown}>
                <div className="slider-line" />
                <div className="slider-knob">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <PannellumViewer imageUrl={item.url} label="" />
          )}
        </div>
      </div>
    </div>
  );
}
