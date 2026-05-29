// ── Profile & settings ───────────────────────────────────────────────────────
function ProfileScreen({ ctx }) {
  const { t } = ctx;
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        {/* user */}
        <Card>
          <div className="row" style={{ gap: 14 }}>
            <Avatar name={ctx.data.me.name + ' С'} size={56} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 720 }}>{ctx.data.me.name} Серіков</div>
              <div className="muted" style={{ fontSize: 13 }}>{ctx.data.event.title} · {ctx.data.event.school}</div>
            </div>
          </div>
        </Card>

        {/* role switch */}
        <SectionLabel>{t('role')}</SectionLabel>
        <div className="seg">
          <button className={ctx.role === 'participant' ? 'on' : ''} onClick={() => ctx.setRole('participant')}>{t('role_participant')}</button>
          <button className={ctx.role === 'organizer' ? 'on' : ''} onClick={() => ctx.setRole('organizer')}>{t('role_organizer')}</button>
        </div>
        <div className="hint" style={{ fontSize: 12, padding: '0 4px' }}>
          {ctx.role === 'organizer' ? 'Видны суммы, счета и управление участниками.' : 'Упрощённый вид: личный счёт и статусы.'}
        </div>

        {/* theme */}
        <SectionLabel>{t('theme')}</SectionLabel>
        <div className="seg">
          {[['system', t('th_system'), 'gear'], ['light', t('th_light'), 'sun'], ['dark', t('th_dark'), 'moon']].map(([k, label, ic]) =>
          <button key={k} className={ctx.themePref === k ? 'on' : ''} onClick={() => ctx.setThemePref(k)}>
              <Icon name={ic} size={15} stroke={2} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{label}
            </button>
          )}
        </div>
        <div className="hint" style={{ fontSize: 12, padding: '0 4px' }}>
          {ctx.themePref === 'system' ? 'Подстраивается под Telegram theme params.' : `Тема зафиксирована: ${ctx.themePref === 'dark' ? t('th_dark').toLowerCase() : t('th_light').toLowerCase()}.`}
        </div>

        {/* language */}
        <SectionLabel>{t('language')}</SectionLabel>
        <div className="seg">
          <button className={ctx.lang === 'ru' ? 'on' : ''} onClick={() => ctx.setLang('ru')}>Русский</button>
          <button className={ctx.lang === 'kk' ? 'on' : ''} onClick={() => ctx.setLang('kk')}>Қазақша</button>
        </div>

        {/* settings list */}
        <SectionLabel>{t('settings')}</SectionLabel>
        <div className="listcard">
          <div className="lrow" onClick={() => ctx.setNotif(!ctx.notif)}>
            <span style={{ color: 'var(--accent)' }}><Icon name="bell" size={20} stroke={2} /></span>
            <div className="lrow-main"><span className="lrow-title">{t('notifications')}</span></div>
            <Toggle on={ctx.notif} />
          </div>
          <div className="lrow" onClick={() => ctx.nav.push('states')}>
            <span style={{ color: 'var(--accent)' }}><Icon name="info" size={20} stroke={2} /></span>
            <div className="lrow-main"><span className="lrow-title">{t('ui_states')}</span></div>
            <Icon name="chevronR" size={18} className="lrow-chev" />
          </div>
          <div className="lrow" onClick={ctx.replayOnboarding}>
            <span style={{ color: 'var(--accent)' }}><Icon name="star" size={20} stroke={2} /></span>
            <div className="lrow-main"><span className="lrow-title">Показать onboarding</span></div>
            <Icon name="chevronR" size={18} className="lrow-chev" />
          </div>
        </div>

        <div className="hint" style={{ textAlign: 'center', fontSize: 11.5, marginTop: 4 }}>Выпускной Mini App · прототип · v1</div>
      </div>
    </div>);

}

function Toggle({ on }) {
  return (
    <span style={{
      width: 46, height: 28, borderRadius: 999, background: on ? 'var(--st-green)' : 'var(--surface-3)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0, display: 'inline-block'
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 20 : 2, width: 24, height: 24, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }} />
    </span>);

}

// ── UI states demo (empty / loading / error) ─────────────────────────────────
function StatesScreen({ ctx }) {
  const { t } = ctx;
  const [view, setView] = React.useState('loading');
  return (
    <div className="scroll screen-anim">
      <div style={{ padding: '10px 16px 0', background: 'var(--bg)' }}>
        <div className="seg">
          <button className={view === 'loading' ? 'on' : ''} onClick={() => setView('loading')}>Loading</button>
          <button className={view === 'empty' ? 'on' : ''} onClick={() => setView('empty')}>Empty</button>
          <button className={view === 'error' ? 'on' : ''} onClick={() => setView('error')}>Error</button>
          <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>{t('map_state')}</button>
        </div>
      </div>
      {view === 'loading' &&
      <div className="screen-pad gap12">
          {[0, 1, 2].map((i) =>
        <Card key={i}>
              <div className="row-between" style={{ marginBottom: 12 }}>
                <Skeleton h={16} w="55%" />
                <Skeleton h={20} w={64} r={999} />
              </div>
              <Skeleton h={12} w="100%" r={999} />
              <div className="row-between" style={{ marginTop: 12 }}>
                <Skeleton h={22} w={70} /><Skeleton h={22} w={70} /><Skeleton h={22} w={70} />
              </div>
            </Card>
        )}
        </div>
      }
      {view === 'empty' &&
      <StateView icon="cart" title={t('empty_title')} sub={t('empty_collections')}
      action={<Btn full icon="plus">{t('create_collection')}</Btn>} />
      }
      {view === 'error' &&
      <StateView icon="warn" title={t('error_title')} sub={t('error_sub')}
      action={<Btn full icon="route" variant="secondary">{t('retry')}</Btn>} />
      }
      {view === 'map' &&
      <div className="screen-pad">
        <div style={{ position: 'relative', height: 460, borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <MapLoading t={t} />
        </div>
        <div className="hint" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          {t('map_load_sub')} — показывается, пока грузятся тайлы Yandex Maps
        </div>
      </div>
      }
    </div>);

}

Object.assign(window, { ProfileScreen, StatesScreen, Toggle });