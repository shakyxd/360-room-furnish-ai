import { useEffect } from "react";
import PannellumViewer from "./PannellumViewer";

export default function HistoryModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = () => {
    const ext = item.mime.includes("jpeg") || item.mime.includes("jpg") ? "jpg" : "png";
    const a = document.createElement("a");
    a.href = item.url;
    a.download = `room-result.${ext}`;
    a.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {item.action === "furnish" ? "Furnished" : "Unfurnished"}
          </span>
          <div className="modal-actions">
            <button className="btn btn-download" onClick={download}>Download</button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-viewer">
          <PannellumViewer imageUrl={item.url} label="" />
        </div>
      </div>
    </div>
  );
}
