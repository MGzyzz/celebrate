import { BudgetProgress } from "../components/BudgetProgress";
import { StatusBadge } from "../components/StatusBadge";

export function EventHomePage() {
  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Выпускной</span>
        <h1>План мероприятия</h1>
        <p>Статус, ближайшие дедлайны и быстрые действия по подготовке.</p>
      </header>

      <section className="panel">
        <div className="row-between">
          <div>
            <h2>Участие</h2>
            <p className="muted">Счет придет только тем, кто участвует.</p>
          </div>
          <StatusBadge tone="yellow">Думаю</StatusBadge>
        </div>
        <div className="button-grid">
          <button className="primary-button">Участвую</button>
          <button className="secondary-button">Не участвую</button>
        </div>
      </section>

      <BudgetProgress approved={180000} target={260000} />

      <section className="panel">
        <div className="row-between">
          <h2>Ближайший дедлайн</h2>
          <StatusBadge tone="blue">12 дней</StatusBadge>
        </div>
        <p>Сбор на продукты закрывается после дедлайна, затем организатор отправит счета.</p>
      </section>
    </div>
  );
}
