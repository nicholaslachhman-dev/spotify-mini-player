import { useEffect, useRef } from "react";

// Tracks user activity and fires onIdle after a timeout.
export const useIdleTimer = ({ timeoutMs, onIdle }) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(onIdle, timeoutMs);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [timeoutMs, onIdle]);
};
