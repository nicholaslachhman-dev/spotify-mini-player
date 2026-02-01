import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { useInterval } from "./useInterval";
import { useLogs } from "../context/LogContext";

// Polls the server for cached Open-Meteo data every 30 minutes.
export const useWeather = () => {
  const [weather, setWeather] = useState(null);
  const { addLog } = useLogs();

  const fetchWeather = async () => {
    const response = await apiGet("/weather");
    if (response.status === 200) {
      setWeather(response.data);
      addLog("Weather updated.");
    } else {
      addLog("Weather update failed.");
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  useInterval(fetchWeather, 30 * 60 * 1000);

  return weather;
};
