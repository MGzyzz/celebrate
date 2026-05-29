// ── Onboarding ───────────────────────────────────────────────────────────
function Onboarding({ ctx }) {
  const { t } = ctx;
  const [i, setI] = React.useState(0);
  const slides = [
    { ic: 'star', t: t('ob1_t'), s: t('ob1_s'), c: 'var(--accent)' },
    { ic: 'pin', t: t('ob2_t'), s: t('ob2_s'), c: 'var(--st-green)' },
    { ic: 'wallet', t: t('ob3_t'), s: t('ob3_s'), c: 'var(--st-amber)' },
  ];
  const s = slides[i];
  const last = i === slides.length - 1;
  return (
    <div className="ob">
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 56 }}>
        {!last && <button className="btn btn-ghost btn-sm" onClick={ctx.finishOnboarding}>{t('skip')}</button>}
      </div>
      <div className="ob-art">
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 40,
            background: `color-mix(in srgb, ${s.c} 14%, transparent)`,
          }} />
          <div style={{
            position: 'absolute', inset: 36, borderRadius: 30, background: s.c,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
          }}>
            <Icon name={s.ic} size={64} stroke={1.6} />
          </div>
        </div>
      </div>
      <div>
        <div className="ob-title">{s.t}</div>
        <div className="ob-sub">{s.s}</div>
        <div className="ob-dots">
          {slides.map((_, k) => <div key={k} className={'ob-dot' + (k === i ? ' on' : '')} />)}
        </div>
        <Btn full onClick={() => last ? ctx.finishOnboarding() : setI(i + 1)}>
          {last ? t('get_started') : t('next')}
        </Btn>
      </div>
    </div>
  );
}

// ── Participation status block (reused) ───────────────────────────────────
function PartStatusRow({ status, t }) {
  const map = { in: 'part_in', out: 'part_out', maybe: 'part_maybe', none: 'part_none' };
  return <Badge color={PART_COLOR[status]}>{t(map[status])}</Badge>;
}

// ── Home ───────────────────────────────────────────────────────────────────
function HomeScreen({ ctx }) {
  const { t, data } = ctx;
  const ev = data.event;
  const col = data.collections[0];
  const top = [...data.places].sort((a, b) => b.votes - a.votes)[0];
  const daysToDeadline = ctx.daysLeft(col.deadline);
  const inCount = data.participants.filter(p => p.participation === 'in').length;

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        {/* event hero */}
        <Card style={{
          background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #7c5cdb))',
          color: '#fff', padding: '18px 16px', border: 'none',
        }}>
          <div className="row-between">
            <div style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.85 }}>{ev.school}</div>
            <span className="pill-info" style={{ background: 'rgba(255,255,255,0.22)' }}>
              <Icon name="clock" size={14} stroke={2} />{ev.dateLabel}
            </span>
          </div>
          <div style={{ fontSize: 25, fontWeight: 780, letterSpacing: '-0.02em', marginTop: 8 }}>{ev.title}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            <div><div style={{ fontSize: 19, fontWeight: 750 }} className="num">{inCount}</div><div style={{ fontSize: 11.5, opacity: 0.85 }}>{t('f_in')}</div></div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.25)' }} />
            <div><div style={{ fontSize: 19, fontWeight: 750 }} className="num">{daysToDeadline}</div><div style={{ fontSize: 11.5, opacity: 0.85 }}>{t('days_left')}</div></div>
          </div>
        </Card>

        {/* your participation */}
        <Card onClick={() => ctx.nav.push('confirm')} className="card-tap">
          <div className="row-between">
            <div className="row" style={{ gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Icon name="check" size={22} stroke={2.2} />
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--hint)' }}>{t('your_status')}</div>
                <div style={{ marginTop: 3 }}><PartStatusRow status={ctx.participation} t={t} /></div>
              </div>
            </div>
            <Icon name="chevronR" size={20} className="lrow-chev" />
          </div>
        </Card>

        {/* active collection */}
        <SectionLabel>{t('active_collection')}</SectionLabel>
        <Card onClick={() => { ctx.nav.setTab('collections'); ctx.nav.push('collection', { id: col.id }); }} className="card-tap">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 15.5, fontWeight: 650, flex: 1 }}>{col.title}</div>
            <Badge color="green">{t('st_active')}</Badge>
          </div>
          <BudgetProgress collected={col.collected} planned={col.planned} approved={col.approved} t={t} />
          {daysToDeadline <= 14 && (
            <div className="notice notice-warn" style={{ marginTop: 12 }}>
              <Icon name="clock" size={16} stroke={2} className="notice-ic" />
              <span>{t('deadline')}: {ctx.fmtDate(col.deadline)} · {daysToDeadline} {t('days_left')}</span>
            </div>
          )}
        </Card>

        {/* top place */}
        <SectionLabel action={<button className="btn btn-ghost btn-sm" onClick={() => ctx.nav.setTab('places')}>{t('all')}</button>}>{t('top_place')}</SectionLabel>
        <Card pad={false} onClick={() => { ctx.nav.setTab('places'); ctx.nav.push('place', { id: top.id }); }} className="card-tap">
          <div style={{ display: 'flex', gap: 0 }}>
            <div className="ph" style={{ width: 96, height: 96, borderRadius: '16px 0 0 16px' }}>фото<br/>места</div>
            <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
              <div className="row-between">
                <div style={{ fontSize: 15.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top.name}</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--hint)', marginTop: 2 }}>{top.district}</div>
              <div className="row-between" style={{ marginTop: 10 }}>
                <Badge color={INTEREST_COLOR[top.interest]}>{t('int_high')}</Badge>
                <div className="row" style={{ gap: 4, color: 'var(--st-green)' }}>
                  <Icon name="heart" size={15} stroke={2} /><span style={{ fontSize: 13, fontWeight: 650 }} className="num">{top.votes}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* quick actions */}
        <SectionLabel>{t('quick_actions')}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <QuickAction icon="check" label={t('confirm_participation')} c="green" onClick={() => ctx.nav.push('confirm')} />
          <QuickAction icon="wallet" label={t('open_collection')} c="blue" onClick={() => { ctx.nav.setTab('collections'); ctx.nav.push('collection', { id: col.id }); }} />
          <QuickAction icon="map" label={t('open_map')} c="amber" onClick={() => ctx.nav.setTab('places')} />
          <QuickAction icon="plus" label={t('suggest_place')} c="accent" onClick={() => { ctx.nav.setTab('places'); ctx.nav.push('addplace'); }} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, c, onClick }) {
  const col = c === 'accent' ? 'var(--accent)' : `var(--st-${c})`;
  const bg = c === 'accent' ? 'color-mix(in srgb, var(--accent) 13%, transparent)' : `var(--st-${c}-bg)`;
  return (
    <button className="card card-tap" style={{ border: 'none', textAlign: 'left', padding: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }} onClick={onClick}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} stroke={2} />
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--text)' }}>{label}</span>
    </button>
  );
}

