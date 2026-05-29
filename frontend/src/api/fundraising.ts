import { apiRequest } from "./client";

export type CreateFundraisingPayload = {
  title: string;
  description?: string;
  targetAmount: number;
  deadlineDays: number;
};

export async function createFundraising(payload: CreateFundraisingPayload) {
  return apiRequest("/fundraisings/current/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CreatePriceItemPayload = {
  title: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  itemType: string;
  comment?: string;
  storeUrl?: string;
};

export async function createPriceItem(payload: CreatePriceItemPayload) {
  return apiRequest("/price-items/current/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
