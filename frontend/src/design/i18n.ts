export type Lang = "ru" | "kk";

export const i18n = {
  ru: {
    nav_home: "Главная", nav_places: "Места", nav_collections: "Сборы", nav_participants: "Участники", nav_profile: "Профиль",
    cancel: "Отмена", add: "Добавить", confirm: "Подтвердить", open: "Открыть", close: "Закрыть", all: "Все", retry: "Повторить", skip: "Пропустить", next: "Далее",
    part_in: "Участвую", part_out: "Не участвую", part_maybe: "Думаю", part_none: "Не ответил", confirm_participation: "Подтвердить участие", your_status: "Ваш статус", invoices_only_in: "Счет придет только участникам",
    active_collection: "Активный сбор", budget: "Бюджет", collected: "Собрано", plan: "План", remaining: "Остаток", deadline: "Дедлайн", days_left: "дн. осталось",
    top_place: "Лидер по голосам", quick_actions: "Быстрые действия", open_collection: "Открыть сбор", open_map: "Открыть карту", suggest_place: "Предложить место",
    map: "Карта", list: "Список", add_place: "Добавить место", price_approx: "Примерно", capacity: "Вместимость", address: "Адрес", description: "Описание", whats_there: "Что там есть",
    rent_terms: "Условия аренды", pros: "Плюсы", cons: "Минусы", author_note: "Комментарий автора", votes: "голосов", route: "Открыть маршрут", support: "Поддержать идею", suggest_other: "Предложить другое", supported: "Идея поддержана",
    int_low: "Мало данных", int_new: "Новая идея", int_high: "Высокий интерес", int_debate: "Спорная идея", int_problem: "Проблема",
    am_kitchen: "Кухня", am_grill: "Мангал", am_music: "Музыка", am_beds: "Спальные места", am_parking: "Парковка", am_dishes: "Посуда", am_pool: "Бассейн", am_lounge: "Зона отдыха", am_noise: "Лимит по шуму", am_deposit: "Залог",
    approved: "Утверждено", proposed: "Предложено", add_item: "Добавить товар", st_draft: "Черновик", st_active: "Активен", st_locked: "Закрыт для изменений", st_done: "Завершен", st_cancelled: "Отменен", deadline_soon: "Дедлайн близко - успейте добавить позиции",
    item_name: "Название", category: "Категория", qty: "Количество", unit: "Ед. изм.", price: "Цена", item_type: "Тип товара", comment: "Комментарий", shop_link: "Ссылка на магазин", optional: "необязательно", no_edit_after: "После добавления изменить товар будет нельзя",
    type_common: "Общий", type_alcohol: "Алкоголь", type_individual: "Индивидуальный",
    type_for_all: "Для всех", type_just_me: "Только для меня",
    cat_food: "Еда", cat_drinks: "Напитки", cat_decor: "Декор", cat_music: "Музыка", cat_other: "Другое",
    dup_title: "Похоже, уже есть в списке", dup_add_support: "Добавить поддержку", already_in_list: "уже есть в списке",
    invoice: "Ваш счет", invoice_total: "К оплате", invoice_breakdown: "Из чего складывается", part_common: "Общая часть", part_alcohol: "Алкогольная часть", part_individual: "Индивидуальные позиции", pay_deadline: "Оплатить до", pay_instruction: "Как оплатить", paid: "Оплачено", not_paid: "Не оплачено", confirmed_by_org: "Оплату подтверждает организатор",
    organizer_panel: "Панель организатора", payment_category: "Категория оплаты", cat_regular: "Обычная доля", cat_noalco: "Без алкоголя", cat_individual: "Индивидуальная доля", cat_exempt: "Освобожден", invoice_sum: "Сумма счета",
    send_invoices: "Отправить счета", final_calc: "Финальный расчет", will_receive: "Получат счет", wont_receive: "Не получат счет", no_answer: "Не ответили", total_sum: "Итоговая сумма", confirm_send: "Подтвердить отправку", mark_paid: "Отметить оплату",
    f_in: "Участвует", f_out: "Не участвует", f_maybe: "Думает", f_none: "Не ответил", f_paid: "Оплатил", f_unpaid: "Не оплатил",
    settings: "Настройки", theme: "Тема", language: "Язык", th_light: "Светлая", th_dark: "Темная", th_system: "Системная", role: "Роль", role_participant: "Участник", role_organizer: "Организатор", notifications: "Уведомления", ui_states: "UI-состояния",
    empty_title: "Пока пусто", empty_collections: "Сборов еще нет. Создайте первый сбор и добавьте товары.", empty_places: "Мест по этим фильтрам нет", empty_places_sub: "Сбросьте фильтры или предложите новое место.", create_collection: "Создать сбор", loading: "Загрузка...", error_title: "Что-то пошло не так", error_sub: "Не удалось загрузить данные. Проверьте соединение.", reset_filters: "Сбросить фильтры",
    ob1_t: "Выпускной без хаоса", ob1_s: "Голосуйте за места, скидывайтесь на нужное и следите за бюджетом - в одном месте.", ob2_t: "Места на карте", ob2_s: "Предлагайте площадки, смотрите цены и условия, поддерживайте лучшие идеи.", ob3_t: "Честные счета", ob3_s: "Счет придет только участникам и только за то, что их касается. Без алкоголя - без доплаты.", get_started: "Начать",
    toast_supported: "Голос засчитан", toast_saved: "Сохранено", toast_sent: "Счета отправлены", toast_status: "Статус обновлен", toast_paid: "Оплата подтверждена", people: "чел.", map_load: "Загрузка карты...", map_load_sub: "Подключаем Yandex Maps", map_state: "Карта", address_hint: "Выберите адрес из подсказок - метка встанет на карту автоматически", powered_geosuggest: "Подсказки Yandex Geosuggest", coords_label: "Координаты метки",
    manage_categories: "Категории", category_add: "Добавить категорию", category_placeholder: "Название категории", category_empty: "Категорий пока нет",
  },
  kk: {
    nav_home: "Басты", nav_places: "Орындар", nav_collections: "Жинақтар", nav_participants: "Қатысушылар", nav_profile: "Профиль",
    cancel: "Бас тарту", add: "Қосу", confirm: "Растау", open: "Ашу", close: "Жабу", all: "Барлығы", retry: "Қайталау", skip: "Өткізу", next: "Әрі қарай",
    part_in: "Қатысамын", part_out: "Қатыспаймын", part_maybe: "Ойланамын", part_none: "Жауап жоқ", confirm_participation: "Қатысуды растау", your_status: "Сіздің мәртебеңіз", invoices_only_in: "Шот тек қатысушыларға келеді",
    active_collection: "Белсенді жинақ", budget: "Бюджет", collected: "Жиналды", plan: "Жоспар", remaining: "Қалдық", deadline: "Мерзім", days_left: "күн қалды",
    top_place: "Дауыс көшбасшысы", quick_actions: "Жылдам әрекеттер", open_collection: "Жинақты ашу", open_map: "Картаны ашу", suggest_place: "Орын ұсыну",
    map: "Карта", list: "Тізім", add_place: "Орын қосу", price_approx: "Шамамен", capacity: "Сыйымдылық", address: "Мекенжай", description: "Сипаттама", whats_there: "Не бар",
    rent_terms: "Жалдау шарттары", pros: "Артықшылықтары", cons: "Кемшіліктері", author_note: "Автор пікірі", votes: "дауыс", route: "Бағытты ашу", support: "Идеяны қолдау", suggest_other: "Басқа орын ұсыну", supported: "Идея қолдалды",
    int_low: "Дерек аз", int_new: "Жаңа идея", int_high: "Жоғары қызығушылық", int_debate: "Даулы идея", int_problem: "Мәселе",
    am_kitchen: "Ас үй", am_grill: "Мангал", am_music: "Музыка", am_beds: "Ұйықтайтын орын", am_parking: "Тұрақ", am_dishes: "Ыдыс", am_pool: "Бассейн", am_lounge: "Демалыс аймағы", am_noise: "Шу шектеуі", am_deposit: "Кепіл",
    approved: "Бекітілді", proposed: "Ұсынылды", add_item: "Тауар қосу", st_draft: "Жоба", st_active: "Белсенді", st_locked: "Өзгертуге жабық", st_done: "Аяқталды", st_cancelled: "Бас тартылды", deadline_soon: "Мерзім жақын - позицияларды қосып үлгеріңіз",
    item_name: "Атауы", category: "Санат", qty: "Саны", unit: "Өлшем", price: "Бағасы", item_type: "Тауар түрі", comment: "Пікір", shop_link: "Дүкен сілтемесі", optional: "міндетті емес", no_edit_after: "Қосқаннан кейін тауарды өзгерту мүмкін болмайды",
    type_common: "Жалпы", type_alcohol: "Алкоголь", type_individual: "Жеке",
    type_for_all: "Барлығына", type_just_me: "Тек өзіме",
    cat_food: "Тамақ", cat_drinks: "Сусындар", cat_decor: "Декор", cat_music: "Музыка", cat_other: "Басқа",
    dup_title: "Тізімде бар сияқты", dup_add_support: "Қолдау қосу", already_in_list: "тізімде бар",
    invoice: "Сіздің шотыңыз", invoice_total: "Төлеуге", invoice_breakdown: "Неден тұрады", part_common: "Жалпы бөлік", part_alcohol: "Алкоголь бөлігі", part_individual: "Жеке позициялар", pay_deadline: "Төлеу мерзімі", pay_instruction: "Қалай төлеу керек", paid: "Төленді", not_paid: "Төленбеген", confirmed_by_org: "Төлемді ұйымдастырушы растайды",
    organizer_panel: "Ұйымдастырушы панелі", payment_category: "Төлем санаты", cat_regular: "Әдеттегі үлес", cat_noalco: "Алкогольсіз", cat_individual: "Жеке үлес", cat_exempt: "Босатылған", invoice_sum: "Шот сомасы",
    send_invoices: "Шоттарды жіберу", final_calc: "Қорытынды есеп", will_receive: "Шот алады", wont_receive: "Шот алмайды", no_answer: "Жауап берген жоқ", total_sum: "Жалпы сома", confirm_send: "Жіберуді растау", mark_paid: "Төлемді белгілеу",
    f_in: "Қатысады", f_out: "Қатыспайды", f_maybe: "Ойланады", f_none: "Жауап жоқ", f_paid: "Төледі", f_unpaid: "Төлемеген",
    settings: "Баптаулар", theme: "Тақырып", language: "Тіл", th_light: "Ашық", th_dark: "Қараңғы", th_system: "Жүйелік", role: "Рөл", role_participant: "Қатысушы", role_organizer: "Ұйымдастырушы", notifications: "Хабарламалар", ui_states: "UI күйлері",
    empty_title: "Әзірге бос", empty_collections: "Жинақтар әлі жоқ. Алғашқы жинақты құрып, тауарларды қосыңыз.", empty_places: "Бұл сүзгілер бойынша орын жоқ", empty_places_sub: "Сүзгілерді тазалаңыз немесе жаңа орын ұсыныңыз.", create_collection: "Жинақ құру", loading: "Жүктелуде...", error_title: "Бірдеңе дұрыс болмады", error_sub: "Деректерді жүктеу мүмкін болмады. Байланысты тексеріңіз.", reset_filters: "Сүзгілерді тазалау",
    ob1_t: "Хаоссыз бітіру кеші", ob1_s: "Орындарға дауыс беріңіз, керегіне ақша жинаңыз және бюджетті бақылаңыз - бір жерде.", ob2_t: "Картадағы орындар", ob2_s: "Алаңдарды ұсыныңыз, баға мен шарттарды көріңіз, үздік идеяларды қолдаңыз.", ob3_t: "Әділ шоттар", ob3_s: "Шот тек қатысушыларға және тек оларға қатысты нәрсеге келеді. Алкогольсіз - қосымша төлемсіз.", get_started: "Бастау",
    toast_supported: "Дауыс есептелді", toast_saved: "Сақталды", toast_sent: "Шоттар жіберілді", toast_status: "Мәртебе жаңартылды", toast_paid: "Төлем расталды", people: "адам", map_load: "Карта жүктелуде...", map_load_sub: "Yandex Maps қосылуда", map_state: "Карта", address_hint: "Ұсыныстардан мекенжайды таңдаңыз - белгі картаға өзі қойылады", powered_geosuggest: "Yandex Geosuggest ұсыныстары", coords_label: "Белгі координаталары",
    manage_categories: "Санаттар", category_add: "Санат қосу", category_placeholder: "Санат атауы", category_empty: "Санаттар жоқ",
  },
} as const;

export type I18nKey = keyof typeof i18n.ru;

export function getTranslator(lang: Lang) {
  return (key: string) => i18n[lang][key as I18nKey] ?? i18n.ru[key as I18nKey] ?? key;
}
