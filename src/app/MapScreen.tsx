import "leaflet/dist/leaflet.css";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { ChevronLeft, ChevronDown, MapPin, LocateFixed } from "lucide-react";
import { JOURS_DESTINATIONS } from "../content/generated/jours-destinations";
import { PLACES, type Place } from "../content/places";
import type { PlaceDayOverrideMap } from "../types/cloud";
import { parseGpsString, useDeviceLocation } from "./weather";
import { formatTripDayLabel } from "./trip-day-format";

// Fix default Leaflet marker icons broken by Vite asset bundling
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type MapMarker = {
  key: string;
  lat: number;
  lon: number;
  day: number;
  destination: string;
  placeCount: number;
};

type DayOption = { value: number | "all"; label: string; isToday: boolean };

function normalizePlaceDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .map((day) => (typeof day === "number" && Number.isFinite(day) ? Math.trunc(day) : Number.NaN))
        .filter((day) => Number.isFinite(day) && day > 0)
    )
  ).sort((left, right) => left - right);
}

function getEffectivePlaceDays(
  place: { id: string; jour?: number[] },
  placeDayOverrideMap: PlaceDayOverrideMap
): number[] {
  const overrideDays = placeDayOverrideMap[place.id];
  return overrideDays && overrideDays.length > 0 ? overrideDays : normalizePlaceDays(place.jour ?? []);
}

export function buildMarkers(
  days: number[],
  placeDayOverrideMap: PlaceDayOverrideMap = {},
  places: Place[] = PLACES
): MapMarker[] {
  const seen = new Set<string>();
  const markers: MapMarker[] = [];

  for (const day of days) {
    const entry = JOURS_DESTINATIONS.find((d) => d.jour === day);
    if (!entry) continue;

    const placeCount = places.filter((place) =>
      getEffectivePlaceDays(place as { id: string; jour?: number[] }, placeDayOverrideMap).includes(day)
    ).length;

    for (const slot of ["gps_matin", "gps_apresmidi", "gps_soir"] as const) {
      const coords = parseGpsString(entry[slot]);
      if (!coords) continue;

      // Deduplicate markers at exactly the same coordinates for the same day
      const key = `${day}-${coords.lat}-${coords.lon}`;
      if (seen.has(key)) continue;
      seen.add(key);

      markers.push({
        key,
        lat: coords.lat,
        lon: coords.lon,
        day,
        destination: entry.destination,
        placeCount,
      });
    }
  }

  return markers;
}

function useIsOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);
  return online;
}

// Fly the map to given coordinates when triggered
function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 1.2 });
  }, [map, target]);
  return null;
}

