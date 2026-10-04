export type WeatherIconType =
  | 'sun'
  | 'cloud-sun'
  | 'cloud'
  | 'cloud-rain'
  | 'cloud-drizzle'
  | 'cloud-lightning'
  | 'cloud-snow'
  | 'cloud-fog'
  | 'wind';

export type EventSuitabilityRating = 'ideal' | 'good' | 'caution' | 'indoor';

export interface EventSuitability {
  rating: EventSuitabilityRating;
  label: string;
  description: string;
  badgeBg: string;
  badgeText: string;
}

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  dayName: string; // 'Today', 'Tomorrow', 'Tue', etc.
  shortDate: string; // 'Oct 4'
  weatherCode: number;
  condition: string;
  iconType: WeatherIconType;
  maxTempC: number;
  minTempC: number;
  maxTempF: number;
  minTempF: number;
  precipitationProb: number; // 0-100%
  windSpeedKmH: number;
  suitability: EventSuitability;
}

export interface CityLocation {
  id: string;
  name: string;
  region?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface WeatherForecastData {
  location: CityLocation;
  currentTempC: number;
  currentTempF: number;
  currentCondition: string;
  currentIconType: WeatherIconType;
  humidity?: number;
  windSpeedKmH?: number;
  forecastDays: DailyForecast[]; // 5 days
  lastUpdated: string;
  isFallback?: boolean;
}

export type TempUnit = 'F' | 'C';
