import { useEffect } from "react";

const fallbackLight = {
  "--tg-bg": "#f6f7f9",
  "--tg-surface": "#ffffff",
  "--tg-text": "#111827",
  "--tg-hint": "#6b7280",
  "--tg-button": "#2f80ed",
  "--tg-button-text": "#ffffff",
  "--tg-border": "#e5e7eb"
};

const fallbackDark = {
  "--tg-bg": "#111827",
  "--tg-surface": "#1f2937",
  "--tg-text": "#f9fafb",
  "--tg-hint": "#9ca3af",
  "--tg-button": "#60a5fa",
  "--tg-button-text": "#0b1120",
  "--tg-border": "#374151"
};

export function useTelegramTheme() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const root = document.documentElement;
    const fallback = webApp?.colorScheme === "dark" ? fallbackDark : fallbackLight;
    const theme = webApp?.themeParams ?? {};

    const tokens = {
      "--tg-bg": theme.bg_color ?? fallback["--tg-bg"],
      "--tg-surface": theme.secondary_bg_color ?? fallback["--tg-surface"],
      "--tg-text": theme.text_color ?? fallback["--tg-text"],
      "--tg-hint": theme.hint_color ?? fallback["--tg-hint"],
      "--tg-button": theme.button_color ?? fallback["--tg-button"],
      "--tg-button-text": theme.button_text_color ?? fallback["--tg-button-text"],
      "--tg-border": fallback["--tg-border"]
    };

    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
  }, []);
}
