// ── Marker color helper ────────────────────────────────────────────────────
function markerColor(interest) { return `var(--st-${INTEREST_COLOR[interest]})`; }

// ── Map loading state (Yandex Maps tiles) ───────────────────────────────────
function MapLoading({ t, fading }) {
  return (
    <div className={'map-loading' + (fading ? ' map-loading-out' : '')} style={{ position: 'absolute', inset: 0, zIndex: 4 }}>
      <div className="map-skel">
        <div className="map-skel-road" style={{ top: '28%', left: '-5%', width: '110%', height: 10, transform: 'rotate(-6deg)' }} />
        <div className="map-skel-road" style={{ top: '64%', left: '-5%', width: '110%', height: 14, transform: 'rotate(4deg)' }} />
        <div className="map-skel-road" style={{ top: '-5%', left: '46%', width: 10, height: '110%', transform: 'rotate(8deg)' }} />
      </div>
      <div className="map-load-badge"><span className="spinner" />{t('map_load')}</div>
    </div>
  );
}

const INTEREST_KEYS = {
  low: 'int_low', new: 'int_new', high: 'int_high', debate: 'int_debate', problem: 'int_problem',
};
const AMENITY_LIST = ['kitchen', 'grill', 'music', 'beds', 'parking', 'dishes', 'pool', 'lounge', 'noise', 'deposit'];

// Mock Yandex Geosuggest results (replaced by real /v1/suggest API later)
const GEOSUGGEST = [
  { title: 'ул. Абая, 145', sub: 'Алматы, Бостандыкский р-н', lat: 43.2402, lng: 76.9300 },
  { title: 'пр. Достык, 89', sub: 'Алматы, Медеуский р-н', lat: 43.2389, lng: 76.9560 },
  { title: 'ул. Желтоксан, 37', sub: 'Алматы, Алмалинский р-н', lat: 43.2567, lng: 76.9286 },
  { title: 'мкр. Самал-2, 58', sub: 'Алматы, Медеуский р-н', lat: 43.2330, lng: 76.9470 },
  { title: 'пос. Каменское плато, 12', sub: 'Алматы, за городом', lat: 43.1905, lng: 76.9820 },
  { title: 'Центральный парк, вход 2', sub: 'Алматы, Медеуский р-н', lat: 43.2520, lng: 76.9460 },
];

