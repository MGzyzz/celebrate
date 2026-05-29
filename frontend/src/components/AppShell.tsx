import { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { CalendarDays, MapPinned, ReceiptText, UsersRound, UserRound } from "lucide-react";

const navItems = [
  { to: "/", label: "Главная", icon: CalendarDays },
  { to: "/places", label: "Места", icon: MapPinned },
  { to: "/fundraising", label: "Сборы", icon: ReceiptText },
  { to: "/participants", label: "Участники", icon: UsersRound },
  { to: "/profile", label: "Профиль", icon: UserRound }
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <main className="app-content">{children}</main>
      <nav className="bottom-nav" aria-label="Основная навигация">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className="bottom-nav__item">
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
