type StatusBadgeProps = {
  tone: "green" | "yellow" | "red" | "blue" | "gray";
  children: string;
};

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