// ── Confirm participation ──────────────────────────────────────────────────
function ConfirmScreen({ ctx }) {
  const { t } = ctx;
  const [sel, setSel] = React.useState(ctx.participation);
  const opts = [
    { key: 'in', label: t('part_in'), c: 'green', desc: 'Получите счёт и все обновления' },
    { key: 'maybe', label: t('part_maybe'), c: 'amber', desc: 'Напомним ближе к дедлайну' },
    { key: 'out', label: t('part_out'), c: 'red', desc: 'Счёт не придёт' },
    { key: 'none', label: t('part_none'), c: 'gray', desc: 'Можно решить позже' },
  ];
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad gap12">
        <div className="notice notice-info">
          <Icon name="info" size={17} stroke={2} className="notice-ic" />
          <span>{t('invoices_only_in')}</span>
        </div>
        <div className="gap8">
          {opts.map(o => (
            <button key={o.key} className="card" onClick={() => setSel(o.key)} style={{
              border: sel === o.key ? '2px solid var(--accent)' : '2px solid transparent',
              padding: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 13,
            }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: sel === o.key ? '7px solid var(--accent)' : '2px solid var(--sep-strong)', transition: 'all 0.1s' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--text)' }}>{o.label}</div>
                <div style={{ fontSize: 13, color: 'var(--hint)', marginTop: 1 }}>{o.desc}</div>
              </div>
              <span className="badge-dot" style={{ background: `var(--st-${o.c})`, width: 10, height: 10 }} />
            </button>
          ))}
        </div>
      </div>
      <BottomAction>
        <Btn full onClick={() => { ctx.setParticipation(sel); ctx.toast(t('toast_status')); ctx.nav.pop(); }}>{t('confirm')}</Btn>
      </BottomAction>
    </div>
  );
}

// Sticky bottom action bar inside a scroll screen
function BottomAction({ children }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, padding: '12px 16px calc(14px + env(safe-area-inset-bottom))',
      background: 'color-mix(in srgb, var(--bg) 90%, transparent)', backdropFilter: 'blur(12px)',
      borderTop: '0.5px solid var(--sep)', display: 'flex', flexDirection: 'column', gap: 8,
    }}>{children}</div>
  );
}

Object.assign(window, { Onboarding, HomeScreen, ConfirmScreen, PartStatusRow, QuickAction, BottomAction });
