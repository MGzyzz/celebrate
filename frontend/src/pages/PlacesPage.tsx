import { MapPin, Navigation } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";

export function PlacesPage() {
  return (
    <div className="page page--map">
      <header className="page-header">
        <span className="eyebrow">Yandex Maps</span>
        <h1>Места</h1>
      </header>

      <section className="map-placeholder" aria-label="Карта мест">
        <MapPin size={36} />
        <span>Здесь будет карта Yandex Maps</span>
      </section>

      <section className="bottom-sheet">
        <div className="row-between">
          <div>
            <h2>Коттедж у озера</h2>
            <p className="muted">Алматы, 40 мест, от 180 000 тг</p>
          </div>
          <StatusBadge tone="green">Высокий интерес</StatusBadge>
        </div>
        <div className="chip-row">
          <span className="chip">Мангал</span>
          <span className="chip">Музыка</span>
          <span className="chip">Парковка</span>
        </div>
        <p>Есть кухня, зона отдыха, парковка и ограничение по шуму после 23:00.</p>
        <button className="primary-button icon-button">
          <Navigation size={18} />
          Открыть маршрут
        </button>
      </section>
    </div>
  );
}
