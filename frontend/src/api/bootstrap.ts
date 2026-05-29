import { apiRequest } from "./client";
import { AppData } from "../design/data";

type BootstrapResponse = Partial<AppData> & {
  event: AppData["event"] | null;
  myInvoice: AppData["myInvoice"] | null;
};

const emptyInvoice = (deadline = ""): AppData["myInvoice"] => ({
  total: 0,
  common: 0,
  alcohol: 0,
  individual: 0,
  deadline,
  paid: false,
  individualItems: [],
});

export const emptyAppData: AppData = {
  event: {
    id: "",
    title: "Выпускной",
    school: "Событие не создано",
    date: "",
    dateLabel: "Настройте событие в админке",
    payment: {
      phone: "",
      holder: "",
    },
  },
  me: {
    id: "me",
    name: "Участник",
    role: "participant",
    participation: "none",
  },
  places: [],
  collections: [],
  items: [],
  participants: [],
  myInvoice: emptyInvoice(),
};

export async function fetchBootstrapData(): Promise<AppData> {
  const response = await apiRequest<BootstrapResponse>("/bootstrap/");

  if (!response.event) {
    return {
      ...emptyAppData,
      me: response.me ?? emptyAppData.me,
      myInvoice: response.myInvoice ?? emptyInvoice(response.collections?.[0]?.deadline),
    };
  }

  return {
    event: response.event,
    me: response.me ?? emptyAppData.me,
    places: response.places ?? [],
    collections: response.collections ?? [],
    items: response.items ?? [],
    participants: response.participants ?? [],
    myInvoice: response.myInvoice ?? emptyInvoice(response.collections?.[0]?.deadline),
  };
}