// ── Places (map + list) ─────────────────────────────────────────────────────
function PlacesScreen({ ctx }) {
  const { t, data } = ctx;
  const [view, setView] = React.useState('map');
  const [filter, setFilter] = React.useState('all');
  const [sel, setSel] = React.useState(null);
  const [mapPhase, setMapPhase] = React.useState('loading'); // loading → fading → done
  React.useEffect(() => {
    if (view !== 'map') return;
    setMapPhase('loading');
    const t1 = setTimeout(() => setMapPhase('fading'), 1150);
    const t2 = setTimeout(() => setMapPhase('done'), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [view]);

  const filtered = data.places.filter(p => filter === 'all' || p.interest === filter);
  const selPlace = data.places.find(p => p.id === sel);

  const filterChips = (
    <div className="chip-row" style={{ padding: '10px 16px' }}>
      <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t('all')}</Chip>
      {['high', 'new', 'debate', 'problem', 'low'].map(k => (
        <Chip key={k} color={INTEREST_COLOR[k]} active={filter === k} onClick={() => setFilter(filter === k ? 'all' : k)}>
          {t(INTEREST_KEYS[k])}
        </Chip>
      ))}
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="screen-anim">
      {/* view toggle */}
      <div style={{ padding: '8px 16px 12px', background: 'var(--bg)', borderBottom: '0.5px solid var(--sep)' }}>
        <div className="seg">
          <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>{t('map')}</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>{t('list')}</button>
        </div>
      </div>

      {view === 'map' ? (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div className="map">
            <image-slot id="vyp-map" class="map-bg" fit="cover"
              placeholder="Перетащите скриншот Yandex Maps" style={{ width: '100%', height: '100%', display: 'block' }}></image-slot>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 60%, color-mix(in srgb, var(--bg) 40%, transparent))' }} />
            {filtered.map(p => (
              <div key={p.id} className={'map-marker' + (sel === p.id ? ' map-marker-active' : '')}
                style={{ left: p.x + '%', top: p.y + '%' }} onClick={() => setSel(p.id)}>
                <div className="map-pin" style={{ background: markerColor(p.interest) }}>
                  <span>{p.votes}</span>
                </div>
              </div>
            ))}
          </div>
          {/* filters overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'color-mix(in srgb, var(--bg) 82%, transparent)', backdropFilter: 'blur(10px)' }}>
            {filterChips}
          </div>
          {/* add FAB */}
          <button className="btn btn-primary map-fab" style={{ right: 16, bottom: sel ? 'unset' : 16, top: sel ? 60 : 'unset', borderRadius: 14, padding: '12px 16px', boxShadow: 'var(--shadow-lg)' }}
            onClick={() => ctx.nav.push('addplace')}>
            <Icon name="plus" size={20} stroke={2.4} />{t('add_place')}
          </button>
          {/* bottom sheet preview */}
          {selPlace && <MapSheet place={selPlace} ctx={ctx} onClose={() => setSel(null)} />}
          {/* Yandex Maps tiles loading state */}
          {mapPhase !== 'done' && <MapLoading t={t} fading={mapPhase === 'fading'} />}
        </div>
      ) : (
        <div className="scroll">
          {filterChips}
          <div className="screen-pad gap12" style={{ paddingTop: 0 }}>
            {filtered.length === 0 ? (
              <StateView icon="pin" title={t('empty_places')} sub={t('empty_places_sub')}
                action={<Btn full variant="secondary" onClick={() => setFilter('all')}>{t('reset_filters')}</Btn>} />
            ) : filtered.sort((a, b) => b.votes - a.votes).map(p => (
              <PlaceListCard key={p.id} place={p} ctx={ctx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceListCard({ place, ctx }) {
  const { t } = ctx;
  return (
    <Card pad={false} className="card-tap" onClick={() => ctx.nav.push('place', { id: place.id })}>
      <div style={{ display: 'flex' }}>
        <div className="ph" style={{ width: 92, height: 96, borderRadius: '16px 0 0 16px', flexShrink: 0 }}>фото</div>
        <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--hint)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place.district}</div>
          <div className="row-between" style={{ marginTop: 9 }}>
            <Badge color={INTEREST_COLOR[place.interest]}>{t(INTEREST_KEYS[place.interest])}</Badge>
            <span className="num" style={{ fontSize: 14, fontWeight: 700 }}>{money(place.price)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Map bottom sheet (compact, doesn't cover whole map) ─────────────────────
function MapSheet({ place, ctx, onClose }) {
  const { t } = ctx;
  return (
    <div style={{
      position: 'absolute', left: 8, right: 8, bottom: 8, background: 'var(--bg)',
      borderRadius: 18, boxShadow: 'var(--shadow-lg)', padding: 14, zIndex: 8,
      animation: 'slideup 0.26s cubic-bezier(.2,.8,.2,1)',
    }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <Badge color={INTEREST_COLOR[place.interest]}>{t(INTEREST_KEYS[place.interest])}</Badge>
        <button className="topbar-btn" style={{ width: 28, height: 28, color: 'var(--hint)' }} onClick={onClose}><Icon name="x" size={18} stroke={2.2} /></button>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="ph" style={{ width: 62, height: 62, flexShrink: 0 }}>фото</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{place.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--hint)', marginTop: 1 }}>{place.district}</div>
          <div className="row" style={{ gap: 12, marginTop: 6 }}>
            <span className="num" style={{ fontWeight: 700, fontSize: 14 }}>{money(place.price)}</span>
            <span className="muted" style={{ fontSize: 13 }}><Icon name="users" size={13} stroke={2} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }} />{place.capacity}</span>
          </div>
        </div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <Btn variant="secondary" size="sm" icon="route" onClick={() => ctx.toast('Открываю Yandex Карты', 'route')}>{t('route')}</Btn>
        <Btn size="sm" style={{ flex: 1 }} onClick={() => ctx.nav.push('place', { id: place.id })}>{t('open')}</Btn>
      </div>
    </div>
  );
}

// ── Place detail card ───────────────────────────────────────────────────────
function PlaceScreen({ ctx, params }) {
  const { t, data } = ctx;
  const place = data.places.find(p => p.id === params.id);
  const [supported, setSupported] = React.useState(false);
  if (!place) return null;
  return (
    <div className="scroll screen-anim">
      <div className="ph" style={{ height: 200, borderRadius: 0, margin: 0 }}>фото / галерея места</div>
      <div className="screen-pad stack" style={{ paddingTop: 14 }}>
        <div>
          <div className="row-between">
            <div style={{ fontSize: 22, fontWeight: 760, letterSpacing: '-0.02em', flex: 1 }}>{place.name}</div>
            <Badge color={INTEREST_COLOR[place.interest]}>{t(INTEREST_KEYS[place.interest])}</Badge>
          </div>
          <div className="row" style={{ gap: 6, color: 'var(--hint)', fontSize: 13.5, marginTop: 5 }}>
            <Icon name="pin" size={15} stroke={2} /><span>{place.address}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--hint)', marginTop: 3, paddingLeft: 21 }}>{place.district}</div>
        </div>

        {/* stat row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <StatBox label={t('price_approx')} value={money(place.price)} />
          <StatBox label={t('capacity')} value={place.capacity + ' ' + t('people')} />
          <StatBox label={t('votes')} value={place.votes} c="green" icon="heart" />
        </div>

        <Card>
          <div className="muted" style={{ fontSize: 14.5, lineHeight: 1.5 }}>{place.desc}</div>
        </Card>

        {/* amenities */}
        <SectionLabel>{t('whats_there')}</SectionLabel>
        <div className="amen-grid">
          {place.amenities.map(a => (
            <div key={a} className="amen">
              <span className="amen-ic"><Icon name={a} size={19} stroke={1.8} /></span>{t('am_' + a)}
            </div>
          ))}
        </div>

        {/* rent terms */}
        <SectionLabel>{t('rent_terms')}</SectionLabel>
        <Card><div style={{ fontSize: 14, lineHeight: 1.5 }}>{place.rent}</div></Card>

        {/* pros & cons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Card style={{ borderTop: '3px solid var(--st-green)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--st-green)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{t('pros')}</div>
            <div className="gap8">{place.pros.map((p, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.35 }}>{p}</div>)}</div>
          </Card>
          <Card style={{ borderTop: '3px solid var(--st-red)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--st-red)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{t('cons')}</div>
            <div className="gap8">{place.cons.map((p, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.35 }}>{p}</div>)}</div>
          </Card>
        </div>

        {/* author note */}
        <SectionLabel>{t('author_note')}</SectionLabel>
        <Card>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <Avatar name={place.author} size={36} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 650 }}>{place.author}</div>
              <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 2 }}>{place.note}</div>
            </div>
          </div>
        </Card>

        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'center', marginTop: 4 }} onClick={() => ctx.nav.push('addplace')}>
          <Icon name="plus" size={16} stroke={2.2} />{t('suggest_other')}
        </button>
      </div>

      <BottomAction>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="secondary" icon="route" onClick={() => ctx.toast('Открываю Yandex Карты', 'route')}>{t('route')}</Btn>
          <Btn style={{ flex: 1 }} variant={supported ? 'tinted' : 'primary'} icon={supported ? 'check' : 'heart'}
            onClick={() => { if (!supported) { setSupported(true); ctx.toast(t('toast_supported'), 'heart'); } }}>
            {supported ? t('supported') : t('support')}
          </Btn>
        </div>
      </BottomAction>
    </div>
  );
}

function StatBox({ label, value, c, icon }) {
  return (
    <div className="card card-pad" style={{ flex: 1, padding: 12, textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 16, fontWeight: 750, color: c ? `var(--st-${c})` : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {icon && <Icon name={icon} size={15} stroke={2} />}{value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--hint)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ── Add place form ──────────────────────────────────────────────────────────
function AddPlaceScreen({ ctx }) {
  const { t } = ctx;
  const [f, setF] = React.useState({ name: '', address: '', coords: null, price: '', capacity: '', desc: '', amen: [], note: '' });
  const [err, setErr] = React.useState({});
  const [showSug, setShowSug] = React.useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const toggleAmen = a => setF(s => ({ ...s, amen: s.amen.includes(a) ? s.amen.filter(x => x !== a) : [...s.amen, a] }));
  const suggestions = f.address.trim().length >= 2 && !f.coords
    ? GEOSUGGEST.filter(g => g.title.toLowerCase().includes(f.address.trim().toLowerCase()) || g.sub.toLowerCase().includes(f.address.trim().toLowerCase())).slice(0, 5)
    : [];
  const pickAddress = g => setF(s => ({ ...s, address: g.title, coords: { lat: g.lat, lng: g.lng } }));
  const submit = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Укажите название';
    if (!f.address.trim()) e.address = 'Укажите адрес';
    if (Object.keys(e).length) { setErr(e); return; }
    ctx.toast(t('toast_saved')); ctx.nav.pop();
  };
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad gap12">
        <div className="ph" style={{ height: 110 }}>＋ добавить фото места</div>
        <Field label={t('item_name')} error={err.name}>
          <Input value={f.name} onChange={v => { set('name', v); setErr(e => ({ ...e, name: null })); }} placeholder="Например, Лофт «Высота»" error={err.name} />
        </Field>
        <Field label={t('address')} error={err.address} hint={!f.coords ? t('address_hint') : null}>
          <div className="suggest">
            <Input value={f.address} error={err.address}
              prefix={<Icon name="search" size={17} stroke={2} />}
              onChange={v => { setF(s => ({ ...s, address: v, coords: null })); setErr(e => ({ ...e, address: null })); setShowSug(true); }}
              onFocus={() => setShowSug(true)}
              placeholder="Начните вводить адрес" />
            {showSug && suggestions.length > 0 && (
              <div className="suggest-list">
                {suggestions.map((g, i) => (
                  <button key={i} className="suggest-item" onClick={() => { pickAddress(g); setShowSug(false); }}>
                    <span className="suggest-ic"><Icon name="pin" size={18} stroke={2} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="suggest-main" style={{ display: 'block' }}>{g.title}</span>
                      <span className="suggest-sub" style={{ display: 'block' }}>{g.sub}</span>
                    </span>
                  </button>
                ))}
                <div className="suggest-powered"><Icon name="pin" size={12} stroke={2} />{t('powered_geosuggest')}</div>
              </div>
            )}
          </div>
        </Field>
        {f.coords && (
          <div className="coords">
            <span style={{ color: 'var(--st-green)' }}><Icon name="pin" size={18} stroke={2} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{t('coords_label')}</div>
              <div className="mono" style={{ fontSize: 13.5, fontWeight: 600 }}>{f.coords.lat.toFixed(5)}, {f.coords.lng.toFixed(5)}</div>
            </div>
            <button className="topbar-btn" style={{ width: 30, height: 30, color: 'var(--hint)' }} onClick={() => set('coords', null)}><Icon name="x" size={17} stroke={2.2} /></button>
          </div>
        )}
        <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <Field label={t('price_approx')}><Input value={f.price} onChange={v => set('price', v.replace(/\D/g, ''))} placeholder="0" inputMode="numeric" suffix="тг" /></Field>
          <Field label={t('capacity')}><Input value={f.capacity} onChange={v => set('capacity', v.replace(/\D/g, ''))} placeholder="0" inputMode="numeric" suffix={t('people')} /></Field>
        </div>
        <Field label={t('whats_there')}>
          <div className="chip-row" style={{ flexWrap: 'wrap', overflow: 'visible', display: 'flex', gap: 8 }}>
            {AMENITY_LIST.map(a => (
              <Chip key={a} active={f.amen.includes(a)} onClick={() => toggleAmen(a)} icon={a}>{t('am_' + a)}</Chip>
            ))}
          </div>
        </Field>
        <Field label={t('description')}>
          <textarea className="input" style={{ resize: 'none', minHeight: 76, padding: 12, borderRadius: 'var(--r-input)', border: '1.5px solid var(--sep-strong)', background: 'var(--surface)' }}
            value={f.desc} onChange={e => set('desc', e.target.value)} placeholder="Чем место хорошо, какие условия…" />
        </Field>
        <Field label={t('author_note')} optional={t('optional')}>
          <Input value={f.note} onChange={v => set('note', v)} placeholder="Ваш комментарий" />
        </Field>
      </div>
      <BottomAction>
        <Btn full onClick={submit}>{t('add_place')}</Btn>
      </BottomAction>
    </div>
  );
}

Object.assign(window, { PlacesScreen, PlaceScreen, AddPlaceScreen, MapSheet, MapLoading, PlaceListCard, StatBox, markerColor, INTEREST_KEYS, AMENITY_LIST });
