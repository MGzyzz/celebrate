import { StatusBadge } from "../components/StatusBadge";

const participants = [
  { name: "Алина", status: "Участвует", payment: "Обычная доля", paid: "Не оплатил" },
  { name: "Данияр", status: "Участвует", payment: "Без алкоголя", paid: "Оплатил" },
  { name: "Илья", status: "Думает", payment: "Не задано", paid: "Нет счета" }
];

export function ParticipantsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Организатор</span>
        <h1>Участники</h1>
        <p>Счета отправляются только тем, кто подтвердил участие.</p>
      </header>

      <section className="panel">
        <div className="segmented">
          <button className="segmented__item segmented__item--active">Все</button>
          <button className="segmented__item">Участвуют</button>
          <button className="segmented__item">Не оплатили</button>
        </div>
        <div className="list">
          {participants.map((participant) => (
            <article className="list-row" key={participant.name}>
              <div>
                <strong>{participant.name}</strong>
                <p className="muted">{participant.payment}</p>
              </div>
              <div className="right-stack">
                <StatusBadge tone={participant.status === "Участвует" ? "green" : "yellow"}>
                  {participant.status}
                </StatusBadge>
                <span className="muted">{participant.paid}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
