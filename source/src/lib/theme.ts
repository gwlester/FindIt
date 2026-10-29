import { useColorScheme } from 'react-native';

const light = {
  background: '#f6f7f9',
  surface: '#ffffff',
  text: '#15181d',
  muted: '#5d6673',
  border: '#d9dde3',
  accent: '#1f7a4d',
  accentText: '#ffffff',
  danger: '#c62828',
  north: '#d32f2f',
  roseFace: '#ffffff',
  roseRing: '#2a3038',
  mapFace: '#eef3ee',
  you: '#2f6db5',
};

const dark: typeof light = {
  background: '#0f1114',
  surface: '#1a1d22',
  text: '#eef0f3',
  muted: '#9aa3ae',
  border: '#30353d',
  accent: '#3fbf7f',
  accentText: '#0b1a12',
  danger: '#ef5350',
  north: '#ff5f57',
  roseFace: '#1a1d22',
  roseRing: '#c9ced6',
  mapFace: '#16231c',
  you: '#6aa8f0',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
