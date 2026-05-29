const PART_LABEL = { in: 'f_in', out: 'f_out', maybe: 'f_maybe', none: 'f_none', exempt: 'cat_exempt' };
const PAY_CATS = {
  regular: { k: 'cat_regular', c: 'blue' }, noalco: { k: 'cat_noalco', c: 'green' },
  individual: { k: 'cat_individual', c: 'amber' }, exempt: { k: 'cat_exempt', c: 'gray' },
};

// ── Participants (role-aware) ────────────────────────────────────────────────
function ParticipantsScreen({ ctx }) {
  const { t } = ctx;
  const isOrg = ctx.role === 'organizer';
  const [filter, setFilter] = React.useState('all');
  const ps = ctx.participants;

  const counts = {
    in: ps.filter(p => p.participation === 'in').length,
    out: ps.filter(p => p.participation === 'out' || p.participation === 'exempt').length,
    maybe: ps.filter(p => p.participation === 'maybe').length,
    none: ps.filter(p => p.participation === 'none').length,
  };

  const match = p => {
    if (filter === 'all') return true;
    if (filter === 'paid') return p.paid;
    if (filter === 'unpaid') return !p.paid && p.participation === 'in';
    return p.participation === filter;
  };
  const list = ps.filter(match);

  // ── Participant POV: simplified, no sensitive money ──
  if (!isOrg) {
    return (
      <div className="scroll screen-anim">
        <div className="screen-pad gap12">
          <div className="row" style={{ gap: 10 }}>
            <MiniStat n={counts.in} label={t('f_in')} c="green" />
            <MiniStat n={counts.maybe} label={t('f_maybe')} c="amber" />
            <MiniStat n={counts.none} label={t('f_none')} c="gray" />
          </div>
          <div className="notice notice-info">
            <Icon name="info" size={16} stroke={2} className="notice-ic" />
            <span>Суммы и счета видит только организатор</span>
          </div>
          <div className="listcard">
            {ps.map(p => (
              <div key={p.id} className="lrow lrow-static">
                <Avatar name={p.name} size={36} />
                <div className="lrow-main"><span className="lrow-title">{p.name}{p.id === 'u1' ? ' · вы' : ''}</span></div>
                <Badge color={PART_COLOR[p.participation]}>{t(PART_LABEL[p.participation])}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Organizer POV: full management ──
  const filters = ['all', 'in', 'maybe', 'none', 'out', 'paid', 'unpaid'];
  const fLabel = { all: t('all'), in: t('f_in'), maybe: t('f_maybe'), none: t('f_none'), out: t('f_out'), paid: t('f_paid'), unpaid: t('f_unpaid') };
  return (
    <div className="scroll screen-anim">
      <div style={{ padding: '4px 16px 0' }}>
        <div className="row" style={{ gap: 8 }}>
          <MiniStat n={counts.in} label={t('f_in')} c="green" />
          <MiniStat n={counts.maybe} label={t('f_maybe')} c="amber" />
          <MiniStat n={counts.none} label={t('f_none')} c="gray" />
          <MiniStat n={counts.out} label={t('f_out')} c="red" />
        </div>
      </div>
      <div className="chip-row" style={{ padding: '12px 16px' }}>
        {filters.map(f => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{fLabel[f]}</Chip>)}
      </div>
      <div className="screen-pad" style={{ paddingTop: 0 }}>
        <div className="listcard">
          {list.map(p => (
            <div key={p.id} className="lrow" onClick={() => ctx.nav.push('participant', { id: p.id })}>
              <Avatar name={p.name} size={40} />
              <div className="lrow-main">
                <span className="lrow-title">{p.name}</span>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  <Badge color={PART_COLOR[p.participation]}>{t(PART_LABEL[p.participation])}</Badge>
                  {p.participation === 'in' && <Badge color={p.paid ? 'green' : 'amber'} dot={false}>{p.paid ? t('paid') : t('not_paid')}</Badge>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {p.invoice > 0 && <div className="lrow-amt num">{money(p.invoice)}</div>}
                <Icon name="chevronR" size={18} className="lrow-chev" style={{ marginLeft: 'auto', marginTop: 2 }} />
              </div>
            </div>
          ))}
          {list.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--hint)', fontSize: 13.5 }}>Никого по этому фильтру</div>}
        </div>
      </div>
      <BottomAction>
        <Btn full icon="wallet" onClick={() => ctx.nav.push('finalize')}>{t('final_calc')}</Btn>
      </BottomAction>
    </div>
  );
}

function MiniStat({ n, label, c }) {
  return (
    <div className="card" style={{ flex: 1, padding: '10px 6px', textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 20, fontWeight: 780, color: `var(--st-${c})` }}>{n}</div>
      <div style={{ fontSize: 10.5, color: 'var(--hint)', marginTop: 1 }}>{label}</div>
    </div>
  );
}

// ── Participant detail (organizer) ───────────────────────────────────────────
function ParticipantScreen({ ctx, params }) {
  const { t } = ctx;
  const p = ctx.participants.find(x => x.id === params.id);
  if (!p) return null;
  const update = patch => ctx.setParticipants(list => list.map(x => x.id === p.id ? { ...x, ...patch } : x));

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        <Card style={{ textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Avatar name={p.name} size={64} /></div>
          <div style={{ fontSize: 19, fontWeight: 720 }}>{p.name}</div>
          <div style={{ marginTop: 8 }}><Badge color={PART_COLOR[p.participation]}>{t(PART_LABEL[p.participation])}</Badge></div>
        </Card>

        {/* payment category */}
        <SectionLabel>{t('payment_category')}</SectionLabel>
        <div className="gap8">
          {Object.entries(PAY_CATS).map(([k, v]) => (
            <button key={k} className="card" onClick={() => { update({ payCat: k }); ctx.toast(t('toast_saved')); }} style={{
              padding: '12px 14px', border: p.payCat === k ? '2px solid var(--accent)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', textAlign: 'left',
            }}>
              <span className="badge-dot" style={{ background: `var(--st-${v.c})`, width: 10, height: 10 }} />
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 550 }}>{t(v.k)}</span>
              {p.payCat === k && <Icon name="check" size={18} stroke={2.4} style={{ color: 'var(--accent)' }} />}
            </button>
          ))}
        </div>

        {/* invoice */}
        {p.participation === 'in' && (
          <>
            <SectionLabel>{t('invoice_sum')}</SectionLabel>
            <Card>
              <div className="row-between" style={{ marginBottom: 14 }}>
                <span className="muted">{t('invoice_total')}</span>
                <span className="num" style={{ fontSize: 22, fontWeight: 780 }}>{money(p.invoice)}</span>
              </div>
              <div className="row-between">
                <span className="row" style={{ gap: 8 }}>
                  <Badge color={p.paid ? 'green' : 'amber'}>{p.paid ? t('paid') : t('not_paid')}</Badge>
                </span>
                <Btn size="sm" variant={p.paid ? 'secondary' : 'tinted'} icon={p.paid ? 'x' : 'check'}
                  onClick={() => { update({ paid: !p.paid }); ctx.toast(p.paid ? t('not_paid') : t('toast_paid')); }}>
                  {p.paid ? 'Отменить' : t('mark_paid')}
                </Btn>
              </div>
            </Card>
            <div className="notice notice-info">
              <Icon name="info" size={16} stroke={2} className="notice-ic" />
              <span>{t('confirmed_by_org')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Finalize → send invoices ─────────────────────────────────────────────────
function FinalizeScreen({ ctx }) {
  const { t, data } = ctx;
  const ps = ctx.participants;
  const willReceive = ps.filter(p => p.participation === 'in');
  const wontReceive = ps.filter(p => p.participation === 'out' || p.participation === 'exempt');
  const noAnswer = ps.filter(p => p.participation === 'none' || p.participation === 'maybe');
  const total = willReceive.reduce((s, p) => s + p.invoice, 0);
  const planned = data.collections[0].planned;
  const remaining = planned - data.collections[0].approved;
  const [showConfirm, setShowConfirm] = React.useState(false);

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        <Card style={{ textAlign: 'center', padding: '18px 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--hint)' }}>{t('total_sum')}</div>
          <div className="num" style={{ fontSize: 32, fontWeight: 800, margin: '4px 0' }}>{money(total)}</div>
          <div className="muted" style={{ fontSize: 13 }}>{willReceive.length} {t('people')} × {t('invoice_sum').toLowerCase()}</div>
        </Card>

        <SectionLabel>{t('final_calc')}</SectionLabel>
        <div className="listcard">
          <CalcRow icon="check" c="green" label={t('will_receive')} value={willReceive.length + ' ' + t('people')} />
          <CalcRow icon="x" c="red" label={t('wont_receive')} value={wontReceive.length + ' ' + t('people')} />
          <CalcRow icon="clock" c="amber" label={t('no_answer')} value={noAnswer.length + ' ' + t('people')} />
        </div>

        <SectionLabel>{t('budget')}</SectionLabel>
        <div className="listcard">
          <div className="lrow lrow-static"><div className="lrow-main"><span className="lrow-title">{t('plan')}</span></div><span className="lrow-amt num">{money(planned)}</span></div>
          <div className="lrow lrow-static"><div className="lrow-main"><span className="lrow-title">{t('total_sum')}</span></div><span className="lrow-amt num" style={{ color: 'var(--st-green)' }}>{money(total)}</span></div>
          <div className="lrow lrow-static" style={{ background: 'var(--surface-2)' }}><div className="lrow-main"><span className="lrow-title" style={{ fontWeight: 700 }}>{t('remaining')}</span></div><span className="lrow-amt num" style={{ fontWeight: 800, color: remaining >= 0 ? 'var(--st-amber)' : 'var(--st-red)' }}>{money(remaining)}</span></div>
        </div>

        {noAnswer.length > 0 && (
          <div className="notice notice-warn">
            <Icon name="warn" size={16} stroke={2} className="notice-ic" />
            <span>{noAnswer.length} {t('people')} ещё не ответили — они не получат счёт</span>
          </div>
        )}
      </div>
      <BottomAction>
        <Btn full icon="send" onClick={() => setShowConfirm(true)}>{t('send_invoices')}</Btn>
      </BottomAction>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title={t('confirm_send')} danger>
        <div style={{ textAlign: 'left' }}>
          <div className="confirm-row"><span>{t('will_receive')}</span><b style={{ color: 'var(--st-green)' }}>{willReceive.length} {t('people')}</b></div>
          <div className="confirm-row"><span>{t('wont_receive')}</span><b>{wontReceive.length} {t('people')}</b></div>
          <div className="confirm-row"><span>{t('no_answer')}</span><b style={{ color: 'var(--st-amber)' }}>{noAnswer.length} {t('people')}</b></div>
          <div className="confirm-row" style={{ borderTop: '0.5px solid var(--sep)', marginTop: 6, paddingTop: 10 }}><span>{t('total_sum')}</span><b className="num">{money(total)}</b></div>
        </div>
        <style>{`.confirm-row{display:flex;justify-content:space-between;font-size:14px;padding:6px 0;}`}</style>
        <div style={{ marginTop: 4 }}>
          <Btn full icon="send" onClick={() => { setShowConfirm(false); ctx.toast(t('toast_sent'), 'send'); ctx.nav.pop(); }}>{t('confirm_send')}</Btn>
          <button className="btn btn-ghost btn-md btn-full" onClick={() => setShowConfirm(false)} style={{ marginTop: 4 }}>{t('cancel')}</button>
        </div>
      </Modal>
    </div>
  );
}

function CalcRow({ icon, c, label, value }) {
  return (
    <div className="lrow lrow-static">
      <span style={{ width: 30, height: 30, borderRadius: 8, background: `var(--st-${c}-bg)`, color: `var(--st-${c})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} stroke={2.2} />
      </span>
      <div className="lrow-main"><span className="lrow-title">{label}</span></div>
      <span className="lrow-amt">{value}</span>
    </div>
  );
}

Object.assign(window, { ParticipantsScreen, ParticipantScreen, FinalizeScreen, MiniStat, CalcRow, PAY_CATS, PART_LABEL });
