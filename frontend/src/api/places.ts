import { apiRequest } from "./client";

export type CreatePlacePayload = {
  title: string;
  address: string;
  yandexUri?: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice: number;
  capacity: number;
  description?: string;
  amenities: string[];
  authorComment?: string;
  photoUrl?: string;
};

export async function createPlace(payload: CreatePlacePayload) {
  return apiRequest("/places/current/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function supportPlace(placeId: string) {
  return apiRequest(`/places/${placeId}/support/`, {
    method: "POST",
  });
}
