import { useEffect, useRef, useState } from "react";

// Background layer that crossfades album art for atmosphere.
const Background = ({ imageUrl }) => {
  const [currentUrl, setCurrentUrl] = useState(imageUrl || null);
  const [previousUrl, setPreviousUrl] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const [currentVisible, setCurrentVisible] = useState(true);
  const [previousVisible, setPreviousVisible] = useState(false);
  const fadeTimerRef = useRef(null);

  useEffect(() => {
    if (!imageUrl || imageUrl === currentUrl) return;
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setPreviousUrl(currentUrl);
      setPreviousVisible(true);
      setCurrentUrl(imageUrl);
      setIsFading(true);
      setCurrentVisible(false);

      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
      requestAnimationFrame(() => {
        setPreviousVisible(false);
        setCurrentVisible(true);
      });
      fadeTimerRef.current = setTimeout(() => {
        setIsFading(false);
        setPreviousUrl(null);
      }, 1000);
    };
  }, [imageUrl, currentUrl]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0">
      {previousUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-md transition-opacity duration-[1000ms] ease-in-out"
          style={{
            backgroundImage: previousUrl ? `url(${previousUrl})` : "none",
            opacity: previousVisible && isFading ? 0.7 : 0,
          }}
        />
      )}
      <div
        className="absolute inset-0 bg-cover bg-center blur-md transition-opacity duration-[1000ms] ease-in-out"
        style={{
          backgroundImage: currentUrl ? `url(${currentUrl})` : "none",
          opacity: currentVisible ? 0.7 : 0,
        }}
      />
      <div className="absolute inset-0" />
    </div>
  );
};

export default Background;
