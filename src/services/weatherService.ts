import {
  WeatherForecastData,
  DailyForecast,
  CityLocation,
  WeatherIconType,
  EventSuitability,
} from '../types/weather';
import { formatDateToISO } from '../utils/dateUtils';

export const PRESET_CITIES: CityLocation[] = [
  { id: 'nyc', name: 'New York', region: 'NY', country: 'United States', latitude: 40.7128, longitude: -74.006 },
  { id: 'sfo', name: 'San Francisco', region: 'CA', country: 'United States', latitude: 37.7749, longitude: -122.4194 },
  { id: 'chi', name: 'Chicago', region: 'IL', country: 'United States', latitude: 41.8781, longitude: -87.6298 },
  { id: 'lax', name: 'Los Angeles', region: 'CA', country: 'United States', latitude: 34.0522, longitude: -118.2437 },
  { id: 'lon', name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
  { id: 'par', name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
  { id: 'tok', name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
  { id: 'syd', name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093 },
  { id: 'tor', name: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
  { id: 'ber', name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405 },
  { id: 'blr', name: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946 },
  { id: 'sin', name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
];

export const DEFAULT_CITY = PRESET_CITIES[0]; // New York

const WEATHER_STORAGE_KEY = 'smart_calendar_weather_data_v1';
const LOCATION_STORAGE_KEY = 'smart_calendar_selected_city_v1';
const TEMP_UNIT_STORAGE_KEY = 'smart_calendar_temp_unit_v1';

// Convert Celsius to Fahrenheit
export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

// Convert Fahrenheit to Celsius
export function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

// Interpret WMO Weather Code
export function interpretWeatherCode(code: number, rainProb = 0): {
  condition: string;
  iconType: WeatherIconType;
  suitability: EventSuitability;
} {
  switch (code) {
    case 0:
      return {
        condition: 'Clear Sky',
        iconType: 'sun',
        suitability: {
          rating: 'ideal',
          label: 'Ideal for Outdoor',
          description: 'Sunny and clear. Perfect for outdoor events, team picnics, and sports.',
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
          badgeText: 'text-emerald-700 dark:text-emerald-300',
        },
      };
    case 1:
      return {
        condition: 'Mostly Sunny',
        iconType: 'cloud-sun',
        suitability: {
          rating: 'ideal',
          label: 'Great for Events',
          description: 'Pleasant with high visibility. Excellent for any planned activity.',
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
          badgeText: 'text-emerald-700 dark:text-emerald-300',
        },
      };
    case 2:
      return {
        condition: 'Partly Cloudy',
        iconType: 'cloud-sun',
        suitability: {
          rating: 'good',
          label: 'Pleasant Weather',
          description: 'Comfortable clouds. Good conditions for both indoor and outdoor plans.',
          badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
          badgeText: 'text-blue-700 dark:text-blue-300',
        },
      };
    case 3:
      return {
        condition: 'Overcast',
        iconType: 'cloud',
        suitability: {
          rating: 'good',
          label: 'Moderate Outdoor',
          description: 'Cloudy skies. Low glare, comfortable for meetings and walks.',
          badgeBg: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          badgeText: 'text-gray-700 dark:text-gray-300',
        },
      };
    case 45:
    case 48:
      return {
        condition: 'Foggy',
        iconType: 'cloud-fog',
        suitability: {
          rating: 'caution',
          label: 'Low Visibility',
          description: 'Dense fog possible. Plan extra commute time for off-site events.',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
          badgeText: 'text-amber-700 dark:text-amber-300',
        },
      };
    case 51:
    case 53:
    case 55:
      return {
        condition: 'Light Drizzle',
        iconType: 'cloud-drizzle',
        suitability: {
          rating: 'caution',
          label: 'Drizzle Expected',
          description: 'Light rain chances. Covered outdoor spaces or indoor venue advised.',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
          badgeText: 'text-amber-700 dark:text-amber-300',
        },
      };
    case 61:
    case 63:
    case 65:
    case 80:
    case 81:
    case 82:
      return {
        condition: code === 65 || code === 82 ? 'Heavy Rain' : 'Rain Showers',
        iconType: 'cloud-rain',
        suitability: {
          rating: 'indoor',
          label: 'Indoor Advised',
          description: `High precipitation (${rainProb}%). Plan indoor venue and provide umbrellas.`,
          badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
          badgeText: 'text-indigo-700 dark:text-indigo-300',
        },
      };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return {
        condition: 'Snow Showers',
        iconType: 'cloud-snow',
        suitability: {
          rating: 'caution',
          label: 'Snow Conditions',
          description: 'Cold and slippery. Best for warm indoor events or winter gear.',
          badgeBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
          badgeText: 'text-sky-700 dark:text-sky-300',
        },
      };
    case 95:
    case 96:
    case 99:
      return {
        condition: 'Thunderstorm',
        iconType: 'cloud-lightning',
        suitability: {
          rating: 'indoor',
          label: 'Hazardous Weather',
          description: 'Storms expected. Keep events indoors and monitor weather alerts.',
          badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
          badgeText: 'text-rose-700 dark:text-rose-300',
        },
      };
    default:
      return {
        condition: 'Partly Sunny',
        iconType: 'cloud-sun',
        suitability: {
          rating: 'good',
          label: 'Fair Conditions',
          description: 'Fair weather for general scheduling.',
          badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
          badgeText: 'text-blue-700 dark:text-blue-300',
        },
      };
  }
}

// Generate high-quality realistic fallback forecast data matching today and 4 following days
export function generateFallbackForecast(city: CityLocation = DEFAULT_CITY): WeatherForecastData {
  const now = new Date();
  const days: DailyForecast[] = [];

  const sampleConditions = [
    { code: 1, cMin: 14, cMax: 23, rain: 10 },
    { code: 2, cMin: 15, cMax: 24, rain: 20 },
    { code: 0, cMin: 16, cMax: 26, rain: 5 },
    { code: 61, cMin: 13, cMax: 19, rain: 75 },
    { code: 2, cMin: 14, cMax: 22, rain: 25 },
  ];

  for (let i = 0; i < 5; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = formatDateToISO(d);

    const dayName =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-US', { weekday: 'short' });

    const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sample = sampleConditions[i % sampleConditions.length];
    const { condition, iconType, suitability } = interpretWeatherCode(sample.code, sample.rain);

    days.push({
      date: dateStr,
      dayName,
      shortDate,
      weatherCode: sample.code,
      condition,
      iconType,
      minTempC: sample.cMin,
      maxTempC: sample.cMax,
      minTempF: cToF(sample.cMin),
      maxTempF: cToF(sample.cMax),
      precipitationProb: sample.rain,
      windSpeedKmH: 14 + (i * 2),
      suitability,
    });
  }

  const today = days[0];

  return {
    location: city,
    currentTempC: Math.round((today.minTempC + today.maxTempC) / 2),
    currentTempF: cToF(Math.round((today.minTempC + today.maxTempC) / 2)),
    currentCondition: today.condition,
    currentIconType: today.iconType,
    humidity: 55,
    windSpeedKmH: 16,
    forecastDays: days,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isFallback: true,
  };
}

// Fetch 5-Day forecast from Open-Meteo API
export async function fetch5DayForecast(city: CityLocation): Promise<WeatherForecastData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto&forecast_days=6`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      throw new Error('Incomplete weather payload');
    }

    const dailyTimes: string[] = data.daily.time;
    const weatherCodes: number[] = data.daily.weather_code || [];
    const maxTemps: number[] = data.daily.temperature_2m_max || [];
    const minTemps: number[] = data.daily.temperature_2m_min || [];
    const precipProbs: number[] = data.daily.precipitation_probability_max || [];
    const windSpeeds: number[] = data.daily.wind_speed_10m_max || [];

    const now = new Date();
    const todayISO = formatDateToISO(now);

    const forecastDays: DailyForecast[] = [];
    const count = Math.min(5, dailyTimes.length);

    for (let i = 0; i < count; i++) {
      const dateStr = dailyTimes[i];
      const dateObj = new Date(dateStr + 'T12:00:00');
      const isToday = dateStr === todayISO || i === 0;
      const isTomorrow = i === 1;

      const dayName = isToday
        ? 'Today'
        : isTomorrow
        ? 'Tomorrow'
        : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const wCode = weatherCodes[i] ?? 0;
      const rainProb = precipProbs[i] ?? 0;
      const { condition, iconType, suitability } = interpretWeatherCode(wCode, rainProb);

      const maxC = Math.round(maxTemps[i] ?? 20);
      const minC = Math.round(minTemps[i] ?? 12);

      forecastDays.push({
        date: dateStr,
        dayName,
        shortDate,
        weatherCode: wCode,
        condition,
        iconType,
        maxTempC: maxC,
        minTempC: minC,
        maxTempF: cToF(maxC),
        minTempF: cToF(minC),
        precipitationProb: rainProb,
        windSpeedKmH: Math.round(windSpeeds[i] ?? 15),
        suitability,
      });
    }

    const currentTempC = Math.round(data.current?.temperature_2m ?? forecastDays[0].maxTempC);
    const currentWeatherCode = data.current?.weather_code ?? forecastDays[0].weatherCode;
    const currentInterp = interpretWeatherCode(currentWeatherCode);

    const result: WeatherForecastData = {
      location: city,
      currentTempC,
      currentTempF: cToF(currentTempC),
      currentCondition: currentInterp.condition,
      currentIconType: currentInterp.iconType,
      humidity: data.current?.relative_humidity_2m ? Math.round(data.current.relative_humidity_2m) : undefined,
      windSpeedKmH: data.current?.wind_speed_10m ? Math.round(data.current.wind_speed_10m) : undefined,
      forecastDays,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFallback: false,
    };

    // Cache locally
    try {
      localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(result));
    } catch (e) {
      // Storage full or private mode
    }

    return result;
  } catch (err) {
    console.warn('Live weather fetch failed, attempting server proxy or fallback:', err);
    // Try server proxy
    try {
      const serverRes = await fetch(`/api/weather?lat=${city.latitude}&lon=${city.longitude}`);
      if (serverRes.ok) {
        const proxyData = await serverRes.json();
        if (proxyData && proxyData.forecastDays) {
          proxyData.location = city;
          return proxyData;
        }
      }
    } catch (proxyErr) {
      // Ignore
    }

    // Try reading cached data
    try {
      const cached = localStorage.getItem(WEATHER_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.forecastDays)) {
          return parsed;
        }
      }
    } catch (e) {
      // Continue to fallback
    }

    return generateFallbackForecast(city);
  }
}

// Get saved city preference
export function getSavedCity(): CityLocation {
  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_CITY;
}

// Save city preference
export function saveCity(city: CityLocation) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(city));
  } catch (e) {
    // ignore
  }
}

// Get saved temperature unit preference
export function getSavedTempUnit(): 'F' | 'C' {
  try {
    const saved = localStorage.getItem(TEMP_UNIT_STORAGE_KEY);
    if (saved === 'C' || saved === 'F') return saved;
  } catch (e) {
    // ignore
  }
  return 'F'; // Default to Fahrenheit for Google Calendar standard US
}

// Save temperature unit preference
export function saveTempUnit(unit: 'F' | 'C') {
  try {
    localStorage.setItem(TEMP_UNIT_STORAGE_KEY, unit);
  } catch (e) {
    // ignore
  }
}

// Search cities via Open-Meteo Geocoding API with fallback to preset list
export async function searchCities(query: string): Promise<CityLocation[]> {
  const q = query.trim().toLowerCase();
  if (!q) return PRESET_CITIES.slice(0, 6);

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=6&language=en&format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((r: any) => ({
          id: `${r.latitude}_${r.longitude}`,
          name: r.name,
          region: r.admin1,
          country: r.country,
          latitude: r.latitude,
          longitude: r.longitude,
        }));
      }
    }
  } catch (e) {
    // fallback to preset search
  }

  return PRESET_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.region && c.region.toLowerCase().includes(q)) ||
      c.country.toLowerCase().includes(q)
  );
}
