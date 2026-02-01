import { createContext, useContext, useMemo, useState } from "react";

const LogContext = createContext(null);

export const LogProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  const addLog = (message) => {
    setLogs((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), message }];
      return next.slice(-200);
    });
  };

  const value = useMemo(
    () => ({
      logs,
      isVisible,
      toggleVisibility: () => setIsVisible((prev) => !prev),
      addLog,
    }),
    [logs, isVisible],
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export const useLogs = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLogs must be used inside LogProvider");
  }
  return context;
};
