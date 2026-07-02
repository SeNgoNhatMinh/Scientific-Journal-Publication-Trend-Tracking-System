import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f8fafc',
    card: '#ffffff',
    primary: '#8b5cf6',
    primaryForeground: '#ffffff',
    secondary: '#f1f5f9',
    secondaryForeground: '#0f172a',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    accent: '#06b6d4',
    success: '#10b981',
    destructive: '#ef4444',
    border: '#e2e8f0',
    tint: '#8b5cf6',
    icon: '#64748b',
    tabIconDefault: '#64748b',
    tabIconSelected: '#8b5cf6',
  },
  dark: {
    text: '#f8fafc',
    background: '#0b0c10', // Deeper dark
    card: '#161923',      // Slightly elevated
    primary: '#a855f7',    // Neon purple
    primaryForeground: '#0b0c10',
    secondary: '#1e2230',
    secondaryForeground: '#f8fafc',
    muted: '#1e2230',
    mutedForeground: '#94a3b8',
    accent: '#22d5e6',     // Cyan
    success: '#34d399',
    destructive: '#f87171',
    border: '#1e2230',
    tint: '#a855f7',
    icon: '#606475',
    tabIconDefault: '#606475',
    tabIconSelected: '#a855f7',
  },
};

export const CategoryColors: Record<string, string> = {
  domain: '#3b82f6',
  algorithm: '#ef4444',
  application: '#22c55e',
  method: '#a855f7',
  dataset: '#f97316',
  tool: '#06b6d4',
  general: '#6b7280',
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
