import {
  Armchair,
  Bed,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CookingPot,
  CupSoda,
  ExternalLink,
  Flame,
  Heart,
  Home,
  Info,
  Lock,
  Map as MapIcon,
  MapPin,
  Minus,
  Moon,
  Music,
  ParkingCircle,
  Plus,
  Route,
  Search,
  Send,
  Settings,
  ShoppingCart,
  Star,
  Sun,
  TriangleAlert,
  User,
  Users,
  Volume2,
  Wallet,
  Waves,
  X,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

import {
  AppData,
  Collection,
  Participant,
  Place,
  PriceItem,
  data as fallbackData,
  interestColor,
  money,
  moneyShort,
  participationColor,
  StatusColor,
} from "./data";
import { getTranslator, Lang } from "./i18n";

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;
const YANDEX_SUGGEST_API_KEY = (import.meta.env.VITE_YANDEX_SUGGEST_API_KEY || YANDEX_MAPS_API_KEY) as string | undefined;
const DEFAULT_MAP_CENTER: [number, number] = [43.238949, 76.889709];
const ALMATY_BOUNDS = [
  [43.05, 76.68],
  [43.42, 77.15],
];
const KAZAKHSTAN_MARKERS = ["казахстан", "қазақстан", "kazakhstan", "kz", "алматы", "almaty", "алматинская"];
const OUT_OF_KAZAKHSTAN_MARKERS = ["россия", "russia", "москва", "moscow", "московская область"];
let yandexMapsPromise: Promise<any> | null = null;

function loadYandexMaps() {
  if (!YANDEX_MAPS_API_KEY) {
    return Promise.reject(new Error("Yandex Maps API key is not configured."));
  }
  if ((window as any).ymaps) {
    return Promise.resolve((window as any).ymaps);
  }
  if (!yandexMapsPromise) {
    yandexMapsPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("yandex-maps-script") as HTMLScriptElement | null;
      const script = existing ?? document.createElement("script");
      const suggestParam = YANDEX_SUGGEST_API_KEY ? `&suggest_apikey=${encodeURIComponent(YANDEX_SUGGEST_API_KEY)}` : "";
      script.id = "yandex-maps-script";
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}${suggestParam}&lang=ru_RU`;
      script.async = true;
      script.onload = () => (window as any).ymaps.ready(() => resolve((window as any).ymaps));
      script.onerror = () => reject(new Error("Failed to load Yandex Maps."));
      if (!existing) {
        document.head.appendChild(script);
      }
    });
  }
  return yandexMapsPromise;
}

const mapColors: Record<string, string> = {
  low: "#8a97a8",
  new: "#4f70f4",
  high: "#4ade80",
  debate: "#f6c85f",
  problem: "#ff6b72",
};

function yandexPlaceUrl(place: Place) {
  if (typeof place.lat !== "number" || typeof place.lng !== "number") {
    return "https://yandex.kz/maps/";
  }
  return `https://yandex.kz/maps/?ll=${place.lng},${place.lat}&z=16&pt=${place.lng},${place.lat},pm2rdm`;
}

function formatDigits(value: string) {
  return value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

type YandexSuggestion = {
  value: string;
  title: string;
  subtitle: string;
  address?: string;
  country?: string;
  uri?: string;
  coords?: { lat: number; lng: number };
};

function suggestText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text;
  }
  return "";
}

function getAddressComponents(item: any) {
  if (Array.isArray(item.address?.component)) {
    return item.address.component;
  }
  if (Array.isArray(item.address?.components)) {
    return item.address.components;
  }
  return [];
}

function getCountryName(item: any) {
  const country = getAddressComponents(item).find((component: any) => component?.kind === "country");
  return suggestText(country?.name) || suggestText(country?.country_code);
}

function makeApiSuggestion(item: any): YandexSuggestion {
  const title = suggestText(item.title);
  const subtitle = suggestText(item.subtitle);
  const address = suggestText(item.address?.formatted_address) || subtitle;
  const country = getCountryName(item);
  return {
    value: [title, subtitle].filter(Boolean).join(", ") || title || subtitle,
    title: title || subtitle,
    subtitle: subtitle || address || title,
    address,
    country,
    uri: typeof item.uri === "string" ? item.uri : undefined,
  };
}

function isKazakhstanSuggestion(item: YandexSuggestion) {
  const text = [item.title, item.subtitle, item.address, item.country].filter(Boolean).join(" ").toLowerCase();
  if (OUT_OF_KAZAKHSTAN_MARKERS.some((marker) => text.includes(marker))) {
    return false;
  }
  if (item.country) {
    return KAZAKHSTAN_MARKERS.some((marker) => item.country?.toLowerCase().includes(marker));
  }
  return KAZAKHSTAN_MARKERS.some((marker) => text.includes(marker));
}

function suggestionRank(item: YandexSuggestion) {
  const text = [item.title, item.subtitle, item.address].filter(Boolean).join(" ").toLowerCase();
  if (text.includes("алматы") || text.includes("almaty")) {
    return 0;
  }
  if (text.includes("алматинская")) {
    return 1;
  }
  return 2;
}

function transliterateLatinToCyrillic(value: string) {
  const lower = value.toLowerCase();
  const pairs: Array<[string, string]> = [
    ["shch", "щ"],
    ["yo", "ё"],
    ["zh", "ж"],
    ["ch", "ч"],
    ["sh", "ш"],
    ["yu", "ю"],
    ["ya", "я"],
    ["ts", "ц"],
  ];
  const letters: Record<string, string> = {
    a: "а",
    b: "б",
    c: "к",
    d: "д",
    e: "е",
    f: "ф",
    g: "г",
    h: "х",
    i: "и",
    j: "ж",
    k: "к",
    l: "л",
    m: "м",
    n: "н",
    o: "о",
    p: "п",
    q: "к",
    r: "р",
    s: "с",
    t: "т",
    u: "у",
    v: "в",
    w: "в",
    x: "кс",
    y: "ы",
    z: "з",
  };
  let result = lower;
  pairs.forEach(([from, to]) => {
    result = result.replace(new RegExp(from, "g"), to);
  });
  return result.replace(/[a-z]/g, (char) => letters[char] ?? char);
}

function getSearchVariants(query: string) {
  const trimmed = query.trim();
  const variants = [`${trimmed} Алматы Казахстан`, `${trimmed} Алматы`, `${trimmed} Казахстан`, trimmed];
  if (/^[\w\s-]+$/i.test(trimmed) && /[a-z]/i.test(trimmed)) {
    const cyrillic = transliterateLatinToCyrillic(trimmed);
    variants.push(`${cyrillic} Алматы Казахстан`, `${cyrillic} Алматы`, `${cyrillic} Казахстан`, cyrillic);
  }
  return [...new Set(variants.filter((item) => item.trim().length >= 2))];
}

