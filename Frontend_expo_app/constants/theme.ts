import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#18181b',
    background: '#f4f6fa',
    card: '#ffffff',
    primary: '#7c3aed',
    primaryForeground: '#ffffff',
    secondary: '#f1f5f9',
    secondaryForeground: '#0f172a',
    muted: '#71717a',
    mutedForeground: '#a1a1aa',
    accent: '#06b6d4',
    success: '#10b981',
    destructive: '#ef4444',
    border: '#cbd5e1',
    tint: '#7c3aed',
    icon: '#71717a',
    tabIconDefault: '#71717a',
    tabIconSelected: '#7c3aed',
  },
  dark: {
    text: '#ebedf5',
    background: '#0f111a',
    card: '#161925',
    primary: '#a855f7',
    primaryForeground: '#0f111a',
    secondary: '#1e2230',
    secondaryForeground: '#ebedf5',
    muted: '#606475',
    mutedForeground: '#a1a5b8',
    accent: '#22d5e6',
    success: '#34d399',
    destructive: '#f87171',
    border: '#1e2230',
    tint: '#a855f7',
    icon: '#606475',
    tabIconDefault: '#606475',
    tabIconSelected: '#a855f7',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
