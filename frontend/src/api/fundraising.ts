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

export async function approvePriceItem(id: string, itemType?: string): Promise<unknown> {
  return apiRequest(`/price-items/${id}/approve/`, {
    method: "POST",
    body: itemType ? JSON.stringify({ itemType }) : undefined,
  });
}

export async function rejectPriceItem(id: string): Promise<unknown> {
  return apiRequest(`/price-items/${id}/reject/`, { method: "POST" });
}

export async function finalizeFundraising(): Promise<unknown> {
  return apiRequest("/fundraisings/current/finalize/", { method: "POST" });
}

export async function createCategory(name: string): Promise<{ id: string; name: string }> {
  return apiRequest("/fundraising/categories/", {
    method: "POST",
    body: JSON.stringify({ name }),
  }) as Promise<{ id: string; name: string }>;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiRequest(`/fundraising/categories/${id}/`, { method: "DELETE" });
}

export async function deletePriceItem(id: string): Promise<void> {
  await apiRequest(`/price-items/${id}/`, { method: "DELETE" });
}

export async function setFundraisingPlace(placeId: string): Promise<unknown> {
  return apiRequest("/fundraisings/current/set-place/", {
    method: "POST",
    body: JSON.stringify({ place_id: placeId }),
  });
}
