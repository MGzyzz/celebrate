type BudgetProgressProps = {
  approved: number;
  target: number;
};

export function BudgetProgress({ approved, target }: BudgetProgressProps) {
  const percentage = target > 0 ? Math.min(Math.round((approved / target) * 100), 100) : 0;

  return (
    <section className="budget-progress">
      <div className="row-between">
        <span>Бюджет</span>
        <strong>{percentage}%</strong>
      </div>
      <div className="budget-progress__track">
        <div className="budget-progress__bar" style={{ width: `${percentage}%` }} />
      </div>
      <div className="row-between muted">
        <span>{approved.toLocaleString("ru-RU")} тг утверждено</span>
        <span>{target.toLocaleString("ru-RU")} тг план</span>
      </div>
    </section>
  );
}
