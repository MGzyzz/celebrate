const COL_STATUS = {
  draft: { k: 'st_draft', c: 'gray' }, active: { k: 'st_active', c: 'green' },
  locked: { k: 'st_locked', c: 'amber' }, done: { k: 'st_done', c: 'blue' }, cancelled: { k: 'st_cancelled', c: 'red' },
};
const ITEM_TYPE = {
  common: { k: 'type_common', c: 'blue' }, alcohol: { k: 'type_alcohol', c: 'red' },
  individual: { k: 'type_individual', c: 'amber' }, group: { k: 'type_group', c: 'gray' },
};
const CATS = ['food', 'drinks', 'decor', 'music', 'other'];

// ── Collections list ────────────────────────────────────────────────────────
function CollectionsScreen({ ctx }) {
  const { t, data } = ctx;
  const cols = data.collections;
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad gap12">
        {cols.length === 0 ? (
          <StateView icon="cart" title={t('empty_title')} sub={t('empty_collections')}
            action={<Btn full icon="plus">{t('create_collection')}</Btn>} />
        ) : cols.map(c => {
          const st = COL_STATUS[c.status];
          const days = ctx.daysLeft(c.deadline);
          return (
            <Card key={c.id} className="card-tap" onClick={() => ctx.nav.push('collection', { id: c.id })}>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 15.5, fontWeight: 650, flex: 1, paddingRight: 8 }}>{c.title}</div>
                <Badge color={st.c}>{t(st.k)}</Badge>
              </div>
              {c.planned > 0 && <BudgetProgress collected={c.collected} planned={c.planned} approved={c.approved} t={t} />}
              <div className="row-between" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--hint)' }}>
                <span className="row" style={{ gap: 5 }}><Icon name="clock" size={14} stroke={2} />{ctx.fmtDate(c.deadline)}</span>
                <span>{c.itemsApproved} {t('approved').toLowerCase()} · {c.itemsProposed} {t('proposed').toLowerCase()}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Collection detail ─────────────────────────────────────────────────────--
function CollectionScreen({ ctx, params }) {
  const { t, data } = ctx;
  const col = data.collections.find(c => c.id === params.id) || data.collections[0];
  const items = col.id === 'c1' ? data.items : [];
  const approved = items.filter(i => i.approved);
  const proposed = items.filter(i => !i.approved);
  const days = ctx.daysLeft(col.deadline);
  const st = COL_STATUS[col.status];
  const editable = col.status === 'active' || col.status === 'draft';

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        <div className="row-between">
          <Badge color={st.c}>{t(st.k)}</Badge>
          <span className="row" style={{ gap: 5, color: 'var(--hint)', fontSize: 13 }}>
            <Icon name="clock" size={15} stroke={2} />{days} {t('days_left')}
          </span>
        </div>

        {col.planned > 0 && (
          <Card>
            <BudgetProgress collected={col.collected} planned={col.planned} approved={col.approved} t={t} />
          </Card>
        )}

        {days <= 14 && editable && (
          <div className="notice notice-warn">
            <Icon name="warn" size={16} stroke={2} className="notice-ic" />
            <span>{t('deadline_soon')}</span>
          </div>
        )}

        {/* your invoice shortcut */}
        <Card className="card-tap" onClick={() => ctx.nav.push('invoice')} style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
          <div className="row-between">
            <div className="row" style={{ gap: 11 }}>
              <Icon name="wallet" size={22} stroke={2} />
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{t('invoice')}</div>
                <div className="num" style={{ fontSize: 18, fontWeight: 750 }}>{money(data.myInvoice.total)}</div>
              </div>
            </div>
            <Icon name="chevronR" size={20} style={{ opacity: 0.8 }} />
          </div>
        </Card>

        {/* approved items */}
        <SectionLabel>{t('approved')} · {approved.length}</SectionLabel>
        <div className="listcard">
          {approved.map(it => <ItemRow key={it.id} item={it} ctx={ctx} />)}
          {approved.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: 'var(--hint)', fontSize: 13.5 }}>Пока нет утверждённых позиций</div>}
        </div>

        {/* proposed items */}
        {proposed.length > 0 && (
          <>
            <SectionLabel>{t('proposed')} · {proposed.length}</SectionLabel>
            <div className="listcard">
              {proposed.map(it => <ItemRow key={it.id} item={it} ctx={ctx} proposed />)}
            </div>
          </>
        )}
      </div>

      {editable && (
        <BottomAction>
          <Btn full icon="plus" onClick={() => ctx.nav.push('additem', { col: col.id })}>{t('add_item')}</Btn>
        </BottomAction>
      )}
    </div>
  );
}

