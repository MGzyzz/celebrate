import { Plus } from "lucide-react";
import { BudgetProgress } from "../components/BudgetProgress";
import { StatusBadge } from "../components/StatusBadge";

const items = [
  { title: "Пицца", category: "Еда", amount: "36 000 тг", type: "Общее" },
  { title: "Кола", category: "Напитки", amount: "12 000 тг", type: "Общее" },
  { title: "Алкоголь", category: "Напитки", amount: "80 000 тг", type: "Только пьющие" }
];

export function FundraisingPage() {
  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Активный сбор</span>
        <h1>Продукты</h1>
        <p>После дедлайна сумма будет разделена по индивидуальным долям.</p>
      </header>

      <BudgetProgress approved={128000} target={260000} />

      <section className="panel">
        <div className="row-between">
          <h2>Товары</h2>
          <button className="round-button" aria-label="Добавить товар">
            <Plus size={20} />
          </button>
        </div>
        <div className="list">
          {items.map((item) => (
            <article className="list-row" key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <p className="muted">{item.category}</p>
              </div>
              <div className="right-stack">
                <span>{item.amount}</span>
                <StatusBadge tone={item.type === "Только пьющие" ? "yellow" : "gray"}>{item.type}</StatusBadge>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
