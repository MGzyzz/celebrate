import { PropsWithChildren } from "react";

function isTelegramMiniApp(): boolean {
  const webApp = window.Telegram?.WebApp;
  return Boolean(webApp?.initData);
}

export function TelegramOnlyGuard({ children }: PropsWithChildren) {
  if (isTelegramMiniApp()) {
    return children;
  }

  return (
    <main className="telegram-error-page">
      <section className="telegram-error-panel" aria-label="Ошибка доступа">
        <span className="telegram-error-code">403</span>
      </section>
    </main>
  );
}
