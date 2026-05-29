import { apiRequest } from "./client";

export type CreatePlacePayload = {
  title: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice: number;
  capacity: number;
  description?: string;
  amenities: string[];
  authorComment?: string;
};

export async function createPlace(payload: CreatePlacePayload) {
  return apiRequest("/places/current/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
