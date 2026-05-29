/// <reference types="vite/client" />

interface TelegramWebApp {
  initData: string;
  colorScheme: "light" | "dark";
  themeParams: Record<string, string | undefined>;
  ready: () => void;
  expand: () => void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}

declare const __APP_VERSION__: string;
