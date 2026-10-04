import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  CloudFog,
  Wind,
} from 'lucide-react';
import { WeatherIconType } from '../../types/weather';

interface WeatherIconProps {
  type: WeatherIconType;
  className?: string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ type, className = 'w-5 h-5' }) => {
  switch (type) {
    case 'sun':
      return <Sun className={`${className} text-amber-500 fill-amber-400/20`} />;
    case 'cloud-sun':
      return <CloudSun className={`${className} text-amber-500`} />;
    case 'cloud':
      return <Cloud className={`${className} text-slate-400 dark:text-slate-300 fill-slate-300/20`} />;
    case 'cloud-rain':
      return <CloudRain className={`${className} text-blue-500`} />;
    case 'cloud-drizzle':
      return <CloudDrizzle className={`${className} text-sky-400`} />;
    case 'cloud-lightning':
      return <CloudLightning className={`${className} text-purple-600 dark:text-purple-400 fill-purple-400/20`} />;
    case 'cloud-snow':
      return <Snowflake className={`${className} text-sky-300`} />;
    case 'cloud-fog':
      return <CloudFog className={`${className} text-slate-400`} />;
    case 'wind':
      return <Wind className={`${className} text-teal-500`} />;
    default:
      return <Sun className={`${className} text-amber-500`} />;
  }
};
