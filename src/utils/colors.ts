import { ColorOption } from '../types/calendar';

export const EVENT_COLORS: ColorOption[] = [
  { id: 'blue', name: 'Blueberry', bgHex: '#1a73e8', textHex: '#ffffff', ringHex: '#93c5fd' },
  { id: 'purple', name: 'Amethyst', bgHex: '#7c3aed', textHex: '#ffffff', ringHex: '#c4b5fd' },
  { id: 'lavender', name: 'Lavender', bgHex: '#8e24aa', textHex: '#ffffff', ringHex: '#d8b4fe' },
  { id: 'sage', name: 'Sage', bgHex: '#0b8043', textHex: '#ffffff', ringHex: '#86efac' },
  { id: 'peacock', name: 'Peacock', bgHex: '#0284c7', textHex: '#ffffff', ringHex: '#7dd3fc' },
  { id: 'flamingo', name: 'Flamingo', bgHex: '#e11d48', textHex: '#ffffff', ringHex: '#fda4af' },
  { id: 'banana', name: 'Banana', bgHex: '#d97706', textHex: '#ffffff', ringHex: '#fcd34d' },
  { id: 'graphite', name: 'Graphite', bgHex: '#4b5563', textHex: '#ffffff', ringHex: '#9ca3af' },
];

export function getColorByIdOrHex(colorVal: string): ColorOption {
  const match = EVENT_COLORS.find(
    (c) => c.id === colorVal || c.bgHex.toLowerCase() === colorVal.toLowerCase()
  );
  return match || EVENT_COLORS[0];
}
