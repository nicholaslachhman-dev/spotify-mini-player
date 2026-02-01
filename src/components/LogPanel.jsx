import { useLogs } from "../context/LogContext";

// Floating panel for quick debug logging in the UI.
const LogPanel = () => {
  const { logs, isVisible } = useLogs();

  if (!isVisible) return null;

  return (
    <div className="absolute right-6 bottom-24 w-96 max-h-60 overflow-auto rounded-lg border border-white/20 bg-black/70 p-3 text-xs text-white/80">
      <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/50">
        Logs
      </div>
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
  );
};

export default LogPanel;
