const { useState, useEffect, useMemo, useRef } = React;

const SCREENS = {
  home: HomeScreen, confirm: ConfirmScreen,
  places: PlacesScreen, place: PlaceScreen, addplace: AddPlaceScreen,
  collections: CollectionsScreen, collection: CollectionScreen, additem: AddItemScreen, invoice: InvoiceScreen,
  participants: ParticipantsScreen, participant: ParticipantScreen, finalize: FinalizeScreen,
  profile: ProfileScreen, states: StatesScreen,
};
const ROOT = { home: 'home', places: 'places', collections: 'collections', participants: 'participants', profile: 'profile' };

const MONTHS = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июня', 'июля', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  kk: ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'],
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4C6EF5",
  "theme": "system",
  "role": "participant",
  "lang": "ru",
  "deviceWidth": 402,
  "notif": true
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const t = useMemo(() => (key) => (I18N[tw.lang] && I18N[tw.lang][key]) || I18N.ru[key] || key, [tw.lang]);

  // system theme listener
  const [sysDark, setSysDark] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = e => setSysDark(e.matches);
    mq.addEventListener ? mq.addEventListener('change', h) : mq.addListener(h);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', h) : mq.removeListener(h); };
  }, []);
  const resolved = tw.theme === 'system' ? (sysDark ? 'dark' : 'light') : tw.theme;

  // app state
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('vyp_ob') === '1');
  const [participation, setParticipation] = useState(DATA.me.participation);
  const [participants, setParticipants] = useState(() => DATA.participants.map(p => ({ ...p })));
  const [toast, setToast] = useState(null);
  const toastRef = useRef(0);

  // navigation: per-tab stacks
  const [nav, setNav] = useState({
    tab: 'home',
    stacks: { home: [{ name: 'home' }], places: [{ name: 'places' }], collections: [{ name: 'collections' }], participants: [{ name: 'participants' }], profile: [{ name: 'profile' }] },
  });

  const navApi = useMemo(() => ({
    setTab: (tab) => setNav(s => (s.tab === tab ? { ...s, stacks: { ...s.stacks, [tab]: [{ name: ROOT[tab] }] } } : { ...s, tab })),
    push: (name, params) => setNav(s => ({ ...s, stacks: { ...s.stacks, [s.tab]: [...s.stacks[s.tab], { name, params }] } })),
    pop: () => setNav(s => { const st = s.stacks[s.tab]; return st.length <= 1 ? s : { ...s, stacks: { ...s.stacks, [s.tab]: st.slice(0, -1) } }; }),
  }), []);

  const showToast = (text, icon) => {
    const id = ++toastRef.current;
    setToast({ id, text, icon });
    setTimeout(() => setToast(c => (c && c.id === id ? null : c)), 1900);
  };

  const fmtDate = (iso) => { const d = new Date(iso); return d.getDate() + ' ' + MONTHS[tw.lang][d.getMonth()]; };
  const daysLeft = (iso) => Math.max(0, Math.round((new Date(iso) - new Date()) / 86400000));

  const ctx = {
    t, lang: tw.lang, data: DATA,
    role: tw.role, setRole: v => setTweak('role', v),
    themePref: tw.theme, setThemePref: v => setTweak('theme', v),
    setLang: v => setTweak('lang', v),
    notif: tw.notif, setNotif: v => setTweak('notif', v),
    participation, setParticipation,
    participants, setParticipants,
    nav: navApi, toast: showToast, fmtDate, daysLeft,
    finishOnboarding: () => { localStorage.setItem('vyp_ob', '1'); setOnboarded(true); },
    replayOnboarding: () => { localStorage.removeItem('vyp_ob'); setOnboarded(false); },
  };

  // when switching to organizer, hop to participants tab once to showcase
  const prevRole = useRef(tw.role);
  useEffect(() => {
    if (prevRole.current !== tw.role) {
      prevRole.current = tw.role;
      if (tw.role === 'organizer') setNav(s => ({ ...s, tab: 'participants', stacks: { ...s.stacks, participants: [{ name: 'participants' }] } }));
    }
  }, [tw.role]);

  const stack = nav.stacks[nav.tab];
  const cur = stack[stack.length - 1];
  const Screen = SCREENS[cur.name];
  const isRoot = stack.length === 1;

  // top bar config
  const titleFor = () => {
    switch (cur.name) {
      case 'home': return [t('nav_home'), ctx.data.event.dateLabel];
      case 'confirm': return [t('confirm_participation')];
      case 'places': return [t('nav_places')];
      case 'place': return [ctx.data.places.find(p => p.id === cur.params.id)?.name || t('nav_places')];
      case 'addplace': return [t('add_place')];
      case 'collections': return [t('nav_collections')];
      case 'collection': return [ctx.data.collections.find(c => c.id === cur.params?.id)?.title || t('collection')];
      case 'additem': return [t('add_item')];
      case 'invoice': return [t('invoice')];
      case 'participants': return [t('nav_participants'), tw.role === 'organizer' ? t('organizer_panel') : null];
      case 'participant': return [participants.find(p => p.id === cur.params.id)?.name || t('nav_participants')];
      case 'finalize': return [t('final_calc')];
      case 'profile': return [t('nav_profile')];
      case 'states': return [t('ui_states')];
      default: return [''];
    }
  };
  const [tTitle, tSub] = titleFor();

  const showOnboarding = !onboarded;

  return (
    <div id="phone-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <IOSDevice width={Number(tw.deviceWidth)} height={868} dark={resolved === 'dark'}>
        <div className="app" data-theme={resolved} style={{ '--accent': tw.accent }}>
          {showOnboarding ? (
            <Onboarding ctx={ctx} />
          ) : (
            <>
              <TopBar title={tTitle} subtitle={tSub} onBack={isRoot ? null : navApi.pop}
                right={isRoot && nav.tab === 'home'
                  ? <span className="pill-info" onClick={() => navApi.setTab('profile')} style={{ cursor: 'pointer', background: 'var(--surface-3)', color: 'var(--text-2)' }}>{tw.role === 'organizer' ? t('role_organizer') : t('role_participant')}</span>
                  : null} />
              <div key={nav.tab + stack.length} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Screen ctx={ctx} params={cur.params || {}} />
              </div>
              <BottomNav tab={nav.tab} onTab={navApi.setTab} t={t} isOrg={tw.role === 'organizer'} />
            </>
          )}
          <Toast toast={toast} />
        </div>
      </IOSDevice>

      <TweaksPanel>
        <TweakSection label="Бренд" />
        <TweakColor label="Акцент" value={tw.accent}
          options={['#4C6EF5', '#2AABEE', '#7C5CDB', '#1FA971', '#F0913A', '#E8557A']}
          onChange={v => setTweak('accent', v)} />
        <TweakSection label="Тема и роль" />
        <TweakRadio label="Тема" value={tw.theme} options={['system', 'light', 'dark']}
          onChange={v => setTweak('theme', v)} />
        <TweakRadio label="Роль" value={tw.role} options={['participant', 'organizer']}
          onChange={v => setTweak('role', v)} />
        <TweakRadio label="Язык" value={tw.lang} options={['ru', 'kk']}
          onChange={v => setTweak('lang', v)} />
        <TweakSection label="Адаптив" />
        <TweakSelect label="Ширина экрана" value={String(tw.deviceWidth)}
          options={['320', '360', '390', '402', '430']}
          onChange={v => setTweak('deviceWidth', Number(v))} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('stage')).render(<App />);
