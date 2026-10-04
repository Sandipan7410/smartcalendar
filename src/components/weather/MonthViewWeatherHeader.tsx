import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Droplets,
  Wind,
  CalendarPlus,
  Search,
  Check,
  Navigation,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { WeatherIcon } from './WeatherIcon';
import {
  WeatherForecastData,
  DailyForecast,
  CityLocation,
  TempUnit,
} from '../../types/weather';
import {
  fetch5DayForecast,
  PRESET_CITIES,
  DEFAULT_CITY,
  getSavedCity,
  saveCity,
  getSavedTempUnit,
  saveTempUnit,
  searchCities,
  generateFallbackForecast,
} from '../../services/weatherService';
import { useCalendar } from '../../context/CalendarContext';

interface MonthViewWeatherHeaderProps {
  onForecastChange?: (forecast: DailyForecast[]) => void;
}

export const MonthViewWeatherHeader: React.FC<MonthViewWeatherHeaderProps> = ({
  onForecastChange,
}) => {
  const { openCreateEventModal, setSelectedDate, showToast } = useCalendar();

  const [weatherData, setWeatherData] = useState<WeatherForecastData | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityLocation>(getSavedCity());
  const [tempUnit, setTempUnit] = useState<TempUnit>(getSavedTempUnit());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('smart_calendar_weather_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Location Selector Modal / Dropdown
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityLocation[]>(PRESET_CITIES.slice(0, 8));
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DailyForecast | null>(null);

  // Load weather when selectedCity changes
  const loadWeather = async (city: CityLocation, showRefreshAnimation = false) => {
    if (showRefreshAnimation) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await fetch5DayForecast(city);
      setWeatherData(data);
      if (onForecastChange && data.forecastDays) {
        onForecastChange(data.forecastDays);
      }
    } catch (err) {
      console.error('Failed to load weather forecast', err);
      const fallback = generateFallbackForecast(city);
      setWeatherData(fallback);
      if (onForecastChange) {
        onForecastChange(fallback.forecastDays);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeather(selectedCity);
  }, [selectedCity]);

  // Debounced search for cities
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(PRESET_CITIES.slice(0, 8));
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchCities(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCity = (city: CityLocation) => {
    setSelectedCity(city);
    saveCity(city);
    setIsLocationModalOpen(false);
    setSearchQuery('');
    showToast('Weather Location Updated', `Showing 5-day forecast for ${city.name}`, 'info');
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation Unavailable', 'Location services are not supported by your browser', 'warning');
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLoc: CityLocation = {
          id: `geo_${pos.coords.latitude.toFixed(2)}_${pos.coords.longitude.toFixed(2)}`,
          name: 'My Current Location',
          country: 'Local',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        handleSelectCity(userLoc);
        setIsSearching(false);
      },
      (err) => {
        console.warn('Geolocation denied or failed', err);
        setIsSearching(false);
        showToast('Location Access Denied', 'Please select a city manually from the list', 'warning');
      },
      { timeout: 8000 }
    );
  };

  const toggleTempUnit = () => {
    const newUnit = tempUnit === 'F' ? 'C' : 'F';
    setTempUnit(newUnit);
    saveTempUnit(newUnit);
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('smart_calendar_weather_collapsed', String(next));
    } catch {
      // ignore
    }
  };

  // Helper to get formatted temp based on unit
  const formatTemp = (fVal: number, cVal: number) => {
    return tempUnit === 'F' ? `${fVal}°F` : `${cVal}°C`;
  };

  // Action: Plan event based on specific forecast day
  const handlePlanEventOnWeatherDay = (day: DailyForecast, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isRainy = day.precipitationProb >= 40 || day.iconType === 'cloud-rain' || day.iconType === 'cloud-lightning';
    const isCold = day.maxTempF < 45;
    const isSunny = day.iconType === 'sun' || day.iconType === 'cloud-sun';

    let suggestedTitle = 'Team Activity';
    let suggestedLocation = 'Outdoor Terrace / Park';

    if (isRainy) {
      suggestedTitle = 'Indoor Strategy Meeting';
      suggestedLocation = 'Conference Room A (Indoor)';
    } else if (isCold) {
      suggestedTitle = 'Cozy Coffee Catch-up';
      suggestedLocation = 'Café / Lounge';
    } else if (isSunny) {
      suggestedTitle = 'Outdoor Team Lunch & Walk';
      suggestedLocation = 'City Park / Outdoor Garden';
    }

    const tempStr = `High ${formatTemp(day.maxTempF, day.maxTempC)} / Low ${formatTemp(day.minTempF, day.minTempC)}`;
    const weatherSummaryNote = `🌤️ Weather Plan for ${day.shortDate} (${day.dayName}):\n• Condition: ${day.condition} (${tempStr})\n• Rain Probability: ${day.precipitationProb}%\n• Recommendation: ${day.suitability.description}`;

    // Select date and open create modal
    const dateObj = new Date(day.date + 'T10:00:00');
    setSelectedDate(dateObj);

    openCreateEventModal({
      title: suggestedTitle,
      startDate: day.date,
      endDate: day.date,
      startTime: '12:00',
      endTime: '13:00',
      location: suggestedLocation,
      description: weatherSummaryNote,
    });

    showToast('Plan Event on ' + day.shortDate, `Weather details pre-filled based on ${day.condition}`, 'success');
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-linear-to-b from-blue-50/50 via-white to-white dark:from-slate-900/90 dark:via-gray-900 dark:to-gray-900 transition-all">
      {/* Top Bar */}
      <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {/* Weather Icon Badge */}
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
            {weatherData?.currentIconType ? (
              <WeatherIcon type={weatherData.currentIconType} className="w-4 h-4" />
            ) : (
              <Droplets className="w-4 h-4 text-blue-500" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-100">
              <span>5-Day Weather Forecast</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                Plan Outdoor & Indoor Events
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls: Location, Temp Unit Toggle, Refresh, Collapse */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Location button */}
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 text-xs font-medium shadow-2xs transition-colors"
            title="Change weather location"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="max-w-[110px] sm:max-w-[140px] truncate">
              {selectedCity.name}
              {selectedCity.region ? `, ${selectedCity.region}` : ''}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {/* Unit Switcher */}
          <button
            type="button"
            onClick={toggleTempUnit}
            className="flex items-center px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-xs shadow-2xs transition-colors"
            title={`Switch to °${tempUnit === 'F' ? 'C' : 'F'}`}
          >
            <span className={tempUnit === 'F' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}>°F</span>
            <span className="mx-0.5 text-gray-300 dark:text-gray-600">/</span>
            <span className={tempUnit === 'C' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}>°C</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => loadWeather(selectedCity, true)}
            disabled={isRefreshing || isLoading}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-2xs transition-colors disabled:opacity-50"
            title="Refresh weather data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Collapse/Expand toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-2xs transition-colors"
            title={isCollapsed ? 'Expand 5-day forecast cards' : 'Collapse 5-day forecast'}
          >
            {isCollapsed ? (
              <>
                <span className="text-[11px] font-medium hidden sm:inline">Show Forecast</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium hidden sm:inline">Hide</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Compact Glance */}
      {isCollapsed && weatherData && weatherData.forecastDays.length > 0 && (
        <div className="px-3 sm:px-4 py-1.5 bg-gray-50/70 dark:bg-gray-900/60 flex items-center justify-between gap-3 text-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
              5-Day Outlook:
            </span>
            <div className="flex items-center gap-2">
              {weatherData.forecastDays.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => handlePlanEventOnWeatherDay(d)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer group"
                  title={`${d.dayName} (${d.shortDate}): ${d.condition}, High ${formatTemp(d.maxTempF, d.maxTempC)}. Click to plan event.`}
                >
                  <span className="font-semibold text-[11px] text-gray-600 dark:text-gray-400">
                    {d.dayName === 'Today' ? 'Today' : d.dayName.slice(0, 3)}:
                  </span>
                  <WeatherIcon type={d.iconType} className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">
                    {tempUnit === 'F' ? `${d.maxTempF}°` : `${d.maxTempC}°`}
                  </span>
                  {d.precipitationProb >= 30 && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">
                      {d.precipitationProb}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleCollapse}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium flex-shrink-0"
          >
            View details & event suggestions →
          </button>
        </div>
      )}

      {/* Expanded 5-Day Forecast Grid */}
      {!isCollapsed && (
        <div className="px-3 sm:px-4 pb-3 pt-1">
          {isLoading && !weatherData ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 py-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse flex flex-col justify-center items-center gap-2 p-3"
                >
                  <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : weatherData && weatherData.forecastDays ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
              {weatherData.forecastDays.map((day) => {
                const isToday = day.dayName === 'Today';

                return (
                  <div
                    key={day.date}
                    onClick={() => setSelectedDayDetail(day)}
                    className={`group relative p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isToday
                        ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 shadow-xs'
                        : 'bg-white dark:bg-gray-800/90 border-gray-200 dark:border-gray-700/80 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs'
                    }`}
                  >
                    {/* Top line: Day and Date */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold text-xs tracking-tight ${
                            isToday
                              ? 'text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {day.dayName}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                          {day.shortDate}
                        </span>
                      </div>

                      {/* Weather Icon and Main Condition */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:scale-110 transition-transform">
                          <WeatherIcon type={day.iconType} className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {formatTemp(day.maxTempF, day.maxTempC)}
                            <span className="ml-1 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                              / {formatTemp(day.minTempF, day.minTempC)}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate" title={day.condition}>
                            {day.condition}
                          </div>
                        </div>
                      </div>

                      {/* Rain Probability / Wind */}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span
                          className={`flex items-center gap-1 ${
                            day.precipitationProb >= 35 ? 'text-blue-600 dark:text-blue-400 font-medium' : ''
                          }`}
                          title={`Precipitation probability: ${day.precipitationProb}%`}
                        >
                          <Droplets className="w-3 h-3" />
                          <span>{day.precipitationProb}%</span>
                        </span>

                        <span className="flex items-center gap-1 text-[10px]" title={`Max wind speed: ${day.windSpeedKmH} km/h`}>
                          <Wind className="w-3 h-3 text-gray-400" />
                          <span>{day.windSpeedKmH} km/h</span>
                        </span>
                      </div>

                      {/* Event Suitability Badge */}
                      <div className="mt-2">
                        <span
                          className={`inline-block w-full text-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border truncate ${day.suitability.badgeBg} ${day.suitability.badgeText}`}
                          title={day.suitability.description}
                        >
                          {day.suitability.label}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action: Plan Event */}
                    <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                      <button
                        type="button"
                        onClick={(e) => handlePlanEventOnWeatherDay(day, e)}
                        className="w-full flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-[11px] font-semibold transition-all shadow-2xs group/btn cursor-pointer"
                        title={`Plan an event on ${day.shortDate} matching these weather conditions`}
                      >
                        <CalendarPlus className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                        <span>Plan Event</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-gray-500">
              Weather information currently unavailable.
            </div>
          )}
        </div>
      )}

      {/* Location Picker Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-base text-gray-900 dark:text-white">
                  Select Weather Forecast Location
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current GPS button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isSearching}
              className="w-full py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-xs flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
            >
              <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Use My Device's Current Geolocation</span>
            </button>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city by name (e.g., Paris, Chicago, Seattle)..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                </div>
              )}
            </div>

            {/* City Options List */}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                {searchQuery ? 'Search Results' : 'Popular Cities'}
              </p>
              {searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  No cities found for &quot;{searchQuery}&quot;. Try another query.
                </div>
              ) : (
                searchResults.map((city) => {
                  const isSelected = selectedCity.name === city.name && selectedCity.country === city.country;
                  return (
                    <button
                      key={city.id || `${city.latitude}_${city.longitude}`}
                      type="button"
                      onClick={() => handleSelectCity(city)}
                      className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{city.name}</span>
                          <span className="ml-1 text-[11px] text-gray-500 dark:text-gray-400">
                            {city.region ? `${city.region}, ` : ''}
                            {city.country}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail & Event Planning Advice Modal (when clicking card) */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <WeatherIcon type={selectedDayDetail.iconType} className="w-5 h-5" />
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Weather & Event Advice: {selectedDayDetail.dayName} ({selectedDayDetail.shortDate})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Condition:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedDayDetail.condition}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Temperature:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    High {formatTemp(selectedDayDetail.maxTempF, selectedDayDetail.maxTempC)} / Low {formatTemp(selectedDayDetail.minTempF, selectedDayDetail.minTempC)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Rain Probability:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {selectedDayDetail.precipitationProb}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Max Wind Speed:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedDayDetail.windSpeedKmH} km/h</span>
                </div>
              </div>

              {/* Event Suitability Guidance */}
              <div className={`p-3 rounded-xl border ${selectedDayDetail.suitability.badgeBg} space-y-1`}>
                <div className={`font-semibold flex items-center gap-1.5 ${selectedDayDetail.suitability.badgeText}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{selectedDayDetail.suitability.label}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[11px]">
                  {selectedDayDetail.suitability.description}
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const day = selectedDayDetail;
                  setSelectedDayDetail(null);
                  handlePlanEventOnWeatherDay(day);
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Plan Event for This Day</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