function uniqueSuggestions(items: YandexSuggestion[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}|${item.subtitle}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function suggestionKey(item: YandexSuggestion, index: number) {
  const lat = item.coords?.lat ?? "";
  const lng = item.coords?.lng ?? "";
  return `${item.value}|${item.title}|${item.subtitle}|${lat}|${lng}|${index}`;
}

async function getYandexSuggestions(query: string) {
  if (query.trim().length < 2) {
    return [];
  }

  if (!YANDEX_SUGGEST_API_KEY) {
    return [];
  }

  const variants = getSearchVariants(query).slice(0, 6);
  const results = await Promise.allSettled(
    variants.map(async (variant) => {
      const params = new URLSearchParams({
        apikey: YANDEX_SUGGEST_API_KEY,
        text: variant,
        lang: "ru_RU",
        results: "8",
        print_address: "1",
        attrs: "uri",
        bbox: `${ALMATY_BOUNDS[0][1]},${ALMATY_BOUNDS[0][0]}~${ALMATY_BOUNDS[1][1]},${ALMATY_BOUNDS[1][0]}`,
        strict_bounds: "1",
      });
      const response = await fetch(`https://suggest-maps.yandex.ru/v1/suggest?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Yandex Suggest failed with HTTP ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data.results) ? data.results.map(makeApiSuggestion).filter(isKazakhstanSuggestion) : [];
    }),
  );
  return uniqueSuggestions(results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])))
    .sort((left, right) => suggestionRank(left) - suggestionRank(right))
    .slice(0, 6);
}

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    if (error.message === "scriptError") {
      return fallback;
    }
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    if (error === "scriptError") {
      return fallback;
    }
    return error;
  }
  if (error && typeof error === "object") {
    const message = "message" in error ? error.message : null;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

function getStoredThemePreference(): ThemePreference {
  const stored = localStorage.getItem("vyp_theme");
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

type ThemePreference = "system" | "light" | "dark";
type Role = "participant" | "organizer";
type Tab = "home" | "places" | "collections" | "participants" | "profile";
type ScreenName =
  | "home"
  | "confirm"
  | "places"
  | "place"
  | "addplace"
  | "collections"
  | "createcollection"
  | "collection"
  | "additem"
  | "invoice"
  | "participants"
  | "participant"
  | "finalize"
  | "profile"
  | "states";

type StackEntry = { name: ScreenName; params?: Record<string, string> };
type ToastState = { id: number; text: string; icon?: string } | null;

type Ctx = {
  data: AppData;
  t: (key: string) => string;
  lang: Lang;
  role: Role;
  setRole: (role: Role) => void;
  themePref: ThemePreference;
  setThemePref: (theme: ThemePreference) => void;
  setLang: (lang: Lang) => void;
  notif: boolean;
  setNotif: (value: boolean) => void;
  participation: string;
  setParticipation: (status: string) => void;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  nav: {
    setTab: (tab: Tab) => void;
    push: (name: ScreenName, params?: Record<string, string>) => void;
    pop: () => void;
  };
  toast: (text: string, icon?: string) => void;
  fmtDate: (iso: string) => string;
  daysLeft: (iso: string) => number;
  finishOnboarding: () => void;
  replayOnboarding: () => void;
  createCollection: (payload: { title: string; description?: string; targetAmount: number; deadlineDays: number }) => Promise<unknown>;
  isCreatingCollection: boolean;
  createItem: (payload: { title: string; category: string; quantity: number; unit: string; unitPrice: number; itemType: string; comment?: string; storeUrl?: string }) => Promise<unknown>;
  isCreatingItem: boolean;
  createPlace: (payload: { title: string; address: string; yandexUri?: string; latitude?: number; longitude?: number; estimatedPrice: number; capacity: number; description?: string; amenities: string[]; authorComment?: string }) => Promise<unknown>;
  isCreatingPlace: boolean;
  supportPlace: (placeId: string) => Promise<unknown>;
  joinGroup: (code: string) => Promise<unknown>;
  isJoiningGroup: boolean;
};

const ROOT: Record<Tab, ScreenName> = {
  home: "home",
  places: "places",
  collections: "collections",
  participants: "participants",
  profile: "profile",
};

const MONTHS: Record<Lang, string[]> = {
  ru: ["янв", "фев", "мар", "апр", "мая", "июня", "июля", "авг", "сен", "окт", "ноя", "дек"],
  kk: ["қаң", "ақп", "нау", "сәу", "мам", "мау", "шіл", "там", "қыр", "қаз", "қар", "жел"],
};

const interestKeys: Record<string, string> = {
  low: "int_low",
  new: "int_new",
  high: "int_high",
  debate: "int_debate",
  problem: "int_problem",
};

const collectionStatus: Record<string, { k: string; c: StatusColor }> = {
  draft: { k: "st_draft", c: "gray" },
  active: { k: "st_active", c: "green" },
  locked: { k: "st_locked", c: "amber" },
  done: { k: "st_done", c: "blue" },
  cancelled: { k: "st_cancelled", c: "red" },
};

const itemType: Record<string, { k: string; c: StatusColor }> = {
  common: { k: "type_common", c: "blue" },
  alcohol: { k: "type_alcohol", c: "red" },
  individual: { k: "type_individual", c: "amber" },
  group: { k: "type_group", c: "gray" },
};

const partLabel: Record<string, string> = {
  in: "f_in",
  out: "f_out",
  maybe: "f_maybe",
  none: "f_none",
  exempt: "cat_exempt",
};

const payCats: Record<string, { k: string; c: StatusColor }> = {
  regular: { k: "cat_regular", c: "blue" },
  noalco: { k: "cat_noalco", c: "green" },
  individual: { k: "cat_individual", c: "amber" },
  exempt: { k: "cat_exempt", c: "gray" },
};

const cats = ["food", "drinks", "decor", "music", "other"];
const amenityList = ["kitchen", "grill", "music", "beds", "parking", "dishes", "pool", "lounge", "noise", "deposit"];

const iconMap = {
  home: Home,
  map: MapIcon,
  cart: ShoppingCart,
  users: Users,
  user: User,
  plus: Plus,
  check: Check,
  chevronR: ChevronRight,
  chevronL: ChevronLeft,
  route: Route,
  heart: Heart,
  x: X,
  clock: Clock,
  warn: TriangleAlert,
  wallet: Wallet,
  search: Search,
  bell: Bell,
  sun: Sun,
  moon: Moon,
  gear: Settings,
  info: Info,
  arrowUR: ExternalLink,
  lock: Lock,
  star: Star,
  pin: MapPin,
  kitchen: CookingPot,
  grill: Flame,
  music: Music,
  beds: Bed,
  parking: ParkingCircle,
  dishes: CupSoda,
  pool: Waves,
  lounge: Armchair,
  noise: Volume2,
  deposit: CircleDollarSign,
  send: Send,
  minus: Minus,
};

function Icon({ name, size = 22, stroke = 1.8, className, style }: { name: string; size?: number; stroke?: number; className?: string; style?: React.CSSProperties }) {
  const Component = iconMap[name as keyof typeof iconMap] ?? Info;
  return <Component size={size} strokeWidth={stroke} className={className} style={style} />;
}

type DesignAppProps = {
  initialData?: AppData;
  dataSource?: "api" | "fallback";
  isLoading?: boolean;
  onCreateCollection?: (payload: { title: string; description?: string; targetAmount: number; deadlineDays: number }) => Promise<unknown>;
  isCreatingCollection?: boolean;
  onCreateItem?: (payload: { title: string; category: string; quantity: number; unit: string; unitPrice: number; itemType: string; comment?: string; storeUrl?: string }) => Promise<unknown>;
  isCreatingItem?: boolean;
  onCreatePlace?: (payload: { title: string; address: string; yandexUri?: string; latitude?: number; longitude?: number; estimatedPrice: number; capacity: number; description?: string; amenities: string[]; authorComment?: string }) => Promise<unknown>;
  isCreatingPlace?: boolean;
  onSupportPlace?: (placeId: string) => Promise<unknown>;
  onJoinGroup?: (code: string) => Promise<unknown>;
  isJoiningGroup?: boolean;
};

export function DesignApp({
  initialData = fallbackData,
  dataSource = "fallback",
  isLoading = false,
  onCreateCollection = async () => undefined,
  isCreatingCollection = false,
  onCreateItem = async () => undefined,
  isCreatingItem = false,
  onCreatePlace = async () => undefined,
  isCreatingPlace = false,
  onSupportPlace = async () => undefined,
  onJoinGroup = async () => undefined,
  isJoiningGroup = false,
}: DesignAppProps) {
  const appData = initialData;
  const backendRole: Role = appData.me.role === "organizer" ? "organizer" : "participant";
  const [themePref, setThemePrefState] = useState<ThemePreference>(getStoredThemePreference);
  const [lang, setLang] = useState<Lang>("ru");
  const [role, setRole] = useState<Role>(backendRole);
  const [notif, setNotif] = useState(true);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("vyp_ob") === "1");
  const [participation, setParticipation] = useState<string>(appData.me.participation);
  const [participants, setParticipants] = useState<Participant[]>(() => appData.participants.map((participant) => ({ ...participant })));
  const [toast, setToast] = useState<ToastState>(null);
  const toastRef = useRef(0);
  const [nav, setNav] = useState<{ tab: Tab; stacks: Record<Tab, StackEntry[]> }>({
    tab: "home",
    stacks: {
      home: [{ name: "home" }],
      places: [{ name: "places" }],
      collections: [{ name: "collections" }],
      participants: [{ name: "participants" }],
      profile: [{ name: "profile" }],
    },
  });

  const t = useMemo(() => getTranslator(lang), [lang]);
  const resolvedTheme = themePref === "system" ? window.Telegram?.WebApp.colorScheme ?? "light" : themePref;
  const setThemePref = (theme: ThemePreference) => {
    localStorage.setItem("vyp_theme", theme);
    setThemePrefState(theme);
  };

  useEffect(() => {
    setParticipation(appData.me.participation);
    setParticipants(appData.participants.map((participant) => ({ ...participant })));
    setRole(backendRole);
  }, [appData, backendRole]);

  const navApi = useMemo(
    () => ({
      setTab: (tab: Tab) =>
        setNav((state) =>
          state.tab === tab
            ? { ...state, stacks: { ...state.stacks, [tab]: [{ name: ROOT[tab] }] } }
            : { ...state, tab },
        ),
      push: (name: ScreenName, params?: Record<string, string>) =>
        setNav((state) => ({
          ...state,
          stacks: { ...state.stacks, [state.tab]: [...state.stacks[state.tab], { name, params }] },
        })),
      pop: () =>
        setNav((state) => {
          const stack = state.stacks[state.tab];
          return stack.length <= 1 ? state : { ...state, stacks: { ...state.stacks, [state.tab]: stack.slice(0, -1) } };
        }),
    }),
    [],
  );

  const showToast = (text: string, icon?: string) => {
    const id = ++toastRef.current;
    setToast({ id, text, icon });
    window.setTimeout(() => setToast((current) => (current?.id === id ? null : current)), 1900);
  };

  const ctx: Ctx = {
    data: appData,
    t,
    lang,
    role,
    setRole,
    themePref,
    setThemePref,
    setLang,
    notif,
    setNotif,
    participation,
    setParticipation,
    participants,
    setParticipants,
    nav: navApi,
    toast: showToast,
    fmtDate: (iso) => {
      const date = new Date(iso);
      return `${date.getDate()} ${MONTHS[lang][date.getMonth()]}`;
    },
    daysLeft: (iso) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86400000)),
    finishOnboarding: () => {
      localStorage.setItem("vyp_ob", "1");
      setOnboarded(true);
    },
    replayOnboarding: () => {
      localStorage.removeItem("vyp_ob");
      setOnboarded(false);
    },
    createCollection: onCreateCollection,
    isCreatingCollection,
    createItem: onCreateItem,
    isCreatingItem,
    createPlace: onCreatePlace,
    isCreatingPlace,
    supportPlace: onSupportPlace,
    joinGroup: onJoinGroup,
    isJoiningGroup,
  };

  const stack = nav.stacks[nav.tab];
  const current = stack[stack.length - 1];
  const isRoot = stack.length === 1;
  const [title, subtitle] = isLoading ? [t("loading")] : getTitle(current, ctx);

  return (
    <div className="design-root">
      <div className="app" data-theme={resolvedTheme}>
        {!onboarded ? (
          <Onboarding ctx={ctx} />
        ) : (
          <>
            <TopBar
              title={title}
              subtitle={subtitle}
              onBack={isRoot ? undefined : navApi.pop}
              right={
                isRoot && nav.tab === "home" ? (
                  <span className="pill-info" onClick={() => navApi.setTab("profile")}>
                    {role === "organizer" ? t("role_organizer") : t("role_participant")}
                  </span>
                ) : undefined
              }
            />
            {isLoading ? <AppSkeleton /> : appData.needsGroupCode ? <JoinGroupScreen ctx={ctx} /> : <ScreenSwitch current={current} ctx={ctx} />}
            {!appData.needsGroupCode && <BottomNav tab={nav.tab} onTab={navApi.setTab} t={t} isOrg={role === "organizer"} />}
          </>
        )}
        <Toast toast={toast} />
      </div>
    </div>
  );
}

function getTitle(current: StackEntry, ctx: Ctx): [string, string?] {
  const { t } = ctx;
  switch (current.name) {
    case "home":
      return [t("nav_home"), ctx.data.event.dateLabel];
    case "confirm":
      return [t("confirm_participation")];
    case "places":
      return [t("nav_places")];
    case "place":
      return [ctx.data.places.find((place) => place.id === current.params?.id)?.name ?? t("nav_places")];
    case "addplace":
      return [t("add_place")];
    case "collections":
      return [t("nav_collections")];
    case "createcollection":
      return [t("create_collection")];
    case "collection":
      return [ctx.data.collections.find((collection) => collection.id === current.params?.id)?.title ?? t("nav_collections")];
    case "additem":
      return [t("add_item")];
    case "invoice":
      return [t("invoice")];
    case "participants":
      return [t("nav_participants"), ctx.role === "organizer" ? t("organizer_panel") : undefined];
    case "participant":
      return [ctx.participants.find((participant) => participant.id === current.params?.id)?.name ?? t("nav_participants")];
    case "finalize":
      return [t("final_calc")];
    case "profile":
      return [t("nav_profile")];
    case "states":
      return [t("ui_states")];
    default:
      return [""];
  }
}

function ScreenSwitch({ current, ctx }: { current: StackEntry; ctx: Ctx }) {
  switch (current.name) {
    case "home":
      return <HomeScreen ctx={ctx} />;
    case "confirm":
      return <ConfirmScreen ctx={ctx} />;
    case "places":
      return <PlacesScreen ctx={ctx} />;
    case "place":
      return <PlaceScreen ctx={ctx} id={current.params?.id} />;
    case "addplace":
      return <AddPlaceScreen ctx={ctx} />;
    case "collections":
      return <CollectionsScreen ctx={ctx} />;
    case "createcollection":
      return <CreateCollectionScreen ctx={ctx} />;
    case "collection":
      return <CollectionScreen ctx={ctx} id={current.params?.id} />;
    case "additem":
      return <AddItemScreen ctx={ctx} />;
    case "invoice":
      return <InvoiceScreen ctx={ctx} />;
    case "participants":
      return <ParticipantsScreen ctx={ctx} />;
    case "participant":
      return <ParticipantScreen ctx={ctx} id={current.params?.id} />;
    case "finalize":
      return <FinalizeScreen ctx={ctx} />;
    case "profile":
      return <ProfileScreen ctx={ctx} />;
    case "states":
      return <StatesScreen ctx={ctx} />;
    default:
      return null;
  }
}

function Onboarding({ ctx }: { ctx: Ctx }) {
  const [index, setIndex] = useState(0);
  const slides = [
    { icon: "star", title: ctx.t("ob1_t"), text: ctx.t("ob1_s"), color: "var(--accent)" },
    { icon: "pin", title: ctx.t("ob2_t"), text: ctx.t("ob2_s"), color: "var(--st-green)" },
    { icon: "wallet", title: ctx.t("ob3_t"), text: ctx.t("ob3_s"), color: "var(--st-amber)" },
  ];
  const slide = slides[index];
  const last = index === slides.length - 1;

  return (
    <div className="ob">
      <div className="ob-skip">{!last && <button className="btn btn-ghost btn-sm" onClick={ctx.finishOnboarding}>{ctx.t("skip")}</button>}</div>
      <div className="ob-art">
        <div className="ob-art-box" style={{ "--ob-color": slide.color } as React.CSSProperties}>
          <div className="ob-art-icon"><Icon name={slide.icon} size={64} stroke={1.8} /></div>
        </div>
      </div>
      <div>
        <div className="ob-title">{slide.title}</div>
        <div className="ob-sub">{slide.text}</div>
        <div className="ob-dots">{slides.map((_, itemIndex) => <div key={itemIndex} className={`ob-dot${itemIndex === index ? " on" : ""}`} />)}</div>
        <Btn full onClick={() => (last ? ctx.finishOnboarding() : setIndex(index + 1))}>{last ? ctx.t("get_started") : ctx.t("next")}</Btn>
      </div>
    </div>
  );
}

function HomeScreen({ ctx }: { ctx: Ctx }) {
  const col = ctx.data.collections[0];
  const top = [...ctx.data.places].sort((a, b) => b.votes - a.votes)[0];
  const days = col ? ctx.daysLeft(col.deadline) : 0;
  const inCount = ctx.data.participants.filter((participant) => participant.participation === "in").length;
  const isOrg = ctx.role === "organizer";
  const canOpenCollection = isOrg || ctx.participation === "in";
  const emptyCollectionsText =
    ctx.role === "organizer"
      ? "Сборов еще нет. Создайте первый сбор и добавьте товары."
      : "Организатор еще не создал активный сбор.";

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        <Card className="event-hero">
          <div className="row-between">
            <div className="event-school">{ctx.data.event.school}</div>
            <span className="pill-info pill-info-soft"><Icon name="clock" size={14} stroke={2} />{ctx.data.event.dateLabel}</span>
          </div>
          <div className="event-title">{ctx.data.event.title}</div>
          <div className="event-stats">
            <div><div className="num">{inCount}</div><span>{ctx.t("f_in")}</span></div>
            <i />
            <div><div className="num">{days}</div><span>{ctx.t("days_left")}</span></div>
          </div>
        </Card>
        {isOrg ? (
          <Card onClick={() => ctx.nav.setTab("participants")}>
            <div className="row-between">
              <div className="row">
                <div className="icon-tile"><Icon name="users" size={22} stroke={2.2} /></div>
                <div>
                  <div className="muted">{ctx.t("organizer_panel")}</div>
                  <Badge color="green">{inCount} {ctx.t("f_in").toLowerCase()}</Badge>
                </div>
              </div>
              <Icon name="chevronR" className="lrow-chev" />
            </div>
          </Card>
        ) : (
          <Card onClick={() => ctx.nav.push("confirm")}>
            <div className="row-between">
              <div className="row">
                <div className="icon-tile"><Icon name="check" size={22} stroke={2.2} /></div>
                <div>
                  <div className="muted">{ctx.t("your_status")}</div>
                  <Badge color={participationColor[ctx.participation]}>{ctx.t(partLabel[ctx.participation])}</Badge>
                </div>
              </div>
              <Icon name="chevronR" className="lrow-chev" />
            </div>
          </Card>
        )}
        <SectionLabel>{ctx.t("active_collection")}</SectionLabel>
        {col ? (
          <Card onClick={() => { ctx.nav.setTab("collections"); ctx.nav.push("collection", { id: col.id }); }}>
            <div className="row-between section-space"><b>{col.title}</b><Badge color="green">{ctx.t("st_active")}</Badge></div>
            <BudgetProgress collected={col.collected} planned={col.planned} approved={col.approved} t={ctx.t} />
            {days <= 14 && <Notice tone="warn" icon="clock">{ctx.t("deadline")}: {ctx.fmtDate(col.deadline)} · {days} {ctx.t("days_left")}</Notice>}
          </Card>
        ) : (
          <StateView icon="cart" title={ctx.t("empty_title")} sub={emptyCollectionsText} />
        )}
        <SectionLabel action={<button className="btn btn-ghost btn-sm" onClick={() => ctx.nav.setTab("places")}>{ctx.t("all")}</button>}>{ctx.t("top_place")}</SectionLabel>
        {top ? <PlaceListCard place={top} ctx={ctx} compact /> : <StateView icon="pin" title={ctx.t("empty_places")} sub={ctx.t("empty_places_sub")} />}
        <SectionLabel>{ctx.t("quick_actions")}</SectionLabel>
        <div className="quick-grid">
          {isOrg ? (
            <QuickAction icon="plus" label={ctx.t("create_collection")} c="green" onClick={() => { ctx.nav.setTab("collections"); ctx.nav.push("createcollection"); }} />
          ) : (
            <QuickAction icon="check" label={ctx.t("confirm_participation")} c="green" onClick={() => ctx.nav.push("confirm")} />
          )}
          {canOpenCollection && <QuickAction icon="wallet" label={ctx.t("open_collection")} c="blue" onClick={() => { ctx.nav.setTab("collections"); if (col) ctx.nav.push("collection", { id: col.id }); }} />}
          <QuickAction icon="map" label={ctx.t("open_map")} c="amber" onClick={() => ctx.nav.setTab("places")} />
          {isOrg ? (
            <QuickAction icon="users" label={ctx.t("nav_participants")} c="accent" onClick={() => ctx.nav.setTab("participants")} />
          ) : (
            <QuickAction icon="plus" label={ctx.t("suggest_place")} c="accent" onClick={() => { ctx.nav.setTab("places"); ctx.nav.push("addplace"); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmScreen({ ctx }: { ctx: Ctx }) {
  const [selected, setSelected] = useState(ctx.participation);
  const options = [
    { key: "in", label: ctx.t("part_in"), c: "green", desc: "Получите счет и все обновления" },
    { key: "maybe", label: ctx.t("part_maybe"), c: "amber", desc: "Напомним ближе к дедлайну" },
    { key: "out", label: ctx.t("part_out"), c: "red", desc: "Счет не придет" },
    { key: "none", label: ctx.t("part_none"), c: "gray", desc: "Можно решить позже" },
  ];
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad gap12">
        <Notice tone="info" icon="info">{ctx.t("invoices_only_in")}</Notice>
        {options.map((option) => (
          <button key={option.key} className={`select-card${selected === option.key ? " selected" : ""}`} onClick={() => setSelected(option.key)}>
            <span className="radio-dot" />
            <span className="spread"><b>{option.label}</b><small>{option.desc}</small></span>
            <span className="badge-dot" style={{ background: `var(--st-${option.c})` }} />
          </button>
        ))}
      </div>
      <BottomAction><Btn full onClick={() => { ctx.setParticipation(selected); ctx.toast(ctx.t("toast_status")); ctx.nav.pop(); }}>{ctx.t("confirm")}</Btn></BottomAction>
    </div>
  );
}

function JoinGroupScreen({ ctx }: { ctx: Ctx }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Введите код группы");
      return;
    }
    try {
      setError(null);
      await ctx.joinGroup(normalized);
      ctx.toast("Группа подключена", "check");
    } catch (joinError) {
      setError(getErrorText(joinError, "Не удалось подключиться к группе"));
    }
  };

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        <StateView icon="lock" title="Введите код группы" sub="Попросите код у организатора выпускного. После подключения откроются событие, места и сборы." />
        <Field label="Код группы" error={error}>
          <Input value={code} onChange={(value) => { setCode(value.toUpperCase()); setError(null); }} placeholder="Например, A1B2C3D4" />
        </Field>
        <Btn full disabled={ctx.isJoiningGroup} onClick={submit}>{ctx.isJoiningGroup ? ctx.t("loading") : "Подключиться"}</Btn>
      </div>
    </div>
  );
}

function PlacesScreen({ ctx }: { ctx: Ctx }) {
  const [view, setView] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 800);
    return () => window.clearTimeout(timer);
  }, [view]);
  const filtered = ctx.data.places.filter((place) => filter === "all" || place.interest === filter);
  const selectedPlace = ctx.data.places.find((place) => place.id === selected);
  const filters = <FilterChips filter={filter} setFilter={setFilter} ctx={ctx} />;

  return (
    <div className="screen-anim full-screen">
      <div className="view-toggle"><div className="seg"><button className={view === "map" ? "on" : ""} onClick={() => setView("map")}>{ctx.t("map")}</button><button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>{ctx.t("list")}</button></div></div>
      {view === "map" ? (
        <div className="map-wrap">
          <YandexPlacesMap places={filtered} totalPlaces={ctx.data.places.length} selected={selected} onSelect={setSelected} t={ctx.t} />
          <div className="map-filters">{filters}</div>
          <button className="btn btn-primary map-fab" onClick={() => ctx.nav.push("addplace")}><Icon name="plus" size={20} stroke={2.4} />{ctx.t("add_place")}</button>
          {selectedPlace && <MapSheet place={selectedPlace} ctx={ctx} onClose={() => setSelected(null)} />}
          {loading && <MapLoading t={ctx.t} />}
        </div>
      ) : (
        <div className="scroll">
          {filters}
          <div className="screen-pad gap12">
            {filtered.length ? filtered.map((place) => <PlaceListCard key={place.id} place={place} ctx={ctx} />) : <StateView icon="pin" title={ctx.t("empty_places")} sub={ctx.t("empty_places_sub")} action={<Btn full variant="secondary" onClick={() => setFilter("all")}>{ctx.t("reset_filters")}</Btn>} />}
          </div>
        </div>
      )}
    </div>
  );
}

function YandexPlacesMap({ places, totalPlaces, selected, onSelect, t }: { places: Place[]; totalPlaces: number; selected: string | null; onSelect: (id: string) => void; t: (key: string) => string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [resolvedCoords, setResolvedCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing-key">(
    YANDEX_MAPS_API_KEY ? "loading" : "missing-key",
  );
  const [showEmptyNotice, setShowEmptyNotice] = useState(totalPlaces === 0);
  const [showNoCoordsNotice, setShowNoCoordsNotice] = useState(false);
  const mappedPlaces = places
    .map((place) => {
      const coords = typeof place.lat === "number" && typeof place.lng === "number" ? { lat: place.lat, lng: place.lng } : resolvedCoords[place.id];
      return coords ? { ...place, lat: coords.lat, lng: coords.lng } : place;
    })
    .filter((place) => typeof place.lat === "number" && typeof place.lng === "number");
  const placesKey = mappedPlaces.map((place) => `${place.id}:${place.lat}:${place.lng}:${place.interest}:${place.votes}`).join("|");

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY) {
      return;
    }

    const missingPlaces = places.filter(
      (place) =>
        (typeof place.lat !== "number" || typeof place.lng !== "number") &&
        !resolvedCoords[place.id] &&
        (place.address || place.name),
    );
    if (!missingPlaces.length) {
      return;
    }

    let cancelled = false;
    loadYandexMaps()
      .then(async (ymaps) => {
        const entries = await Promise.all(
          missingPlaces.map(async (place) => {
            const query = [place.name, place.address].filter(Boolean).join(", ");
            const result = await ymaps.geocode(query, { results: 1, boundedBy: ALMATY_BOUNDS });
            const geoObject = result.geoObjects.get(0);
            if (!geoObject) {
              return null;
            }
            const [lat, lng] = geoObject.geometry.getCoordinates();
            return [place.id, { lat: Number(lat), lng: Number(lng) }] as const;
          }),
        );
        if (cancelled) {
          return;
        }
        setResolvedCoords((state) => {
          const next = { ...state };
          let changed = false;
          entries.forEach((entry) => {
            if (entry) {
              next[entry[0]] = entry[1];
              changed = true;
            }
          });
          return changed ? next : state;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [places, resolvedCoords]);

  useEffect(() => {
    if (totalPlaces !== 0) {
      setShowEmptyNotice(false);
      return;
    }

    setShowEmptyNotice(true);
    const timer = window.setTimeout(() => setShowEmptyNotice(false), 3200);
    return () => window.clearTimeout(timer);
  }, [totalPlaces]);

  useEffect(() => {
    if (status !== "ready" || places.length === 0 || mappedPlaces.length > 0) {
      setShowNoCoordsNotice(false);
      return;
    }

    setShowNoCoordsNotice(true);
    const timer = window.setTimeout(() => setShowNoCoordsNotice(false), 4200);
    return () => window.clearTimeout(timer);
  }, [status, places.length, mappedPlaces.length]);

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY) {
      setStatus("missing-key");
      return;
    }
    if (!containerRef.current) {
      return;
    }

    let cancelled = false;
    setStatus("loading");
    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const center = mappedPlaces[0] ? [mappedPlaces[0].lat, mappedPlaces[0].lng] : DEFAULT_MAP_CENTER;
        if (!mapRef.current) {
          mapRef.current = new ymaps.Map(
            containerRef.current,
            {
              center,
              zoom: mappedPlaces.length ? 12 : 10,
              controls: ["zoomControl", "geolocationControl"],
            },
            { suppressMapOpenBlock: true },
          );
        }

        const map = mapRef.current;
        map.geoObjects.removeAll();
        mappedPlaces.forEach((place) => {
          const placemark = new ymaps.Placemark(
            [place.lat, place.lng],
            {
              hintContent: place.name,
              balloonContentHeader: place.name,
              balloonContentBody: `${place.address || place.district}<br/>${money(place.price)}`,
            },
            {
              preset: "islands#circleDotIcon",
              iconColor: mapColors[place.interest] ?? mapColors.new,
            },
          );
          placemark.events.add("click", () => onSelect(place.id));
          map.geoObjects.add(placemark);
        });

        const active = mappedPlaces.find((place) => place.id === selected);
        if (active) {
          map.panTo([active.lat, active.lng], { duration: 250 });
        } else if (mappedPlaces.length > 1) {
          map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 48 });
        } else if (mappedPlaces[0]) {
          map.setCenter([mappedPlaces[0].lat, mappedPlaces[0].lng], 12);
        }
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [placesKey, selected]);

  return (
    <div className="map">
      <div ref={containerRef} className="yandex-map" />
      {status === "missing-key" && <MapMessage icon="lock" title="Yandex Maps не настроен" text="Добавьте ключ в VITE_YANDEX_MAPS_API_KEY и перезапустите frontend." />}
      {status === "error" && <MapMessage icon="warn" title="Карта не загрузилась" text="Проверьте ключ Yandex Maps и доступ к api-maps.yandex.ru." />}
      {status === "ready" && totalPlaces === 0 && showEmptyNotice && <MapMessage icon="pin" title="Мест пока нет" text="Добавьте первое место, и оно появится на карте." />}
      {status === "ready" && totalPlaces > 0 && places.length === 0 && <MapMessage icon="pin" title={t("empty_places")} text={t("empty_places_sub")} />}
      {status === "ready" && places.length > 0 && mappedPlaces.length === 0 && showNoCoordsNotice && <MapMessage icon="pin" title="Нет координат" text="У этих мест не заполнены latitude/longitude в админке." />}
    </div>
  );
}

function MapMessage({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="map-message"><Icon name={icon} size={28} /><b>{title}</b><span>{text}</span></div>;
}

function SuggestList({ items, onSelect, powered }: { items: YandexSuggestion[]; onSelect: (item: YandexSuggestion) => void; powered: string }) {
  return <div className="suggest-list">{items.map((item, index) => <button key={suggestionKey(item, index)} className="suggest-item" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(item)}><Icon name="pin" /><span><b>{item.title}</b><small>{item.subtitle}</small></span></button>)}<div className="suggest-powered"><Icon name="pin" size={12} />{powered}</div></div>;
}

function SuggestEmpty({ text }: { text: string }) {
  return <div className="suggest-list suggest-empty"><Icon name="warn" size={16} /><span>{text}</span></div>;
}

function PlaceScreen({ ctx, id }: { ctx: Ctx; id?: string }) {
  const place = ctx.data.places.find((item) => item.id === id) ?? ctx.data.places[0];
  if (!place) {
    return <StateView icon="pin" title={ctx.t("empty_places")} sub={ctx.t("empty_places_sub")} />;
  }
  const hasDescription = Boolean(place.desc?.trim());
  const amenities = place.amenities.filter(Boolean);
  const hasAmenities = amenities.length > 0;
  const hasRent = Boolean(place.rent?.trim());
  const pros = place.pros.filter((item) => item.trim());
  const cons = place.cons.filter((item) => item.trim());
  const hasProsCons = pros.length > 0 || cons.length > 0;
  const hasAuthorComment = Boolean(place.author?.trim() || place.note?.trim());
  const [supported, setSupported] = useState(Boolean(place.supported));
  const [optimisticVote, setOptimisticVote] = useState(false);
  const [supporting, setSupporting] = useState(false);
  const voteBaseRef = useRef({ placeId: place.id, votes: place.votes });
  if (voteBaseRef.current.placeId !== place.id) {
    voteBaseRef.current = { placeId: place.id, votes: place.votes };
  }
  useEffect(() => {
    setSupported(Boolean(place.supported));
    setOptimisticVote(false);
    voteBaseRef.current = { placeId: place.id, votes: place.votes };
  }, [place.id, place.supported, place.votes]);
  useEffect(() => {
    if (optimisticVote && place.votes >= voteBaseRef.current.votes + 1) {
      setOptimisticVote(false);
      voteBaseRef.current = { placeId: place.id, votes: place.votes };
    }
  }, [optimisticVote, place.id, place.votes]);
  const support = async () => {
    if (supported || supporting) {
      ctx.toast(ctx.t("supported"), "check");
      return;
    }
    setSupported(true);
    setOptimisticVote(true);
    setSupporting(true);
    try {
      const result = (await ctx.supportPlace(place.id)) as { created?: boolean; votes_count?: number } | undefined;
      if (result?.created === false || typeof result?.votes_count === "number") {
        setOptimisticVote(false);
        voteBaseRef.current = { placeId: place.id, votes: result.votes_count ?? place.votes };
      }
      ctx.toast(ctx.t("toast_supported"), "heart");
    } catch (error) {
      console.error("Place support failed", error);
      setSupported(false);
      setOptimisticVote(false);
      ctx.toast(getErrorText(error, "Не удалось засчитать голос"), "warn");
    } finally {
      setSupporting(false);
    }
  };
  return (
    <div className="scroll screen-anim">
      <div className="ph hero-photo">фото / галерея места</div>
      <div className="screen-pad stack">
        <div>
          <div className="row-between top-align"><h1 className="detail-title">{place.name}</h1><Badge color={interestColor[place.interest]}>{ctx.t(interestKeys[place.interest])}</Badge></div>
          <p className="muted row"><Icon name="pin" size={15} stroke={2} />{place.address}</p>
          <p className="hint indent">{place.district}</p>
        </div>
        <div className="stat-row"><StatBox label={ctx.t("price_approx")} value={money(place.price)} /><StatBox label={ctx.t("capacity")} value={`${place.capacity} ${ctx.t("people")}`} /><StatBox label={ctx.t("votes")} value={place.votes + (optimisticVote ? 1 : 0)} c="green" icon="heart" /></div>
        {hasDescription && <Card><p className="muted paragraph">{place.desc}</p></Card>}
        {hasAmenities && <><SectionLabel>{ctx.t("whats_there")}</SectionLabel><div className="amen-grid">{amenities.map((amenity) => <div key={amenity} className="amen"><Icon name={amenity} size={19} />{ctx.t(`am_${amenity}`)}</div>)}</div></>}
        {hasRent && <><SectionLabel>{ctx.t("rent_terms")}</SectionLabel><Card><p>{place.rent}</p></Card></>}
        {hasProsCons && <div className="two-col">
          {pros.length > 0 && <Card className="tone-top-green"><b>{ctx.t("pros")}</b>{pros.map((item) => <p key={item}>{item}</p>)}</Card>}
          {cons.length > 0 && <Card className="tone-top-red"><b>{ctx.t("cons")}</b>{cons.map((item) => <p key={item}>{item}</p>)}</Card>}
        </div>}
        {hasAuthorComment && <><SectionLabel>{ctx.t("author_note")}</SectionLabel><Card><div className="row top-align">{place.author && <Avatar name={place.author} />}<div className="author-comment">{place.author && <b>{place.author}</b>}{place.note && <p className="muted paragraph">{place.note}</p>}</div></div></Card></>}
        <button className="btn btn-ghost btn-sm center-self" onClick={() => ctx.nav.push("addplace")}><Icon name="plus" size={16} />{ctx.t("suggest_other")}</button>
      </div>
      <BottomAction><div className="row"><Btn variant="secondary" icon="route" onClick={() => window.open(yandexPlaceUrl(place), "_blank", "noopener,noreferrer")}>{ctx.t("route")}</Btn><Btn full variant={supported ? "tinted" : "primary"} icon={supported ? "check" : "heart"} disabled={supporting} onClick={support}>{supported ? ctx.t("supported") : ctx.t("support")}</Btn></div></BottomAction>
    </div>
  );
}

function AddPlaceScreen({ ctx }: { ctx: Ctx }) {
  const [form, setForm] = useState({ name: "", address: "", yandexUri: "", coords: null as null | { lat: number; lng: number }, price: "", capacity: "", desc: "", amen: [] as string[], note: "" });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [focusedSuggest, setFocusedSuggest] = useState<"name" | "address" | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<YandexSuggestion[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<YandexSuggestion[]>([]);
  const [nameSuggestLoading, setNameSuggestLoading] = useState(false);
  const [addressSuggestLoading, setAddressSuggestLoading] = useState(false);
  const [nameSuggestTouched, setNameSuggestTouched] = useState(false);
  const [addressSuggestTouched, setAddressSuggestTouched] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const set = (key: keyof typeof form, value: unknown) => setForm((state) => ({ ...state, [key]: value }));
  const applyNameSuggestion = (suggestion: YandexSuggestion) => {
    setFocusedSuggest(null);
    const fallbackAddress = suggestion.address || suggestion.subtitle || suggestion.value;
    setForm((state) => ({
      ...state,
      name: suggestion.title,
      address: fallbackAddress,
      yandexUri: suggestion.uri ?? "",
      coords: suggestion.coords ?? state.coords,
    }));
    setErrors((state) => ({ ...state, name: null, address: null }));
  };
  const applyAddressSuggestion = (suggestion: YandexSuggestion) => {
    setFocusedSuggest(null);
    const fallbackAddress = suggestion.address || suggestion.subtitle || suggestion.value;
    setForm((state) => ({
      ...state,
      address: fallbackAddress,
      yandexUri: suggestion.uri ?? "",
      coords: suggestion.coords ?? state.coords,
    }));
    setErrors((state) => ({ ...state, address: null }));
  };

  useEffect(() => {
    let cancelled = false;
    const query = form.name.trim();
    if (query.length < 2) {
      setNameSuggestions([]);
      setNameSuggestLoading(false);
      setNameSuggestTouched(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setNameSuggestLoading(true);
      getYandexSuggestions(query)
        .then((items) => {
          if (!cancelled) {
            setNameSuggestions(items);
            setNameSuggestTouched(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setNameSuggestions([]);
            setNameSuggestTouched(true);
          }
        })
        .finally(() => {
          if (!cancelled) setNameSuggestLoading(false);
        });
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.name]);

  useEffect(() => {
    let cancelled = false;
    const query = form.address.trim();
    if (query.length < 2) {
      setAddressSuggestions([]);
      setAddressSuggestLoading(false);
      setAddressSuggestTouched(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setAddressSuggestLoading(true);
      getYandexSuggestions(query)
        .then((items) => {
          if (!cancelled) {
            setAddressSuggestions(items);
            setAddressSuggestTouched(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAddressSuggestions([]);
            setAddressSuggestTouched(true);
          }
        })
        .finally(() => {
          if (!cancelled) setAddressSuggestLoading(false);
        });
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.address]);

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Укажите название";
    if (!form.address.trim()) nextErrors.address = "Укажите адрес";
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setResolvingPlace(true);
    try {
      const coords = form.coords;
      const payload = {
        title: form.name.trim(),
        address: form.address.trim(),
        yandexUri: form.yandexUri || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
        estimatedPrice: Number(form.price || 0),
        capacity: Number(form.capacity || 0),
        description: form.desc.trim(),
        amenities: form.amen,
        authorComment: form.note.trim(),
      };
      await ctx.createPlace(payload);
      ctx.toast(ctx.t("toast_saved"));
      ctx.nav.pop();
    } catch (error) {
      console.error("Place creation failed", error);
      setErrors({
        name: getErrorText(error, "Не удалось добавить место. Проверьте событие, группу и соединение."),
      });
    } finally {
      setResolvingPlace(false);
    }
  };
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad gap12">
        <div className="ph add-photo">+ добавить фото места</div>
        <Field label={ctx.t("item_name")} error={errors.name}>
          <div className="suggest"><Input value={form.name} prefix={<Icon name="search" size={17} />} loading={nameSuggestLoading} onFocus={() => setFocusedSuggest("name")} onChange={(value) => { setForm((state) => ({ ...state, name: value, yandexUri: "", coords: null })); setErrors((state) => ({ ...state, name: null })); }} placeholder="Например, Dostyk Plaza" />
            {focusedSuggest === "name" && nameSuggestions.length > 0 && <SuggestList items={nameSuggestions} onSelect={applyNameSuggestion} powered={ctx.t("powered_geosuggest")} />}
            {focusedSuggest === "name" && !nameSuggestLoading && nameSuggestTouched && form.name.trim().length >= 2 && nameSuggestions.length === 0 && <SuggestEmpty text="Ничего не найдено. Проверьте ключ Yandex Suggest API или уточните запрос." />}
          </div>
        </Field>
        <Field label={ctx.t("address")} error={errors.address} hint={!form.coords ? ctx.t("address_hint") : undefined}>
          <div className="suggest"><Input value={form.address} prefix={<Icon name="search" size={17} />} loading={addressSuggestLoading} onFocus={() => setFocusedSuggest("address")} onChange={(value) => { setForm((state) => ({ ...state, address: value, yandexUri: "", coords: null })); setErrors((state) => ({ ...state, address: null })); }} placeholder="Начните вводить адрес" />
            {focusedSuggest === "address" && addressSuggestions.length > 0 && <SuggestList items={addressSuggestions} onSelect={applyAddressSuggestion} powered={ctx.t("powered_geosuggest")} />}
            {focusedSuggest === "address" && !addressSuggestLoading && addressSuggestTouched && form.address.trim().length >= 2 && addressSuggestions.length === 0 && <SuggestEmpty text="Ничего не найдено. Уточните адрес или проверьте ключ Yandex Suggest API." />}
          </div>
        </Field>
        {form.coords && <div className="coords"><Icon name="pin" /><div className="spread"><small>{ctx.t("coords_label")}</small><b>{form.coords.lat.toFixed(5)}, {form.coords.lng.toFixed(5)}</b></div><button className="topbar-btn" onClick={() => set("coords", null)}><Icon name="x" size={17} /></button></div>}
        <div className="row"><Field label={ctx.t("price_approx")}><Input value={formatDigits(form.price)} onChange={(value) => set("price", onlyDigits(value))} placeholder="0" suffix="тг" /></Field><Field label={ctx.t("capacity")}><Input value={formatDigits(form.capacity)} onChange={(value) => set("capacity", onlyDigits(value))} placeholder="0" suffix={ctx.t("people")} /></Field></div>
        <Field label={ctx.t("whats_there")}><div className="chip-row wrap">{amenityList.map((amenity) => <Chip key={amenity} active={form.amen.includes(amenity)} icon={amenity} onClick={() => setForm((state) => ({ ...state, amen: state.amen.includes(amenity) ? state.amen.filter((item) => item !== amenity) : [...state.amen, amenity] }))}>{ctx.t(`am_${amenity}`)}</Chip>)}</div></Field>
        <Field label={ctx.t("description")}><textarea className="input textarea" value={form.desc} onChange={(event) => set("desc", event.target.value)} placeholder="Чем место хорошо, какие условия..." /></Field>
        <Field label={ctx.t("author_note")} optional={ctx.t("optional")}><Input value={form.note} onChange={(value) => set("note", value)} placeholder="Ваш комментарий" /></Field>
      </div>
      <BottomAction><Btn full disabled={ctx.isCreatingPlace || resolvingPlace} onClick={submit}>{ctx.isCreatingPlace || resolvingPlace ? ctx.t("loading") : ctx.t("add_place")}</Btn></BottomAction>
    </div>
  );
}

function CollectionsScreen({ ctx }: { ctx: Ctx }) {
  const emptyCollectionsText =
    ctx.role === "organizer"
      ? "Сборов еще нет. Создайте первый сбор и добавьте товары."
      : "Организатор еще не создал активный сбор.";
  const createAction =
    ctx.role === "organizer" ? <Btn full icon="plus" onClick={() => ctx.nav.push("createcollection")}>{ctx.t("create_collection")}</Btn> : undefined;

  return (
    <div className="scroll screen-anim"><div className="screen-pad gap12">
      {ctx.role === "organizer" && ctx.data.collections.length > 0 && <Btn full icon="plus" onClick={() => ctx.nav.push("createcollection")}>{ctx.t("create_collection")}</Btn>}
      {ctx.data.collections.length ? ctx.data.collections.map((collection) => <CollectionCard key={collection.id} collection={collection} ctx={ctx} />) : <StateView icon="cart" title={ctx.t("empty_title")} sub={emptyCollectionsText} action={createAction} />}
    </div></div>
  );
}

function CreateCollectionScreen({ ctx }: { ctx: Ctx }) {
  const [title, setTitle] = useState("Сбор средств на выпускной");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("20");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const amount = Number(targetAmount);
    const days = Number(deadlineDays);
    if (!title.trim()) {
      setError("Укажите название сбора.");
      return;
    }
    if (!Number.isInteger(amount) || amount < 0) {
      setError("Бюджет должен быть целым числом от 0.");
      return;
    }
    if (!Number.isInteger(days) || days < 1) {
      setError("Дедлайн должен быть целым числом от 1 дня.");
      return;
    }

    setError(null);
    try {
      await ctx.createCollection({
        title: title.trim(),
        description: description.trim(),
        targetAmount: amount,
        deadlineDays: days,
      });
      ctx.toast("Сбор создан", "check");
      ctx.nav.pop();
    } catch {
      setError("Не удалось создать сбор. Проверьте роль организатора и соединение.");
    }
  };

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        <Notice tone="info" icon="info">После создания участники смогут предлагать товары в рамках бюджета.</Notice>
        <Field label="Название" error={error && !title.trim() ? error : null}>
          <Input value={title} onChange={setTitle} placeholder="Например, сбор средств на продукты" />
        </Field>
        <Field label="Общий бюджет">
          <Input value={formatDigits(targetAmount)} onChange={(value) => setTargetAmount(onlyDigits(value))} placeholder="0" suffix="тг" />
        </Field>
        <Field label="Дедлайн">
          <Input value={formatDigits(deadlineDays)} onChange={(value) => setDeadlineDays(onlyDigits(value))} placeholder="20" suffix="дн." />
        </Field>
        <Field label="Описание" optional={ctx.t("optional")}>
          <textarea className="input textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Что собираем и какие правила добавления товаров" />
        </Field>
        {error && <Notice tone="warn" icon="warn">{error}</Notice>}
      </div>
      <BottomAction><Btn full icon="check" disabled={ctx.isCreatingCollection} onClick={submit}>{ctx.isCreatingCollection ? ctx.t("loading") : ctx.t("create_collection")}</Btn></BottomAction>
    </div>
  );
}

function CollectionScreen({ ctx, id }: { ctx: Ctx; id?: string }) {
  const collection = ctx.data.collections.find((item) => item.id === id) ?? ctx.data.collections[0];
  if (!collection) {
    const emptyCollectionsText =
      ctx.role === "organizer"
        ? "Сборов еще нет. Создайте первый сбор и добавьте товары."
        : "Организатор еще не создал активный сбор.";
    return <StateView icon="cart" title={ctx.t("empty_title")} sub={emptyCollectionsText} />;
  }
  const items = collection.id === ctx.data.collections[0]?.id ? ctx.data.items : [];
  const approved = items.filter((item) => item.approved);
  const proposed = items.filter((item) => !item.approved);
  const approvedTotal = approved.reduce((sum, item) => sum + item.qty * item.price, 0);
  const proposedTotal = proposed.reduce((sum, item) => sum + item.qty * item.price, 0);
  const remainingAfterApproved = Math.max(collection.planned - approvedTotal, 0);
  const status = collectionStatus[collection.status];
  const editable = collection.status === "active" || collection.status === "draft";
  return (
    <div className="scroll screen-anim"><div className="screen-pad stack">
      <div className="row-between"><Badge color={status.c}>{ctx.t(status.k)}</Badge><span className="muted row"><Icon name="clock" size={15} />{ctx.daysLeft(collection.deadline)} {ctx.t("days_left")}</span></div>
      <Card><BudgetProgress collected={collection.collected} planned={collection.planned} approved={collection.approved} t={ctx.t} /></Card>
      <SectionLabel>Смета товаров</SectionLabel>
      <div className="listcard">
        <CalcLine label={ctx.t("approved")} value={money(approvedTotal)} green strong />
        <CalcLine label={ctx.t("proposed")} value={money(proposedTotal)} />
        <CalcLine label={ctx.t("remaining")} value={money(remainingAfterApproved)} strong />
      </div>
      {ctx.daysLeft(collection.deadline) <= 14 && editable && <Notice tone="warn" icon="warn">{ctx.t("deadline_soon")}</Notice>}
      <Card className="invoice-shortcut" onClick={() => ctx.nav.push("invoice")}><div className="row-between"><div className="row"><Icon name="wallet" /><div><small>{ctx.t("invoice")}</small><b>{money(ctx.data.myInvoice.total)}</b></div></div><Icon name="chevronR" /></div></Card>
      <SectionLabel>{ctx.t("approved")} · {approved.length}</SectionLabel><div className="listcard">{approved.map((item) => <ItemRow key={item.id} item={item} ctx={ctx} />)}</div>
      {proposed.length > 0 && <><SectionLabel>{ctx.t("proposed")} · {proposed.length}</SectionLabel><div className="listcard">{proposed.map((item) => <ItemRow key={item.id} item={item} ctx={ctx} proposed />)}</div></>}
    </div>{editable && <BottomAction><Btn full icon="plus" onClick={() => ctx.nav.push("additem")}>{ctx.t("add_item")}</Btn></BottomAction>}</div>
  );
}

function AddItemScreen({ ctx }: { ctx: Ctx }) {
  const [form, setForm] = useState({ name: "", cat: "food", qty: 1, unit: "шт", price: "", type: "common", comment: "", link: "" });
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const query = form.name.trim().toLowerCase();
  const duplicate = query.length >= 2 && !dismissed ? ctx.data.items.find((item) => item.name.toLowerCase().includes(query) || query.includes(item.name.toLowerCase().slice(0, 3))) : undefined;
  const set = (key: keyof typeof form, value: string | number) => setForm((state) => ({ ...state, [key]: value }));
  const submit = async () => {
    const unitPrice = Number(form.price);
    if (!form.name.trim()) return setError("Укажите название");
    if (!Number.isInteger(unitPrice) || unitPrice < 0) return setError("Цена должна быть целым числом от 0");
    setError(null);
    try {
      await ctx.createItem({
        title: form.name.trim(),
        category: form.cat,
        quantity: form.qty,
        unit: form.unit.trim() || "шт",
        unitPrice,
        itemType: form.type,
        comment: form.comment.trim(),
        storeUrl: form.link.trim(),
      });
      ctx.toast(ctx.t("toast_saved"));
      ctx.nav.pop();
    } catch {
      setError("Не удалось добавить товар. Проверьте активный сбор и соединение.");
    }
  };
  return (
    <div className="scroll screen-anim"><div className="screen-pad gap12">
      <Notice tone="info" icon="lock">{ctx.t("no_edit_after")}</Notice>
      <Field label={ctx.t("item_name")} error={error}><Input value={form.name} onChange={(value) => { set("name", value); setError(null); setDismissed(false); }} placeholder="Например, Кола" /></Field>
      {duplicate && <div className="duplicate-card"><div className="row"><Icon name="info" /><b>{ctx.t("dup_title")}</b></div><p>«{duplicate.name}» {ctx.t("already_in_list")} - {duplicate.qty} {duplicate.unit} × {money(duplicate.price)}</p><div className="row"><Btn size="sm" variant="tinted" full onClick={() => { ctx.toast(ctx.t("dup_add_support"), "heart"); ctx.nav.pop(); }}>{ctx.t("dup_add_support")}</Btn><Btn size="sm" variant="secondary" onClick={() => setDismissed(true)}>{ctx.t("close")}</Btn></div></div>}
      <Field label={ctx.t("category")}><div className="chip-row wrap">{cats.map((cat) => <Chip key={cat} active={form.cat === cat} onClick={() => set("cat", cat)}>{ctx.t(`cat_${cat}`)}</Chip>)}</div></Field>
      <div className="row"><Field label={ctx.t("qty")}><Stepper value={form.qty} onChange={(value) => set("qty", value)} /></Field><Field label={ctx.t("unit")}><Input value={form.unit} onChange={(value) => set("unit", value)} placeholder="шт" /></Field><Field label={ctx.t("price")}><Input value={formatDigits(form.price)} onChange={(value) => set("price", onlyDigits(value))} placeholder="0" suffix="тг" /></Field></div>
      <Field label={ctx.t("item_type")}><div className="gap8">{Object.entries(itemType).map(([key, value]) => <button key={key} className={`select-card compact${form.type === key ? " selected" : ""}`} onClick={() => set("type", key)}><span className="badge-dot" style={{ background: `var(--st-${value.c})` }} /><span className="spread">{ctx.t(value.k)}</span>{form.type === key && <Icon name="check" />}</button>)}</div></Field>
      <Field label={ctx.t("comment")} optional={ctx.t("optional")}><Input value={form.comment} onChange={(value) => set("comment", value)} placeholder="Детали для остальных" /></Field>
      <Field label={ctx.t("shop_link")} optional={ctx.t("optional")}><Input value={form.link} onChange={(value) => set("link", value)} placeholder="https://" prefix={<Icon name="arrowUR" size={16} />} /></Field>
    </div><BottomAction><Btn full disabled={ctx.isCreatingItem} onClick={submit}>{ctx.isCreatingItem ? ctx.t("loading") : ctx.t("add_item")}</Btn></BottomAction></div>
  );
}

function InvoiceScreen({ ctx }: { ctx: Ctx }) {
  const invoice = ctx.data.myInvoice;
  const paymentPhone = ctx.data.event.payment.phone;
  const paymentHolder = ctx.data.event.payment.holder;
  const rows = [
    { label: ctx.t("part_common"), value: invoice.common, c: "blue" as StatusColor },
    ...(invoice.alcohol ? [{ label: ctx.t("part_alcohol"), value: invoice.alcohol, c: "red" as StatusColor }] : []),
    ...(invoice.individual ? [{ label: ctx.t("part_individual"), value: invoice.individual, c: "amber" as StatusColor }] : []),
  ];
  return (
    <div className="scroll screen-anim"><div className="screen-pad stack">
      <Card className="invoice-total"><small>{ctx.t("invoice_total")}</small><b>{money(invoice.total)}</b><Badge color={invoice.paid ? "green" : "amber"}>{invoice.paid ? ctx.t("paid") : ctx.t("not_paid")}</Badge></Card>
      <SectionLabel>{ctx.t("invoice_breakdown")}</SectionLabel><div className="listcard">{rows.map((row) => <div key={row.label} className="lrow lrow-static"><span className="badge-dot" style={{ background: `var(--st-${row.c})` }} /><div className="lrow-main"><span className="lrow-title">{row.label}</span></div><div className="lrow-amt">{money(row.value)}</div></div>)}{invoice.individualItems.map((item) => <div key={item.name} className="lrow lrow-static subrow"><div className="lrow-main"><span className="lrow-sub">{item.name}</span></div><div className="lrow-sub">{money(item.price)}</div></div>)}</div>
      <Card><div className="row-between"><span className="row muted"><Icon name="clock" />{ctx.t("pay_deadline")}</span><b>{ctx.fmtDate(invoice.deadline)}</b></div></Card>
      <SectionLabel>{ctx.t("pay_instruction")}</SectionLabel><Card>{paymentPhone ? <p>Переведите сумму на Kaspi организатора <b>{paymentPhone}</b>{paymentHolder ? <> ({paymentHolder})</> : null} с комментарием <b>«Выпускной - {ctx.data.me.name}»</b>.</p> : <Notice tone="warn" icon="warn">Организатор еще не указал номер Kaspi.</Notice>}<Notice tone="info" icon="info">{ctx.t("confirmed_by_org")}</Notice></Card>
    </div><BottomAction><Btn full variant="secondary" icon="arrowUR" disabled={!paymentPhone} onClick={() => ctx.toast("Открываю Kaspi", "wallet")}>Оплатить в Kaspi</Btn></BottomAction></div>
  );
}

function ParticipantsScreen({ ctx }: { ctx: Ctx }) {
  const isOrg = ctx.role === "organizer";
  const [filter, setFilter] = useState("all");
  const hasCollection = ctx.data.collections.length > 0;
  const hasParticipants = ctx.participants.length > 0;
  const counts = {
    in: ctx.participants.filter((p) => p.participation === "in").length,
    out: ctx.participants.filter((p) => p.participation === "out" || p.participation === "exempt").length,
    maybe: ctx.participants.filter((p) => p.participation === "maybe").length,
    none: ctx.participants.filter((p) => p.participation === "none").length,
  };
  const list = ctx.participants.filter((p) => filter === "all" || (filter === "paid" ? p.paid : filter === "unpaid" ? !p.paid && p.participation === "in" : p.participation === filter));
  if (!isOrg) {
    return <div className="scroll screen-anim"><div className="screen-pad gap12"><div className="row"><MiniStat n={counts.in} label={ctx.t("f_in")} c="green" /><MiniStat n={counts.maybe} label={ctx.t("f_maybe")} c="amber" /><MiniStat n={counts.none} label={ctx.t("f_none")} c="gray" /></div><Notice tone="info" icon="info">Суммы и счета видит только организатор</Notice><ParticipantList participants={ctx.participants} ctx={ctx} publicOnly /></div></div>;
  }
  const filters = ["all", "in", "maybe", "none", "out", "paid", "unpaid"];
  const labels: Record<string, string> = { all: ctx.t("all"), in: ctx.t("f_in"), maybe: ctx.t("f_maybe"), none: ctx.t("f_none"), out: ctx.t("f_out"), paid: ctx.t("f_paid"), unpaid: ctx.t("f_unpaid") };
  const canFinalize = hasCollection && counts.in > 0;
  const finalizeHint = !hasCollection
    ? "Сначала создайте сбор. После этого здесь появится финальный расчет."
    : counts.in === 0
      ? "Счета можно отправить только тем, кто подтвердил участие."
      : "Финальный расчет создаст счета только для участников со статусом «Участвует».";

  return (
    <div className="scroll screen-anim">
      <div className="screen-pad gap12">
        <div className="row"><MiniStat n={counts.in} label={ctx.t("f_in")} c="green" /><MiniStat n={counts.maybe} label={ctx.t("f_maybe")} c="amber" /><MiniStat n={counts.none} label={ctx.t("f_none")} c="gray" /><MiniStat n={counts.out} label={ctx.t("f_out")} c="red" /></div>
        <Notice tone={canFinalize ? "info" : "warn"} icon={canFinalize ? "info" : "warn"}>{finalizeHint}</Notice>
        {hasParticipants ? (
          <>
            <div className="chip-row">{filters.map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{labels[f]}</Chip>)}</div>
            {list.length ? <ParticipantList participants={list} ctx={ctx} /> : <StateView icon="users" title="Нет участников" sub="По этому фильтру никого нет." />}
          </>
        ) : (
          <StateView icon="users" title="Участников пока нет" sub="Они появятся здесь после первого входа в Mini App или после добавления через админку." />
        )}
      </div>
      <BottomAction><Btn full icon="wallet" disabled={!canFinalize} onClick={() => ctx.nav.push("finalize")}>{ctx.t("final_calc")}</Btn></BottomAction>
    </div>
  );
}

function ParticipantScreen({ ctx, id }: { ctx: Ctx; id?: string }) {
  const participant = ctx.participants.find((item) => item.id === id);
  if (!participant) return null;
  const update = (patch: Partial<Participant>) => ctx.setParticipants((list) => list.map((item) => (item.id === participant.id ? { ...item, ...patch } : item)));
  return <div className="scroll screen-anim"><div className="screen-pad stack"><Card className="profile-card"><Avatar name={participant.name} size={64} /><h2>{participant.name}</h2><Badge color={participationColor[participant.participation]}>{ctx.t(partLabel[participant.participation])}</Badge></Card><SectionLabel>{ctx.t("payment_category")}</SectionLabel><div className="gap8">{Object.entries(payCats).map(([key, value]) => <button key={key} className={`select-card compact${participant.payCat === key ? " selected" : ""}`} onClick={() => { update({ payCat: key as Participant["payCat"] }); ctx.toast(ctx.t("toast_saved")); }}><span className="badge-dot" style={{ background: `var(--st-${value.c})` }} /><span className="spread">{ctx.t(value.k)}</span>{participant.payCat === key && <Icon name="check" />}</button>)}</div>{participant.participation === "in" && <><SectionLabel>{ctx.t("invoice_sum")}</SectionLabel><Card><div className="row-between section-space"><span className="muted">{ctx.t("invoice_total")}</span><b className="big-num">{money(participant.invoice)}</b></div><div className="row-between"><Badge color={participant.paid ? "green" : "amber"}>{participant.paid ? ctx.t("paid") : ctx.t("not_paid")}</Badge><Btn size="sm" variant={participant.paid ? "secondary" : "tinted"} icon={participant.paid ? "x" : "check"} onClick={() => { update({ paid: !participant.paid }); ctx.toast(participant.paid ? ctx.t("not_paid") : ctx.t("toast_paid")); }}>{participant.paid ? "Отменить" : ctx.t("mark_paid")}</Btn></div></Card><Notice tone="info" icon="info">{ctx.t("confirmed_by_org")}</Notice></>}</div></div>;
}

function FinalizeScreen({ ctx }: { ctx: Ctx }) {
  const [confirm, setConfirm] = useState(false);
  const collection = ctx.data.collections[0];
  const willReceive = ctx.participants.filter((p) => p.participation === "in");
  const wontReceive = ctx.participants.filter((p) => p.participation === "out" || p.participation === "exempt");
  const noAnswer = ctx.participants.filter((p) => p.participation === "none" || p.participation === "maybe");
  const total = willReceive.reduce((sum, p) => sum + p.invoice, 0);
  const planned = collection?.planned ?? 0;
  const remaining = planned - (collection?.approved ?? 0);

  if (!collection) {
    return <div className="scroll screen-anim"><div className="screen-pad stack"><StateView icon="cart" title="Сбор не создан" sub="Создайте сбор, добавьте товары и дождитесь ответов участников." action={<Btn full icon="plus" onClick={() => ctx.nav.push("createcollection")}>{ctx.t("create_collection")}</Btn>} /></div></div>;
  }
  if (willReceive.length === 0) {
    return <div className="scroll screen-anim"><div className="screen-pad stack"><StateView icon="users" title="Некому отправлять счет" sub="Сначала участники должны подтвердить участие." /></div></div>;
  }
  if (total <= 0) {
    return <div className="scroll screen-anim"><div className="screen-pad stack"><StateView icon="wallet" title="Сумма счета равна 0" sub="Добавьте и утвердите товары, чтобы появился расчет." /></div></div>;
  }

  return <div className="scroll screen-anim"><div className="screen-pad stack"><Notice tone="info" icon="info">Проверьте список получателей и сумму. После подтверждения счета получат только участники со статусом «Участвует».</Notice><Card className="invoice-total"><small>{ctx.t("total_sum")}</small><b>{money(total)}</b><span className="muted">{willReceive.length} {ctx.t("people")}</span></Card><SectionLabel>{ctx.t("final_calc")}</SectionLabel><div className="listcard"><CalcRow icon="check" c="green" label={ctx.t("will_receive")} value={`${willReceive.length} ${ctx.t("people")}`} /><CalcRow icon="x" c="red" label={ctx.t("wont_receive")} value={`${wontReceive.length} ${ctx.t("people")}`} /><CalcRow icon="clock" c="amber" label={ctx.t("no_answer")} value={`${noAnswer.length} ${ctx.t("people")}`} /></div><SectionLabel>{ctx.t("budget")}</SectionLabel><div className="listcard"><CalcLine label={ctx.t("plan")} value={money(planned)} /><CalcLine label={ctx.t("total_sum")} value={money(total)} green /><CalcLine label={ctx.t("remaining")} value={money(remaining)} strong /></div>{noAnswer.length > 0 && <Notice tone="warn" icon="warn">{noAnswer.length} {ctx.t("people")} еще не ответили - они не получат счет</Notice>}</div><BottomAction><Btn full icon="send" onClick={() => setConfirm(true)}>{ctx.t("send_invoices")}</Btn></BottomAction><Modal open={confirm} onClose={() => setConfirm(false)} title={ctx.t("confirm_send")} danger><div className="confirm-list"><CalcLine label={ctx.t("will_receive")} value={`${willReceive.length} ${ctx.t("people")}`} green /><CalcLine label={ctx.t("wont_receive")} value={`${wontReceive.length} ${ctx.t("people")}`} /><CalcLine label={ctx.t("no_answer")} value={`${noAnswer.length} ${ctx.t("people")}`} /><CalcLine label={ctx.t("total_sum")} value={money(total)} strong /></div><Btn full icon="send" onClick={() => { setConfirm(false); ctx.toast(ctx.t("toast_sent"), "send"); ctx.nav.pop(); }}>{ctx.t("confirm_send")}</Btn><button className="btn btn-ghost btn-md btn-full" onClick={() => setConfirm(false)}>{ctx.t("cancel")}</button></Modal></div>;
}

function ProfileScreen({ ctx }: { ctx: Ctx }) {
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        <Card><div className="row"><Avatar name={ctx.data.me.name} size={56} /><div><h2>{ctx.data.me.name}</h2><p className="muted">{ctx.data.event.title} · {ctx.data.event.school}</p></div></div></Card>
        <SectionLabel>{ctx.t("role")}</SectionLabel>
        <div className="listcard"><div className="lrow"><Icon name={ctx.role === "organizer" ? "lock" : "user"} /><span className="lrow-main">{ctx.t(ctx.role === "organizer" ? "role_organizer" : "role_participant")}</span><Badge color={ctx.role === "organizer" ? "green" : "blue"}>{ctx.t(ctx.role === "organizer" ? "role_organizer" : "role_participant")}</Badge></div></div>
        <SectionLabel>{ctx.t("theme")}</SectionLabel>
        <Segmented value={ctx.themePref} options={[["system", ctx.t("th_system")], ["light", ctx.t("th_light")], ["dark", ctx.t("th_dark")]]} onChange={(value) => ctx.setThemePref(value as ThemePreference)} />
        <SectionLabel>{ctx.t("language")}</SectionLabel>
        <Segmented value={ctx.lang} options={[["ru", "Русский"], ["kk", "Қазақша"]]} onChange={(value) => ctx.setLang(value as Lang)} />
        <SectionLabel>{ctx.t("settings")}</SectionLabel>
        <div className="listcard">
          <button className="lrow" onClick={() => ctx.setNotif(!ctx.notif)}><Icon name="bell" /><span className="lrow-main">{ctx.t("notifications")}</span><Toggle on={ctx.notif} /></button>
          <button className="lrow" onClick={ctx.replayOnboarding}><Icon name="star" /><span className="lrow-main">Показать onboarding</span><Icon name="chevronR" /></button>
        </div>
        <p className="hint center-text">Версия {__APP_VERSION__}</p>
      </div>
    </div>
  );
}

function AppSkeleton() {
  return (
    <div className="scroll screen-anim">
      <div className="screen-pad stack">
        <Card><Skeleton h={18} w="58%" /><Skeleton h={12} w="82%" /><Skeleton h={38} w="100%" /></Card>
        <div className="skeleton-grid"><Card><Skeleton h={22} w="46%" /><Skeleton h={12} w="70%" /></Card><Card><Skeleton h={22} w="52%" /><Skeleton h={12} w="66%" /></Card></div>
        <SectionLabel> </SectionLabel>
        {[0, 1, 2].map((item) => <Card key={item}><Skeleton h={16} w="62%" /><Skeleton h={12} w="88%" /><Skeleton h={12} w="54%" /></Card>)}
      </div>
    </div>
  );
}

function StatesScreen({ ctx }: { ctx: Ctx }) {
  const [view, setView] = useState("loading");
  return <div className="scroll screen-anim"><div className="screen-pad gap12"><Segmented value={view} options={[["loading", "Loading"], ["empty", "Empty"], ["error", "Error"], ["map", ctx.t("map_state")]]} onChange={setView} />{view === "loading" && [0, 1, 2].map((i) => <Card key={i}><Skeleton h={16} w="55%" /><Skeleton h={12} /><Skeleton h={22} w="70%" /></Card>)}{view === "empty" && <StateView icon="cart" title={ctx.t("empty_title")} sub={ctx.t("empty_collections")} action={<Btn full icon="plus">{ctx.t("create_collection")}</Btn>} />}{view === "error" && <StateView icon="warn" title={ctx.t("error_title")} sub={ctx.t("error_sub")} action={<Btn full variant="secondary">{ctx.t("retry")}</Btn>} />}{view === "map" && <div className="map-state"><MapLoading t={ctx.t} /></div>}</div></div>;
}

function Btn({ children, variant = "primary", icon, onClick, full, size = "md", disabled }: { children?: ReactNode; variant?: "primary" | "secondary" | "tinted" | "ghost"; icon?: string; onClick?: () => void; full?: boolean; size?: "sm" | "md"; disabled?: boolean }) {
  return <button className={`btn btn-${variant} btn-${size}${full ? " btn-full" : ""}${disabled ? " btn-disabled" : ""}`} onClick={disabled ? undefined : onClick}>{icon && <Icon name={icon} size={size === "sm" ? 17 : 19} stroke={2} />}{children && <span>{children}</span>}</button>;
}

function Badge({ color = "gray", children }: { color?: StatusColor; children: ReactNode }) {
  return <span className="badge badge-soft" style={{ "--c": `var(--st-${color})`, "--cbg": `var(--st-${color}-bg)` } as React.CSSProperties}><span className="badge-dot" />{children}</span>;
}

function BudgetProgress({ collected, planned, approved, t }: { collected: number; planned: number; approved: number; t: (key: string) => string }) {
  const collectedPct = Math.min(100, Math.round((collected / planned) * 100));
  const approvedPct = Math.min(100, Math.round((approved / planned) * 100));
  return <div className="budget"><div className="budget-track"><div className="budget-fill-approved" style={{ width: `${approvedPct}%` }} /><div className="budget-fill" style={{ width: `${collectedPct}%` }} /></div><div className="budget-stats"><div><b>{moneyShort(collected)}</b><span>{t("collected")}</span></div><div><b>{moneyShort(planned)}</b><span>{t("plan")}</span></div><div><b>{moneyShort(Math.max(0, planned - collected))}</b><span>{t("remaining")}</span></div></div></div>;
}

function TopBar({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return <div className="topbar"><div className="topbar-row">{onBack ? <button className="topbar-btn" onClick={onBack}><Icon name="chevronL" size={24} stroke={2.2} /></button> : <div className="topbar-spacer" />}<div className="topbar-title-wrap"><div className="topbar-title">{title}</div>{subtitle && <div className="topbar-sub">{subtitle}</div>}</div><div className="topbar-right">{right ?? <div className="topbar-spacer" />}</div></div></div>;
}

function BottomNav({ tab, onTab, t, isOrg }: { tab: Tab; onTab: (tab: Tab) => void; t: (key: string) => string; isOrg: boolean }) {
  const items: Array<{ key: Tab; icon: string; label: string }> = [
    { key: "home", icon: "home", label: t("nav_home") },
    { key: "places", icon: "map", label: t("nav_places") },
    { key: "collections", icon: "cart", label: t("nav_collections") },
    { key: "participants", icon: "users", label: t("nav_participants") },
    { key: "profile", icon: "user", label: t("nav_profile") },
  ];
  return <div className="bottomnav">{items.map((item) => <button key={item.key} className={`navitem${tab === item.key ? " navitem-active" : ""}`} onClick={() => onTab(item.key)}><Icon name={item.icon} size={24} stroke={tab === item.key ? 2.1 : 1.8} /><span>{item.label}</span>{item.key === "participants" && isOrg && <span className="nav-org-dot" />}</button>)}</div>;
}

function Card({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const Comp = onClick ? "button" : "div";
  return <Comp className={`card card-pad${onClick ? " card-tap" : ""}${className ? ` ${className}` : ""}`} onClick={onClick}>{children}</Comp>;
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="section-label"><span>{children}</span>{action}</div>;
}

function Notice({ children, tone, icon }: { children: ReactNode; tone: "info" | "warn"; icon: string }) {
  return <div className={`notice notice-${tone}`}><Icon name={icon} size={16} stroke={2} />{children}</div>;
}

function BottomAction({ children }: { children: ReactNode }) {
  return <div className="bottom-action">{children}</div>;
}

function FilterChips({ filter, setFilter, ctx }: { filter: string; setFilter: (filter: string) => void; ctx: Ctx }) {
  return <div className="chip-row filters"><Chip active={filter === "all"} onClick={() => setFilter("all")}>{ctx.t("all")}</Chip>{["high", "new", "debate", "problem", "low"].map((key) => <Chip key={key} color={interestColor[key]} active={filter === key} onClick={() => setFilter(filter === key ? "all" : key)}>{ctx.t(interestKeys[key])}</Chip>)}</div>;
}

function Chip({ children, active, onClick, color, icon }: { children: ReactNode; active?: boolean; onClick?: () => void; color?: StatusColor; icon?: string }) {
  return <button className={`chip${active ? " chip-active" : ""}`} onClick={onClick} style={color ? ({ "--c": `var(--st-${color})` } as React.CSSProperties) : undefined}>{color && <span className="chip-dot" />}{icon && <Icon name={icon} size={15} />}{children}</button>;
}

function PlaceListCard({ place, ctx, compact }: { place: Place; ctx: Ctx; compact?: boolean }) {
  return <Card className="place-card" onClick={() => ctx.nav.push("place", { id: place.id })}><div className="ph place-photo">фото</div><div className="place-main"><b>{place.name}</b><small>{place.district}</small><div className="row-between"><Badge color={interestColor[place.interest]}>{ctx.t(interestKeys[place.interest])}</Badge>{!compact && <span className="num">{money(place.price)}</span>}</div></div></Card>;
}

function MapSheet({ place, ctx, onClose }: { place: Place; ctx: Ctx; onClose: () => void }) {
  return <div className="map-sheet"><div className="row-between"><Badge color={interestColor[place.interest]}>{ctx.t(interestKeys[place.interest])}</Badge><button className="topbar-btn small" onClick={onClose}><Icon name="x" size={18} /></button></div><div className="row top-align"><div className="ph sheet-photo">фото</div><div className="spread place-main"><b>{place.name}</b><small>{place.address || place.district}</small><div className="row place-meta"><span className="num">{money(place.price)}</span><span className="muted">{place.capacity} {ctx.t("people")}</span></div></div></div><div className="map-sheet-actions"><Btn variant="secondary" size="sm" icon="route" onClick={() => window.open(yandexPlaceUrl(place), "_blank", "noopener,noreferrer")}>{ctx.t("route")}</Btn><Btn size="sm" full onClick={() => ctx.nav.push("place", { id: place.id })}>{ctx.t("open")}</Btn></div></div>;
}

function MapLoading({ t }: { t: (key: string) => string }) {
  return <div className="map-loading"><div className="map-skel" /><div className="map-load-badge"><span className="spinner" />{t("map_load")}</div></div>;
}

function CollectionCard({ collection, ctx }: { collection: Collection; ctx: Ctx }) {
  const status = collectionStatus[collection.status];
  return <Card onClick={() => ctx.nav.push("collection", { id: collection.id })}><div className="row-between section-space"><b>{collection.title}</b><Badge color={status.c}>{ctx.t(status.k)}</Badge></div>{collection.planned > 0 && <BudgetProgress collected={collection.collected} planned={collection.planned} approved={collection.approved} t={ctx.t} />}<div className="row-between meta-row"><span><Icon name="clock" size={14} />{ctx.fmtDate(collection.deadline)}</span><span>{collection.itemsApproved} {ctx.t("approved").toLowerCase()} · {collection.itemsProposed} {ctx.t("proposed").toLowerCase()}</span></div></Card>;
}

function ItemRow({ item, ctx, proposed }: { item: PriceItem; ctx: Ctx; proposed?: boolean }) {
  const type = itemType[item.type];
  return <div className="lrow lrow-static"><div className="lrow-main"><div className="row">{item.type !== "common" && <Badge color={type.c}>{ctx.t(type.k)}</Badge>}<span className="lrow-title">{item.name}</span></div><div className="lrow-sub">{item.qty} {item.unit} × {money(item.price)}{item.support ? ` · +${item.support} ${ctx.t("support").toLowerCase()}` : ""}{proposed ? ` · ${item.by}` : ""}</div></div><div className="lrow-amt">{money(item.qty * item.price)}</div></div>;
}

function ParticipantList({ participants, ctx, publicOnly }: { participants: Participant[]; ctx: Ctx; publicOnly?: boolean }) {
  return <div className="listcard">{participants.map((participant) => <button key={participant.id} className="lrow" onClick={() => !publicOnly && ctx.nav.push("participant", { id: participant.id })}><Avatar name={participant.name} /><div className="lrow-main"><span className="lrow-title">{participant.name}{participant.id === ctx.data.me.id ? " · вы" : ""}</span>{!publicOnly && participant.participation === "in" && <div className="row"><Badge color={participant.paid ? "green" : "amber"}>{participant.paid ? ctx.t("paid") : ctx.t("not_paid")}</Badge></div>}</div><Badge color={participationColor[participant.participation]}>{ctx.t(partLabel[participant.participation])}</Badge>{!publicOnly && participant.invoice > 0 && <span className="lrow-amt">{money(participant.invoice)}</span>}</button>)}</div>;
}

function MiniStat({ n, label, c }: { n: number; label: string; c: StatusColor }) {
  return <div className="card mini-stat"><b style={{ color: `var(--st-${c})` }}>{n}</b><span>{label}</span></div>;
}

function CalcRow({ icon, c, label, value }: { icon: string; c: StatusColor; label: string; value: string }) {
  return <div className="lrow lrow-static"><span className="calc-icon" style={{ background: `var(--st-${c}-bg)`, color: `var(--st-${c})` }}><Icon name={icon} size={17} /></span><div className="lrow-main">{label}</div><b>{value}</b></div>;
}

function CalcLine({ label, value, green, strong }: { label: string; value: string; green?: boolean; strong?: boolean }) {
  return <div className="lrow lrow-static"><div className="lrow-main"><span className={strong ? "strong" : ""}>{label}</span></div><b className={green ? "green-text" : ""}>{value}</b></div>;
}

function QuickAction({ icon, label, c, onClick }: { icon: string; label: string; c: string; onClick: () => void }) {
  const color = c === "accent" ? "var(--accent)" : `var(--st-${c})`;
  const bg = c === "accent" ? "color-mix(in srgb, var(--accent) 13%, transparent)" : `var(--st-${c}-bg)`;
  return <button className="card quick-action" onClick={onClick}><span style={{ background: bg, color }}><Icon name={icon} size={20} /></span><b>{label}</b></button>;
}

function StatBox({ label, value, c, icon }: { label: string; value: string | number; c?: StatusColor; icon?: string }) {
  return <div className="card stat-box"><b style={{ color: c ? `var(--st-${c})` : undefined }}>{icon && <Icon name={icon} size={15} />}{value}</b><span>{label}</span></div>;
}

function Field({ label, children, hint, error, optional }: { label: string; children: ReactNode; hint?: string; error?: string | null; optional?: string }) {
  return <div className="field"><label>{label}{optional && <span> · {optional}</span>}</label>{children}{error ? <div className="field-error"><Icon name="warn" size={13} />{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}</div>;
}

function Input({ value, onChange, onFocus, placeholder, prefix, suffix, loading }: { value: string; onChange: (value: string) => void; onFocus?: () => void; placeholder?: string; prefix?: ReactNode; suffix?: string; loading?: boolean }) {
  return <div className="input-wrap">{prefix && <span className="input-affix">{prefix}</span>}<input className="input" value={value} placeholder={placeholder} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} />{loading && <span className="input-spinner" />}{suffix && <span className="input-affix">{suffix}</span>}</div>;
}

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="stepper"><button onClick={() => onChange(Math.max(1, value - 1))}><Icon name="minus" size={16} /></button><span>{value}</span><button onClick={() => onChange(value + 1)}>+</button></div>;
}

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}><span>{initials}</span></div>;
}

function Segmented({ value, options, onChange }: { value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <div className="seg">{options.map(([key, label]) => <button key={key} className={value === key ? "on" : ""} onClick={() => onChange(key)}>{label}</button>)}</div>;
}

function Toggle({ on }: { on: boolean }) {
  return <span className={`toggle${on ? " on" : ""}`}><span /></span>;
}

function StateView({ icon, title, sub, action }: { icon: string; title: string; sub: string; action?: ReactNode }) {
  return <div className="state"><div className="state-ic"><Icon name={icon} size={34} /></div><div className="state-title">{title}</div><div className="state-sub">{sub}</div>{action && <div className="state-action">{action}</div>}</div>;
}

function Modal({ open, onClose, title, children, danger }: { open: boolean; onClose: () => void; title: string; children: ReactNode; danger?: boolean }) {
  if (!open) return null;
  return <div className="modal-scrim" onClick={onClose}><div className="modal" onClick={(event) => event.stopPropagation()}>{danger && <div className="modal-danger-ic"><Icon name="warn" size={26} /></div>}<div className="modal-title">{title}</div><div className="modal-body">{children}</div></div></div>;
}

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return <div className="toast"><Icon name={toast.icon ?? "check"} size={18} stroke={2.4} /><span>{toast.text}</span></div>;
}

function Skeleton({ h = 16, w = "100%" }: { h?: number; w?: string }) {
  return <div className="skel" style={{ height: h, width: w }} />;
}