function ItemRow({ item, ctx, proposed }) {
  const { t } = ctx;
  const tp = ITEM_TYPE[item.type];
  return (
    <div className="lrow lrow-static">
      <div className="lrow-main">
        <div className="row" style={{ gap: 7 }}>
          <span className="lrow-title">{item.name}</span>
          {item.type !== 'common' && <Badge color={tp.c} dot={false}>{t(tp.k)}</Badge>}
        </div>
        <div className="lrow-sub">
          {item.qty} {item.unit} × {money(item.price)}
          {item.support ? ` · +${item.support} ${t('support').toLowerCase()}` : ''}
          {proposed ? ` · ${item.by}` : ''}
        </div>
      </div>
      <div className="lrow-amt num">{money(item.qty * item.price)}</div>
    </div>
  );
}

// ── Add item (with duplicate suggestion) ─────────────────────────────────────
function AddItemScreen({ ctx }) {
  const { t, data } = ctx;
  const [f, setF] = React.useState({ name: '', cat: 'food', qty: 1, unit: 'шт', price: '', type: 'common', comment: '', link: '' });
  const [err, setErr] = React.useState(null);
  const [dupDismissed, setDupDismissed] = React.useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  // duplicate detection
  const q = f.name.trim().toLowerCase();
  const dup = q.length >= 2 && !dupDismissed
    ? data.items.find(i => i.name.toLowerCase().includes(q) || q.includes(i.name.toLowerCase().slice(0, 3)))
    : null;

  const submit = () => {
    if (!f.name.trim()) { setErr('Укажите название'); return; }
    ctx.toast(t('toast_saved')); ctx.nav.pop();
  };

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad gap12">
        <div className="notice notice-info">
          <Icon name="lock" size={16} stroke={2} className="notice-ic" />
          <span>{t('no_edit_after')}</span>
        </div>

        <Field label={t('item_name')} error={err}>
          <Input value={f.name} onChange={v => { set('name', v); setErr(null); setDupDismissed(false); }} placeholder="Например, Кола" error={err} />
        </Field>

        {/* duplicate suggestion */}
        {dup && (
          <div className="card" style={{ border: '1.5px solid var(--st-amber)', background: 'var(--st-amber-bg)', padding: 13 }}>
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <Icon name="info" size={17} stroke={2} style={{ color: 'var(--st-amber)' }} />
              <span style={{ fontWeight: 650, fontSize: 14, color: 'var(--st-amber)' }}>{t('dup_title')}</span>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text)', marginBottom: 10 }}>
              «{dup.name}» {t('already_in_list')} — {dup.qty} {dup.unit} × {money(dup.price)}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Btn size="sm" variant="tinted" style={{ flex: 1 }} onClick={() => { ctx.toast(t('dup_add_support'), 'heart'); ctx.nav.pop(); }}>{t('dup_add_support')}</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setDupDismissed(true)}>{t('close')}</Btn>
            </div>
          </div>
        )}

        <Field label={t('category')}>
          <div className="chip-row">
            {CATS.map(c => <Chip key={c} active={f.cat === c} onClick={() => set('cat', c)}>{t('cat_' + c)}</Chip>)}
          </div>
        </Field>

        <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
          <Field label={t('qty')}>
            <Stepper value={f.qty} onChange={v => set('qty', v)} />
          </Field>
          <Field label={t('unit')}>
            <Input value={f.unit} onChange={v => set('unit', v)} placeholder="шт" />
          </Field>
          <Field label={t('price')}>
            <Input value={f.price} onChange={v => set('price', v.replace(/\D/g, ''))} placeholder="0" inputMode="numeric" suffix="тг" />
          </Field>
        </div>

        <Field label={t('item_type')}>
          <div className="gap8">
            {Object.entries(ITEM_TYPE).map(([k, v]) => (
              <button key={k} className="card" onClick={() => set('type', k)} style={{
                padding: '11px 13px', border: f.type === k ? '2px solid var(--accent)' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
              }}>
                <span className="badge-dot" style={{ background: `var(--st-${v.c})`, width: 10, height: 10 }} />
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 550 }}>{t(v.k)}</span>
                {f.type === k && <Icon name="check" size={18} stroke={2.4} style={{ color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('comment')} optional={t('optional')}>
          <Input value={f.comment} onChange={v => set('comment', v)} placeholder="Детали для остальных" />
        </Field>
        <Field label={t('shop_link')} optional={t('optional')}>
          <Input value={f.link} onChange={v => set('link', v)} placeholder="https://" prefix={<Icon name="arrowUR" size={16} stroke={2} />} />
        </Field>
      </div>
      <BottomAction>
        <Btn full onClick={submit}>{t('add_item')}</Btn>
      </BottomAction>
    </div>
  );
}

// ── Final invoice (participant) ──────────────────────────────────────────────
function InvoiceScreen({ ctx }) {
  const { t, data } = ctx;
  const inv = data.myInvoice;
  const rows = [
    { label: t('part_common'), value: inv.common, c: 'blue' },
    ...(inv.alcohol ? [{ label: t('part_alcohol'), value: inv.alcohol, c: 'red' }] : []),
    ...(inv.individual ? [{ label: t('part_individual'), value: inv.individual, c: 'amber' }] : []),
  ];
  const phone = (data.payment && data.payment.phone) || '';
  const owner = (data.payment && data.payment.owner) || '';
  const comment = `Выпускной — ${data.me.name}`;
  const copy = (text, msg) => {
    if (!text) return;
    try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) {}
    ctx.toast(msg, 'copy');
  };
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        {/* total */}
        <Card style={{ textAlign: 'center', padding: '22px 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--hint)' }}>{t('invoice_total')}</div>
          <div className="num" style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', margin: '4px 0 8px' }}>{money(inv.total)}</div>
          <Badge color={inv.paid ? 'green' : 'amber'}>{inv.paid ? t('paid') : t('not_paid')}</Badge>
        </Card>

        {/* breakdown */}
        <SectionLabel>{t('invoice_breakdown')}</SectionLabel>
        <div className="listcard">
          {rows.map((r, i) => (
            <div key={i} className="lrow lrow-static">
              <span className="badge-dot" style={{ background: `var(--st-${r.c})`, width: 9, height: 9 }} />
              <div className="lrow-main"><span className="lrow-title">{r.label}</span></div>
              <div className="lrow-amt num">{money(r.value)}</div>
            </div>
          ))}
          {inv.individualItems.map((it, i) => (
            <div key={'ii' + i} className="lrow lrow-static" style={{ paddingLeft: 32 }}>
              <div className="lrow-main"><span className="lrow-sub" style={{ marginTop: 0 }}>{it.name}</span></div>
              <div className="lrow-sub num">{money(it.price)}</div>
            </div>
          ))}
          <div className="lrow lrow-static" style={{ background: 'var(--surface-2)' }}>
            <div className="lrow-main"><span className="lrow-title" style={{ fontWeight: 700 }}>{t('invoice_total')}</span></div>
            <div className="lrow-amt num" style={{ fontWeight: 800 }}>{money(inv.total)}</div>
          </div>
        </div>

        {/* deadline */}
        <Card>
          <div className="row-between">
            <span className="row" style={{ gap: 9, color: 'var(--text-2)' }}><Icon name="clock" size={18} stroke={2} />{t('pay_deadline')}</span>
            <span style={{ fontWeight: 650 }}>{ctx.fmtDate(inv.deadline)}</span>
          </div>
        </Card>

        {/* instruction */}
        <SectionLabel>{t('pay_instruction')}</SectionLabel>
        <Card>
          {phone ? (
            <div className="stack" style={{ gap: 13 }}>
              {/* Kaspi number */}
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '12px 13px' }}>
                <div className="row" style={{ gap: 7, color: 'var(--hint)', fontSize: 12.5, fontWeight: 600 }}>
                  <Icon name="wallet" size={15} stroke={2} />Kaspi номер
                </div>
                <div className="row-between" style={{ marginTop: 7, gap: 10 }}>
                  <span className="num" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>{phone}</span>
                  <button className="copychip" onClick={() => copy(phone, 'Скопировано 👌')}>
                    <Icon name="copy" size={14} stroke={2} />Скопировать
                  </button>
                </div>
                {owner && <div style={{ fontSize: 12.5, color: 'var(--hint)', marginTop: 5 }}>{owner} · владелец</div>}
              </div>

              {/* comment */}
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6 }}>Комментарий к переводу</div>
                <div className="row-between" style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 11px 10px 13px', gap: 10 }}>
                  <span style={{ fontWeight: 600 }}>{comment}</span>
                  <button className="copychip copychip-icon" onClick={() => copy(comment, 'Скопировано 👌')} aria-label="Скопировать">
                    <Icon name="copy" size={16} stroke={2} />
                  </button>
                </div>
              </div>

              <div className="notice notice-info">
                <Icon name="info" size={16} stroke={2} className="notice-ic" />
                <span>Организатор подтвердит оплату вручную.</span>
              </div>
            </div>
          ) : (
            <div className="notice notice-warn">
              <Icon name="warn" size={16} stroke={2} className="notice-ic" />
              <span>Организатор не указал номер Kaspi</span>
            </div>
          )}
        </Card>
      </div>
      <BottomAction>
        <div className="row" style={{ gap: 10 }}>
          <Btn variant="secondary" icon="copy" disabled={!phone} style={{ flex: 1 }}
            onClick={() => copy(phone, 'Номер скопирован')}>Скопировать номер</Btn>
          <Btn variant="primary" icon="arrowUR" disabled={!phone} style={{ flex: 1 }}
            onClick={() => window.open('https://kaspi.kz', '_blank')}>Открыть Kaspi</Btn>
        </div>
      </BottomAction>
    </div>
  );
}

Object.assign(window, { CollectionsScreen, CollectionScreen, AddItemScreen, InvoiceScreen, ItemRow, COL_STATUS, ITEM_TYPE, CATS });
