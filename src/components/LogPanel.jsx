import { useEffect, useRef, useState } from "react";
import { useLogs } from "../context/LogContext";

// Floating panel for quick debug logging in the UI.
const LogPanel = () => {
  const { logs, isVisible } = useLogs();
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [size, setSize] = useState({ width: 380, height: 220 });
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);

  useEffect(() => {
    const handleMove = (event) => {
      if (dragging) {
        const nextX = event.clientX - dragging.offsetX;
        const nextY = event.clientY - dragging.offsetY;
        setPosition({ x: Math.max(0, nextX), y: Math.max(0, nextY) });
      }

      if (resizing) {
        const { startX, startY, startWidth, startHeight, dir } = resizing;
        let nextWidth = startWidth;
        let nextHeight = startHeight;
        let nextX = position.x;
        let nextY = position.y;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        if (dir.includes("e")) nextWidth = Math.max(260, startWidth + dx);
        if (dir.includes("s")) nextHeight = Math.max(160, startHeight + dy);
        if (dir.includes("w")) {
          nextWidth = Math.max(260, startWidth - dx);
          nextX = position.x + dx;
        }
        if (dir.includes("n")) {
          nextHeight = Math.max(160, startHeight - dy);
          nextY = position.y + dy;
        }

        setSize({ width: nextWidth, height: nextHeight });
        setPosition({ x: Math.max(0, nextX), y: Math.max(0, nextY) });
      }
    };

    const handleUp = () => {
      setDragging(null);
      setResizing(null);
    };

    if (dragging || resizing) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, resizing, position.x, position.y]);

  const startDrag = (event) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  };

  const startResize = (event, dir) => {
    event.stopPropagation();
    setResizing({
      dir,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: size.width,
      startHeight: size.height,
    });
  };

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[999] select-none pointer-events-auto rounded-lg border border-white/20 bg-black/80 text-xs text-white/80 shadow-2xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      <div
        className="flex cursor-move items-center justify-between rounded-t-lg border-b border-white/10 bg-black/60 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/50"
        onMouseDown={startDrag}
      >
        Logs
        <span className="text-[10px] text-white/30">drag to move</span>
      </div>
      <div className="h-[calc(100%-34px)] overflow-auto px-3 py-2">
        {logs.length === 0 ? (
          <div className="text-white/40">No logs yet.</div>
        ) : (
          <ul className="space-y-1">
            {logs.map((log) => (
              <li key={log.id}>{log.message}</li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="absolute left-1/2 top-0 h-2 w-6 -translate-x-1/2 cursor-n-resize"
        onMouseDown={(event) => startResize(event, "n")}
      />
      <div
        className="absolute left-1/2 bottom-0 h-2 w-6 -translate-x-1/2 cursor-s-resize"
        onMouseDown={(event) => startResize(event, "s")}
      />
      <div
        className="absolute left-0 top-1/2 h-6 w-2 -translate-y-1/2 cursor-w-resize"
        onMouseDown={(event) => startResize(event, "w")}
      />
      <div
        className="absolute right-0 top-1/2 h-6 w-2 -translate-y-1/2 cursor-e-resize"
        onMouseDown={(event) => startResize(event, "e")}
      />
      <div
        className="absolute left-0 top-0 h-3 w-3 cursor-nw-resize"
        onMouseDown={(event) => startResize(event, "nw")}
      />
      <div
        className="absolute right-0 top-0 h-3 w-3 cursor-ne-resize"
        onMouseDown={(event) => startResize(event, "ne")}
      />
      <div
        className="absolute left-0 bottom-0 h-3 w-3 cursor-sw-resize"
        onMouseDown={(event) => startResize(event, "sw")}
      />
      <div
        className="absolute right-0 bottom-0 h-3 w-3 cursor-se-resize"
        onMouseDown={(event) => startResize(event, "se")}
      />
    </div>
  );
};

export default LogPanel;