export function MapScreen({
  places = PLACES,
  onBack,
  currentDay,
  tripStartDate,
  placeDayOverrideMap,
  onNavigateToGuide,
}: {
  // Places par défaut + visites ajoutées par le propriétaire (voir
  // placesWithOverrides dans App.tsx), pour que les visites imprévues soient
  // comptées dans les marqueurs de la carte.
  places?: Place[];
  onBack: () => void;
  currentDay: number;
  tripStartDate?: string | null;
  placeDayOverrideMap: PlaceDayOverrideMap;
  onNavigateToGuide: (day: number) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<number | "all">(currentDay);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const isOnline = useIsOnline();
  const { coords: deviceCoords } = useDeviceLocation();

  const lastDay = JOURS_DESTINATIONS.length > 0
    ? Math.max(...JOURS_DESTINATIONS.map((d) => d.jour))
    : currentDay;

  const dayOptions: DayOption[] = [
    ...JOURS_DESTINATIONS.map((d) => ({
      value: d.jour as number | "all",
      label: `${formatTripDayLabel(d.jour, tripStartDate)} — ${d.destination}`,
      isToday: d.jour === currentDay,
    })),
    { value: "all", label: "Tous les jours", isToday: false },
  ];

  const selectedOption = dayOptions.find((o) => o.value === selectedDay);
  const selectedEntry =
    selectedDay !== "all"
      ? JOURS_DESTINATIONS.find((d) => d.jour === selectedDay) ?? null
      : null;

  const daysToShow: number[] =
    selectedDay === "all"
      ? JOURS_DESTINATIONS.map((d) => d.jour)
      : [selectedDay];

  const markers = buildMarkers(daysToShow, placeDayOverrideMap, places);

  // Compute map center: average of all markers or fallback to Turkey center
  const center: [number, number] =
    markers.length > 0
      ? [
          markers.reduce((sum, m) => sum + m.lat, 0) / markers.length,
          markers.reduce((sum, m) => sum + m.lon, 0) / markers.length,
        ]
      : [39.0, 35.0];

  const zoom = selectedDay === "all" ? 5 : 10;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="relative bg-accent text-accent-foreground px-6 pt-12 pb-6 flex-shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute top-8 right-10 w-10 h-10 rotate-45 bg-white/10" />
          <div className="absolute bottom-3 left-5 w-7 h-7 rounded-full bg-white/10" />
          <div className="absolute bottom-6 left-16 w-4 h-4 rotate-12 bg-white/10" />
        </div>
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 className="relative z-10 text-2xl font-black">Carte interactive 🗺️</h1>

        {/* Day selector */}
        <div className="relative z-[900] mt-3">
          <button
            onClick={() => setSelectorOpen((prev) => !prev)}
            className="w-full flex items-center justify-between bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm"
          >
            <span className="text-left">
              <span className="block text-sm font-black">
                {selectedDay === "all"
                  ? "Tous les jours"
                  : formatTripDayLabel(selectedDay, tripStartDate)}
                {selectedDay !== "all" && selectedDay === currentDay && (
                  <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-white/25 rounded-full px-2 py-0.5 align-middle">
                    aujourd'hui
                  </span>
                )}
              </span>
              {selectedEntry && (
                <span className="block text-xs opacity-80 mt-0.5">
                  {selectedEntry.destination}
                </span>
              )}
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform flex-shrink-0 ${selectorOpen ? "rotate-180" : ""}`}
            />
          </button>

          {selectorOpen && (
            <>
              <div className="fixed inset-0 z-[999]" onClick={() => setSelectorOpen(false)} />
              <div className="absolute left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl overflow-hidden z-[1000] max-h-64 overflow-y-auto">
                {dayOptions.map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => {
                      setSelectedDay(opt.value);
                      setSelectorOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition-colors ${
                      selectedDay === opt.value
                        ? "bg-accent/10 font-bold text-accent"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="block font-semibold">
                      {opt.value === "all" ? "Tous les jours" : formatTripDayLabel(opt.value, tripStartDate)}
                      {opt.isToday && (
                        <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-accent/20 text-accent rounded-full px-2 py-0.5 align-middle">
                          aujourd'hui
                        </span>
                      )}
                    </span>
                    {opt.value !== "all" && (
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {JOURS_DESTINATIONS.find((d) => d.jour === opt.value)?.destination ?? ""}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-xs font-semibold text-yellow-800">
          Carte non disponible hors ligne · Les marqueurs restent accessibles
        </div>
      )}

      {/* Map or empty state */}
      {markers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <MapPin size={48} className="text-muted-foreground/40" />
          <p className="text-center text-muted-foreground font-semibold">
            Aucun lieu avec coordonnées pour ce jour.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Consultez le guide pour voir tous les lieux de cette journée.
          </p>
          {selectedDay !== "all" && (
            <button
              onClick={() => {
                onNavigateToGuide(selectedDay as number);
              }}
              className="mt-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold text-sm"
            >
              Voir le guide — {formatTripDayLabel(selectedDay, tripStartDate)}
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 relative">
          {/* Locate me button — floats over the map */}
          {deviceCoords && (
            <button
              onClick={() => setFlyTarget([deviceCoords.lat, deviceCoords.lon])}
              className="absolute bottom-4 right-4 z-[500] bg-white rounded-full shadow-lg p-3 border border-gray-200 active:scale-95 transition-transform"
              title="Voir ma position"
            >
              <LocateFixed size={20} className="text-blue-600" />
            </button>
          )}

          <MapContainer
            key={`${String(selectedDay)}-${lastDay}`}
            center={center}
            zoom={zoom}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyTo target={flyTarget} />

            {/* Device GPS position — blue dot */}
            {deviceCoords && (
              <CircleMarker
                center={[deviceCoords.lat, deviceCoords.lon]}
                radius={8}
                pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <span className="text-sm font-semibold">📍 Vous êtes ici</span>
                </Popup>
              </CircleMarker>
            )}

            {markers.map((marker) => (
              <Marker
                key={marker.key}
                position={[marker.lat, marker.lon]}
                icon={defaultIcon}
              >
                <Popup>
                  <div className="text-sm min-w-[160px]">
                    <p className="font-bold mb-1">
                      {formatTripDayLabel(marker.day, tripStartDate)}
                      {marker.day === currentDay && (
                        <span className="ml-1 text-[10px] font-black uppercase text-blue-600">
                          · aujourd'hui
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600 mb-2">{marker.destination}</p>
                    {marker.placeCount > 0 && (
                      <p className="text-xs text-gray-500 mb-2">
                        {marker.placeCount} lieu{marker.placeCount > 1 ? "x" : ""} à découvrir
                      </p>
                    )}
                    <button
                      onClick={() => onNavigateToGuide(marker.day)}
                      className="w-full text-center bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                    >
                      Voir les lieux du guide
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
