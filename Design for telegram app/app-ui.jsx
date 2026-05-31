// ── Icons (simple line set, currentColor) ───────────────────────────────
const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  map: 'M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Zm0 0v14m6-12v14',
  cart: 'M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L21 7H6M9 20a1 1 0 1 0 .01 0M18 20a1 1 0 1 0 .01 0',
  users: 'M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19m13.5-5a3.5 3.5 0 0 1 3.5 3.5V19M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.5-.5a2.5 2.5 0 1 0-1.8-4.3',
  user: 'M19 20v-1.5A4.5 4.5 0 0 0 14.5 14h-5A4.5 4.5 0 0 0 5 18.5V20M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  plus: 'M12 5v14M5 12h14',
  check: 'M4 12.5 9 17.5 20 6.5',
  chevronR: 'M9 5l7 7-7 7',
  chevronL: 'M15 5l-7 7 7 7',
  chevronD: 'M5 9l7 7 7-7',
  route: 'M6.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm11-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0v4.5a3.5 3.5 0 0 1-3.5 3.5H10',
  heart: 'M12 20S4 15 4 9.5A3.5 3.5 0 0 1 10.5 7L12 8.5 13.5 7A3.5 3.5 0 0 1 20 9.5C20 15 12 20 12 20Z',
  filter: 'M4 6h16M7 12h10M10 18h4',
  x: 'M6 6l12 12M18 6 6 18',
  edit: 'M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17v3ZM14 7l3 3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2',
  warn: 'M12 3 2 20h20L12 3Zm0 6v5m0 3.5v.01',
  wallet: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h13A1.5 1.5 0 0 1 19 7.5V9h1.5A1.5 1.5 0 0 1 22 10.5v6A1.5 1.5 0 0 1 20.5 18H4.5A1.5 1.5 0 0 1 3 16.5v-9Zm14 4.5a1 1 0 1 0 .01 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  bell: 'M6 16V10a6 6 0 1 1 12 0v6l2 2H4l2-2Zm4 4a2 2 0 0 0 4 0',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-13.8-1.4 1.4m-10 10-1.4 1.4',
  moon: 'M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2l-.4-2.5H9.3l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4.4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9v4m0-7.5v.01',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  arrowUR: 'M7 17 17 7M9 7h8v8',
  copy: 'M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1',
  lock: 'M6 10V8a6 6 0 1 1 12 0v2m-13 0h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
  trash: 'M5 7h14M9 7V5h6v2m-7 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M10 11v5m4-5v5',
  flag: 'M5 21V4m0 0 7-1 7 2-2 5 2 5-7-2-7 1',
  star: 'M12 4l2.3 4.8 5.2.7-3.8 3.6 1 5.2L12 15.9 7.3 18.3l1-5.2L4.5 9.5l5.2-.7L12 4Z',
  pin: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  // amenity glyphs
  kitchen: 'M7 3v6m3-6v6m-3 0a3 3 0 0 0 6 0V3M9 9v12M17 3c-2 0-3 2-3 5s1 4 3 4v9',
  grill: 'M5 8h14l-1.5 6a4 4 0 0 1-3.8 3h-3.4a4 4 0 0 1-3.8-3L5 8Zm4 9-1 4m6-4 1 4M9 5v.01M12 4v.01M15 5v.01',
  music: 'M9 18V6l11-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm11-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  beds: 'M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M7 9V7a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2',
  parking: 'M5 4h14v16H5V4Zm4 13V7h4a3 3 0 0 1 0 6H9',
  dishes: 'M5 3v8a2 2 0 0 0 2 2v8M5 7h2M19 3a3 3 0 0 0-3 3v5h3V3Zm0 8v10',
  pool: 'M3 16c1.5 0 1.5 1.5 3 1.5S10.5 16 12 16s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5M3 20c1.5 0 1.5 1.5 3 1.5S10.5 20 12 20M8 14V6a2 2 0 0 1 4 0v8',
  lounge: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3m-16 0a2 2 0 0 0-1 1.7V17h18v-4.3a2 2 0 0 0-1-1.7m-16 0h16M6 19v-2m12 2v-2',
  noise: 'M3 9v6h4l5 4V5L7 9H3Zm14-1 3 4-3 4',
  deposit: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v8m-2.5-5.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4',
};

