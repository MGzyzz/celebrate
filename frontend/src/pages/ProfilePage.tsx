import { StatusBadge } from "../components/StatusBadge";

export function ProfilePage() {
  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Профиль</span>
        <h1>Настройки</h1>
      </header>

      <section className="panel">
        <div className="row-between">
          <div>
            <h2>Тема</h2>
            <p className="muted">По умолчанию используется тема Telegram.</p>
          </div>
          <StatusBadge tone="blue">Системная</StatusBadge>
        </div>
      </section>

      <section className="panel">
        <h2>Мой счет</h2>
        <p className="invoice-total">10 000 тг</p>
        <p className="muted">Суммы показываются только целыми числами.</p>
      </section>
    </div>
  );
}
