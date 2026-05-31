// Mock data + helpers for the Выпускной Telegram Mini App prototype.

// Money: integers only, space thousands separator, "тг".
window.money = function (n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('ru-RU').replace(/\u00A0/g, ' ').replace(/,/g, ' ') + ' тг';
};
window.moneyShort = function (n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('ru-RU').replace(/\u00A0/g, ' ').replace(/,/g, ' ');
};

window.DATA = {
  event: {
    title: 'Выпускной 11 «А»',
    school: 'Гимназия №25',
    date: '2026-06-20',
    dateLabel: '20 июня 2026',
  },

  // current user (participant POV)
  me: { id: 'u1', name: 'Алмас', participation: 'maybe' },

  // INTEREST: low(gray) new(blue) high(green) debate(yellow) problem(red)
  places: [
    {
      id: 'p1', name: 'Лофт «Высота»', interest: 'high', votes: 18,
      address: 'ул. Абая, 145, 7 этаж', district: 'Бостандыкский р-н · 3.2 км',
      price: 220000, capacity: 60, x: 38, y: 34,
      desc: 'Панорамный лофт с видом на город. Своя кухня, свет и звук уже есть.',
      amenities: ['kitchen', 'music', 'dishes', 'lounge', 'parking'],
      rent: 'Аренда 6 часов, продление по 30 000 тг/час. Уборка включена.',
      pros: ['Вид на город', 'Своё оборудование', 'Близко к центру'],
      cons: ['Лимит по шуму после 23:00'],
      note: 'Были на дне рождения — место огонь, хозяин отвечает быстро.',
      author: 'Дана',
    },
    {
      id: 'p2', name: 'Загородный дом «Сосны»', interest: 'debate', votes: 11,
      address: 'пос. Каменское плато, 12', district: 'За городом · 18 км',
      price: 180000, capacity: 40, x: 64, y: 58,
      desc: 'Большой дом с участком, мангалом и бассейном. Можно остаться с ночёвкой.',
      amenities: ['grill', 'pool', 'beds', 'kitchen', 'parking', 'lounge'],
      rent: 'Сутки. Залог 50 000 тг возвращается после осмотра.',
      pros: ['Бассейн и мангал', 'Можно остаться на ночь', 'Много места'],
      cons: ['Далеко ехать', 'Нужен трансфер', 'Залог'],
      note: 'Класс, но без машины тяжело добираться. Думаем по трансферу.',
      author: 'Тимур',
    },
    {
      id: 'p3', name: 'Ресторан «Достар»', interest: 'new', votes: 6,
      address: 'пр. Достык, 89', district: 'Медеуский р-н · 4.1 км',
      price: 320000, capacity: 80, x: 50, y: 22,
      desc: 'Банкетный зал с обслуживанием. Меню и официанты включены.',
      amenities: ['kitchen', 'dishes', 'music', 'parking'],
      rent: 'Депозит по меню, минимальный чек 8 000 тг с человека.',
      pros: ['Ничего не нужно готовить', 'Официанты', 'Парковка'],
      cons: ['Дороже остальных', 'Минимальный чек'],
      note: 'Удобно, но дорого. Добавил как вариант для сравнения.',
      author: 'Алмас',
    },
    {
      id: 'p4', name: 'Антикафе «Облака»', interest: 'low', votes: 2,
      address: 'ул. Желтоксан, 37', district: 'Алмалинский р-н · 2.0 км',
      price: 90000, capacity: 30, x: 28, y: 64,
      desc: 'Уютное пространство почасовой оплаты. Приставки, настолки, чай.',
      amenities: ['music', 'dishes', 'lounge'],
      rent: 'Почасовая оплата, 3 500 тг/час за человека.',
      pros: ['Дёшево', 'Центр города'],
      cons: ['Маленькое', 'Нет своей кухни'],
      note: 'Запасной вариант на случай маленькой компании.',
      author: 'Дана',
    },
    {
      id: 'p5', name: 'Веранда «Парк»', interest: 'problem', votes: 4,
      address: 'Центральный парк, вход 2', district: 'Медеуский р-н · 5.3 км',
      price: 410000, capacity: 70, x: 74, y: 38,
      desc: 'Открытая веранда в парке. Красиво, но дорого и зависит от погоды.',
      amenities: ['kitchen', 'music', 'lounge', 'parking', 'noise'],
      rent: 'Аренда + обязательный кейтеринг. Предоплата 100%.',
      pros: ['Очень красиво', 'Большая площадь'],
      cons: ['Самый дорогой вариант', 'Зависит от погоды', '100% предоплата'],
      note: 'Цена улетела вверх после уточнения. Под вопросом.',
      author: 'Тимур',
    },
  ],

  collections: [
    {
      id: 'c1', title: 'Основной сбор на выпускной', status: 'active',
      deadline: '2026-06-10', planned: 1200000, approved: 940000, collected: 760000,
      itemsApproved: 9, itemsProposed: 4,
    },
    {
      id: 'c2', title: 'Декор и фотозона', status: 'locked',
      deadline: '2026-06-05', planned: 220000, approved: 198000, collected: 198000,
      itemsApproved: 6, itemsProposed: 0,
    },
    {
      id: 'c3', title: 'Подарок классному руководителю', status: 'draft',
      deadline: '2026-06-14', planned: 150000, approved: 0, collected: 0,
      itemsApproved: 0, itemsProposed: 2,
    },
  ],

  // items for collection c1
  items: [
    { id: 'i1', name: 'Аренда лофта «Высота»', cat: 'other', type: 'common', qty: 1, unit: 'шт', price: 220000, approved: true, by: 'Дана' },
    { id: 'i2', name: 'Кейтеринг — горячее', cat: 'food', type: 'common', qty: 60, unit: 'порц', price: 4200, approved: true, by: 'Алмас' },
    { id: 'i3', name: 'Кола', cat: 'drinks', type: 'common', qty: 24, unit: 'бут', price: 700, approved: true, by: 'Тимур', support: 3 },
    { id: 'i4', name: 'Сок', cat: 'drinks', type: 'common', qty: 20, unit: 'бут', price: 850, approved: true, by: 'Дана' },
    { id: 'i5', name: 'Шампанское', cat: 'drinks', type: 'alcohol', qty: 12, unit: 'бут', price: 6500, approved: true, by: 'Тимур' },
    { id: 'i6', name: 'Торт на выпускной', cat: 'food', type: 'common', qty: 1, unit: 'шт', price: 45000, approved: true, by: 'Дана' },
    { id: 'i7', name: 'DJ и аппаратура', cat: 'music', type: 'common', qty: 1, unit: 'услуга', price: 120000, approved: true, by: 'Алмас' },
    { id: 'i8', name: 'Воздушные шары', cat: 'decor', type: 'common', qty: 50, unit: 'шт', price: 350, approved: true, by: 'Аружан' },
    { id: 'i9', name: 'Одноразовая посуда', cat: 'other', type: 'common', qty: 60, unit: 'набор', price: 450, approved: true, by: 'Аружан' },
    { id: 'i10', name: 'Бенгальские огни', cat: 'decor', type: 'common', qty: 30, unit: 'шт', price: 300, approved: false, by: 'Тимур' },
    { id: 'i11', name: 'Фотограф', cat: 'other', type: 'common', qty: 1, unit: 'услуга', price: 80000, approved: false, by: 'Дана' },
    { id: 'i12', name: 'Вино красное', cat: 'drinks', type: 'alcohol', qty: 6, unit: 'бут', price: 5500, approved: false, by: 'Тимур' },
    { id: 'i13', name: 'Именная футболка', cat: 'other', type: 'individual', qty: 1, unit: 'шт', price: 3500, approved: false, by: 'Алмас' },
  ],

  // organizer: participants
  participants: [
    { id: 'u1', name: 'Алмас Серіков', participation: 'maybe', payCat: 'regular', paid: false, invoice: 0 },
    { id: 'u2', name: 'Дана Қуат', participation: 'in', payCat: 'regular', paid: true, invoice: 24500 },
    { id: 'u3', name: 'Тимур Ким', participation: 'in', payCat: 'regular', paid: false, invoice: 24500 },
    { id: 'u4', name: 'Аружан Болат', participation: 'in', payCat: 'noalco', paid: true, invoice: 18000 },
    { id: 'u5', name: 'Ержан Асан', participation: 'in', payCat: 'regular', paid: false, invoice: 24500 },
    { id: 'u6', name: 'Камила Нур', participation: 'in', payCat: 'noalco', paid: false, invoice: 18000 },
    { id: 'u7', name: 'Санжар Оспан', participation: 'out', payCat: 'exempt', paid: false, invoice: 0 },
    { id: 'u8', name: 'Аяна Маратова', participation: 'in', payCat: 'individual', paid: false, invoice: 28000 },
    { id: 'u9', name: 'Дамир Сұлтан', participation: 'none', payCat: 'regular', paid: false, invoice: 0 },
    { id: 'u10', name: 'Лаура Ким', participation: 'in', payCat: 'regular', paid: true, invoice: 24500 },
    { id: 'u11', name: 'Нурлан Абай', participation: 'maybe', payCat: 'regular', paid: false, invoice: 0 },
    { id: 'u12', name: 'Зарина Тлеу', participation: 'exempt', payCat: 'exempt', paid: false, invoice: 0 },
  ],

  // organizer payment requisites (Kaspi)
  payment: {
    phone: '+7 707 123 45 67',
    owner: 'Дана Қ.',
  },

  // current user invoice breakdown
  myInvoice: {
    total: 24500,
    common: 16000,
    alcohol: 5500,
    individual: 3000,
    deadline: '2026-06-12',
    paid: false,
    individualItems: [
      { name: 'Именная футболка', price: 3000 },
    ],
  },
};

// interest -> status color token name
window.INTEREST_COLOR = {
  low: 'gray', new: 'blue', high: 'green', debate: 'amber', problem: 'red',
};
window.PART_COLOR = {
  in: 'green', out: 'red', maybe: 'amber', none: 'gray', exempt: 'gray',
};