function Icon({ name, size = 22, stroke = 1.8, style, color, ...rest }) {
  const d = ICONS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ display: 'block', flexShrink: 0, color, ...style }} {...rest}>
      <path d={d} stroke="currentColor" strokeWidth={stroke}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────
function Btn({ children, variant = 'primary', icon, onClick, full, size = 'md', disabled, style }) {
  const cls = `btn btn-${variant} btn-${size}${full ? ' btn-full' : ''}${disabled ? ' btn-disabled' : ''}`;
  return (
    <button className={cls} onClick={disabled ? undefined : onClick} style={style}>
      {icon && <Icon name={icon} size={size === 'sm' ? 17 : 19} stroke={2} />}
      {children && <span>{children}</span>}
    </button>
  );
}

// ── Status badge (color + text always together) ─────────────────────────
function Badge({ color = 'gray', children, dot = true, soft = true }) {
  return (
    <span className={'badge' + (soft ? ' badge-soft' : ' badge-solid')}
      style={{ '--c': `var(--st-${color})`, '--cbg': `var(--st-${color}-bg)` }}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

// ── Budget progress ─────────────────────────────────────────────────────
function BudgetProgress({ collected, planned, approved, t }) {
  const pc = Math.min(100, Math.round((collected / planned) * 100));
  const pa = Math.min(100, Math.round((approved / planned) * 100));
  const rem = Math.max(0, planned - collected);
  return (
    <div className="budget">
      <div className="budget-track">
        <div className="budget-fill-approved" style={{ width: pa + '%' }} />
        <div className="budget-fill" style={{ width: pc + '%' }} />
      </div>
      <div className="budget-stats">
        <div><span className="budget-num">{moneyShort(collected)}</span><span className="budget-lbl">{t('collected')}</span></div>
        <div><span className="budget-num">{moneyShort(planned)}</span><span className="budget-lbl">{t('plan')}</span></div>
        <div><span className="budget-num" style={{ color: 'var(--st-amber)' }}>{moneyShort(rem)}</span><span className="budget-lbl">{t('remaining')}</span></div>
      </div>
    </div>
  );
}

// ── Chips ───────────────────────────────────────────────────────────────
function Chip({ children, active, onClick, color, icon }) {
  return (
    <button className={'chip' + (active ? ' chip-active' : '')} onClick={onClick}
      style={color ? { '--c': `var(--st-${color})` } : undefined}>
      {color && <span className="chip-dot" />}
      {icon && <Icon name={icon} size={15} stroke={2} />}
      {children}
    </button>
  );
}

// ── Top bar (Telegram mini-app header) ──────────────────────────────────
function TopBar({ title, subtitle, onBack, right, large }) {
  return (
    <div className={'topbar' + (large ? ' topbar-large' : '')}>
      <div className="topbar-row">
        {onBack ? (
          <button className="topbar-btn" onClick={onBack} aria-label="back">
            <Icon name="chevronL" size={24} stroke={2.2} />
          </button>
        ) : <div className="topbar-spacer" />}
        {!large && (
          <div className="topbar-title-wrap">
            <div className="topbar-title">{title}</div>
            {subtitle && <div className="topbar-sub">{subtitle}</div>}
          </div>
        )}
        <div className="topbar-right">{right || <div className="topbar-spacer" />}</div>
      </div>
      {large && (
        <div className="topbar-large-title">
          <div className="topbar-title-lg">{title}</div>
          {subtitle && <div className="topbar-sub-lg">{subtitle}</div>}
        </div>
      )}
    </div>
  );
}

// ── Bottom navigation ───────────────────────────────────────────────────
function BottomNav({ tab, onTab, t, isOrg }) {
  const items = [
    { key: 'home', icon: 'home', label: t('nav_home') },
    { key: 'places', icon: 'map', label: t('nav_places') },
    { key: 'collections', icon: 'cart', label: t('nav_collections') },
    { key: 'participants', icon: 'users', label: t('nav_participants') },
    { key: 'profile', icon: 'user', label: t('nav_profile') },
  ];
  return (
    <div className="bottomnav">
      {items.map(it => (
        <button key={it.key} className={'navitem' + (tab === it.key ? ' navitem-active' : '')}
          onClick={() => onTab(it.key)}>
          <Icon name={it.icon} size={24} stroke={tab === it.key ? 2.1 : 1.8} />
          <span>{it.label}</span>
          {it.key === 'participants' && isOrg && <span className="nav-org-dot" />}
        </button>
      ))}
    </div>
  );
}

// ── Bottom sheet ────────────────────────────────────────────────────────
function Sheet({ open, onClose, children, height }) {
  if (!open) return null;
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" style={height ? { maxHeight: height } : undefined}
        onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  );
}

// ── Modal (confirmation) ────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions, danger }) {
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {danger && <div className="modal-danger-ic"><Icon name="warn" size={26} stroke={2} /></div>}
        {title && <div className="modal-title">{title}</div>}
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

// ── Toast host ──────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id}>
      <Icon name={toast.icon || 'check'} size={18} stroke={2.4} />
      <span>{toast.text}</span>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', r = 8, style }) {
  return <div className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

// ── Empty / Error states ────────────────────────────────────────────────
function StateView({ icon, title, sub, action }) {
  return (
    <div className="state">
      <div className="state-ic"><Icon name={icon} size={34} stroke={1.6} /></div>
      <div className="state-title">{title}</div>
      {sub && <div className="state-sub">{sub}</div>}
      {action && <div className="state-action">{action}</div>}
    </div>
  );
}

// ── Form field ──────────────────────────────────────────────────────────
function Field({ label, hint, error, children, optional }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}{optional && <span className="field-opt"> · {optional}</span>}</label>}
      {children}
      {error ? <div className="field-error"><Icon name="warn" size={13} stroke={2} />{error}</div>
        : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}
