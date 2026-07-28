import { useEffect, useState } from "react";

export type Coordinates = { lat: number; lon: number };

// ─── Coordonnées programmées (repli si le GPS de l'appareil n'est pas disponible) ──

/** Parse une valeur de cellule CSV du type "41.0082,28.9784" en coordonnées. */
export function parseGpsString(value: unknown): Coordinates | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function currentTimeSlot(now: Date): "matin" | "apresmidi" | "soir" {
  const hour = now.getHours();
  if (hour < 12) return "matin";
  if (hour < 18) return "apresmidi";
  return "soir";
}

/**
 * Détermine les coordonnées à utiliser pour le jour courant, d'après les
 * colonnes optionnelles gps_matin / gps_apresmidi / gps_soir de
 * docs/jours-destinations.csv (format "lat,lon" par cellule). Essaie d'abord
 * le créneau horaire actuel, puis se rabat sur n'importe quel autre créneau
 * renseigné ce jour-là.
 */
export function getScheduledCoordinates(
  dayEntry: Record<string, unknown> | null | undefined,
  now: Date = new Date()
): Coordinates | null {
  if (!dayEntry) return null;

  const slot = currentTimeSlot(now);
  const order =
    slot === "matin"
      ? ["gps_matin", "gps_apresmidi", "gps_soir"]
      : slot === "apresmidi"
      ? ["gps_apresmidi", "gps_matin", "gps_soir"]
      : ["gps_soir", "gps_apresmidi", "gps_matin"];

  for (const key of order) {
    const coords = parseGpsString(dayEntry[key]);
    if (coords) return coords;
  }
  return null;
}

// ─── Géolocalisation de l'appareil ──────────────────────────────────────────

/**
 * Tente d'obtenir la position GPS de l'appareil. Retourne null tant que rien
 * n'est disponible (permission refusée, non supporté, ou pas encore résolu) —
 * l'appelant doit alors se rabattre sur getScheduledCoordinates.
 */
export function useDeviceLocation(): { coords: Coordinates | null; status: "pending" | "resolved" } {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<"pending" | "resolved">("pending");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("resolved");
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setStatus("resolved");
      },
      () => {
        if (cancelled) return;
        setStatus("resolved");
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, status };
}

// ─── Météo (Open-Meteo, gratuit, sans clé) ──────────────────────────────────

export type WeatherInfo = {
  temp: string;
  condition: string;
  emoji: string;
  humidity: string;
  rawTemp: number;
  windSpeedKmh: number;
  isPrecipitation: boolean;
};

type WeatherState = {
  weather: WeatherInfo | null;
  loading: boolean;
  error: boolean;
};

// Codes météo WMO (norme utilisée par Open-Meteo) → libellé + emoji en français.
function describeWeatherCode(code: number): { condition: string; emoji: string } {
  if (code === 0) return { condition: "Ciel dégagé", emoji: "☀️" };
  if (code === 1) return { condition: "Plutôt dégagé", emoji: "🌤️" };
  if (code === 2) return { condition: "Partiellement nuageux", emoji: "⛅" };
  if (code === 3) return { condition: "Couvert", emoji: "☁️" };
  if (code === 45 || code === 48) return { condition: "Brouillard", emoji: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Bruine", emoji: "🌦️" };
  if ([61, 63, 65, 66, 67].includes(code)) return { condition: "Pluie", emoji: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Neige", emoji: "❄️" };
  if ([80, 81, 82].includes(code)) return { condition: "Averses", emoji: "🌦️" };
  if ([95, 96, 99].includes(code)) return { condition: "Orage", emoji: "⛈️" };
  return { condition: "Conditions variables", emoji: "🌡️" };
}

// Codes météo WMO impliquant des précipitations (bruine, pluie, neige, averses, orage).
const PRECIPITATION_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
]);

/**
 * Conseil textuel adapté à la météo courante, une seule règle à la fois par
 * ordre de priorité : précipitations > froid > chaleur > vent fort > défaut.
 */
export function getWeatherAdvice(weather: WeatherInfo): string {
  if (weather.isPrecipitation) return "Prenez un parapluie ou une veste imperméable.";
  if (weather.rawTemp <= 10) return "Prévoyez une veste chaude, il fait frais.";
  if (weather.rawTemp >= 28) return "Pensez à l'eau, la casquette et la crème solaire.";
  if (weather.windSpeedKmh > 40) return "Attention au vent, évitez les objets qui pourraient s'envoler.";
  return "Météo agréable, profitez de votre journée !";
}

export function useWeather(coords: Coordinates | null): WeatherState {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!coords) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("weather fetch failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const current = data?.current;
        if (!current || typeof current.temperature_2m !== "number") {
          throw new Error("unexpected weather response");
        }
        const { condition, emoji } = describeWeatherCode(current.weather_code);
        setWeather({
          temp: `${Math.round(current.temperature_2m)}°C`,
          condition,
          emoji,
          humidity:
            typeof current.relative_humidity_2m === "number"
              ? `${Math.round(current.relative_humidity_2m)}%`
              : "—",
          rawTemp: current.temperature_2m,
          windSpeedKmh: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : 0,
          isPrecipitation: PRECIPITATION_CODES.has(current.weather_code),
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coords?.lat, coords?.lon]);

  return { weather, loading, error };
}
