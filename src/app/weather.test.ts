import { describe, expect, it } from "vitest";
import { getScheduledCoordinates, getWeatherAdvice, parseGpsString, type WeatherInfo } from "./weather";

function makeWeather(overrides: Partial<WeatherInfo> = {}): WeatherInfo {
  return {
    temp: "20°C",
    condition: "Ciel dégagé",
    emoji: "☀️",
    humidity: "50%",
    rawTemp: 20,
    windSpeedKmh: 10,
    isPrecipitation: false,
    ...overrides,
  };
}

describe("parseGpsString", () => {
  it("parse une chaîne lat,lon valide", () => {
    expect(parseGpsString("41.0082,28.9784")).toEqual({ lat: 41.0082, lon: 28.9784 });
  });

  it("tolère les espaces autour de la virgule", () => {
    expect(parseGpsString("41.0082 , 28.9784")).toEqual({ lat: 41.0082, lon: 28.9784 });
  });

  it("accepte les coordonnées négatives", () => {
    expect(parseGpsString("-33.86,151.20")).toEqual({ lat: -33.86, lon: 151.2 });
  });

  it("retourne null pour une valeur vide, absente ou mal formée", () => {
    expect(parseGpsString("")).toBeNull();
    expect(parseGpsString(undefined)).toBeNull();
    expect(parseGpsString(null)).toBeNull();
    expect(parseGpsString("pas des coordonnées")).toBeNull();
    expect(parseGpsString(41.0082)).toBeNull();
  });
});

describe("getScheduledCoordinates", () => {
  const dayEntry = {
    gps_matin: "41.0082,28.9784",
    gps_apresmidi: "41.0369,28.9850",
    gps_soir: "",
  };

  it("retourne null si aucune entrée de jour n'est fournie", () => {
    expect(getScheduledCoordinates(null)).toBeNull();
    expect(getScheduledCoordinates(undefined)).toBeNull();
  });

  it("choisit le créneau du matin avant midi", () => {
    expect(getScheduledCoordinates(dayEntry, new Date(2026, 7, 16, 9))).toEqual({
      lat: 41.0082,
      lon: 28.9784,
    });
  });

  it("choisit le créneau de l'après-midi entre midi et 18h", () => {
    expect(getScheduledCoordinates(dayEntry, new Date(2026, 7, 16, 14))).toEqual({
      lat: 41.0369,
      lon: 28.985,
    });
  });

  it("se rabat sur un autre créneau si celui du soir est vide", () => {
    expect(getScheduledCoordinates(dayEntry, new Date(2026, 7, 16, 20))).toEqual({
      lat: 41.0369,
      lon: 28.985,
    });
  });

  it("retourne null si aucun créneau n'est renseigné", () => {
    expect(getScheduledCoordinates({}, new Date(2026, 7, 16, 9))).toBeNull();
  });
});

describe("getWeatherAdvice", () => {
  it("recommande un parapluie en cas de précipitations, même s'il fait chaud", () => {
    expect(getWeatherAdvice(makeWeather({ isPrecipitation: true, rawTemp: 30 }))).toBe(
      "Prenez un parapluie ou une veste imperméable."
    );
  });

  it("recommande une veste chaude quand il fait 10°C ou moins", () => {
    expect(getWeatherAdvice(makeWeather({ rawTemp: 10 }))).toBe(
      "Prévoyez une veste chaude, il fait frais."
    );
    expect(getWeatherAdvice(makeWeather({ rawTemp: 2 }))).toBe(
      "Prévoyez une veste chaude, il fait frais."
    );
  });

  it("recommande eau/casquette/crème solaire quand il fait 28°C ou plus", () => {
    expect(getWeatherAdvice(makeWeather({ rawTemp: 28 }))).toBe(
      "Pensez à l'eau, la casquette et la crème solaire."
    );
  });

  it("recommande la prudence en cas de vent fort (> 40 km/h)", () => {
    expect(getWeatherAdvice(makeWeather({ rawTemp: 20, windSpeedKmh: 45 }))).toBe(
      "Attention au vent, évitez les objets qui pourraient s'envoler."
    );
  });

  it("recommande de profiter de la journée par défaut", () => {
    expect(getWeatherAdvice(makeWeather())).toBe("Météo agréable, profitez de votre journée !");
  });

  it("priorise la pluie sur la chaleur si les deux conditions sont réunies", () => {
    expect(
      getWeatherAdvice(makeWeather({ isPrecipitation: true, rawTemp: 29, windSpeedKmh: 50 }))
    ).toBe("Prenez un parapluie ou une veste imperméable.");
  });
});