function Input({ value, onChange, placeholder, type = 'text', prefix, suffix, error, onFocus, inputMode }) {
  return (
    <div className={'input-wrap' + (error ? ' input-error' : '')}>
      {prefix && <span className="input-affix">{prefix}</span>}
      <input className="input" value={value} placeholder={placeholder} type={type} inputMode={inputMode}
        onChange={e => onChange(e.target.value)} onFocus={onFocus} />
      {suffix && <span className="input-affix input-suffix">{suffix}</span>}
    </div>
  );
}
function Stepper({ value, onChange, min = 1 }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))}><Icon name="x" size={2} stroke={2} style={{ display: 'none' }} />−</button>
      <span>{value}</span>
      <button onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────
function Avatar({ name, size = 38, color }) {
  const initials = name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const hues = [256, 200, 150, 30, 330, 280];
  const h = hues[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % hues.length];
  return (
    <div className="avatar" style={{
      width: size, height: size, fontSize: size * 0.38,
      background: color || `oklch(0.62 0.13 ${h})`,
    }}>{initials}</div>
  );
}

// ── Section card wrapper ────────────────────────────────────────────────
function Card({ children, pad = true, style, onClick, className = '' }) {
  return (
    <div className={'card' + (pad ? ' card-pad' : '') + (onClick ? ' card-tap' : '') + (className ? ' ' + className : '')}
      style={style} onClick={onClick}>{children}</div>
  );
}
function SectionLabel({ children, action }) {
  return (
    <div className="section-label">
      <span>{children}</span>
      {action}
    </div>
  );
}

Object.assign(window, {
  Icon, Btn, Badge, BudgetProgress, Chip, TopBar, BottomNav, Sheet, Modal,
  Toast, Skeleton, StateView, Field, Input, Stepper, Avatar, Card, SectionLabel,
});
