import { apiRequest } from "./client";

export type CreateEventPayload = {
  title: string;
  eventDate?: string;
  description?: string;
  paymentPhone?: string;
  paymentHolder?: string;
};

export type UpdateEventPayload = Partial<CreateEventPayload>;
export type ParticipationStatus = "in" | "out" | "maybe" | "none";

export async function createEvent(payload: CreateEventPayload): Promise<unknown> {
  return apiRequest("/events/current/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(payload: UpdateEventPayload): Promise<unknown> {
  return apiRequest("/events/current/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateParticipationStatus(status: ParticipationStatus): Promise<unknown> {
  return apiRequest("/participation/current/", {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export type UpdateParticipationSharePayload = {
  userId: string;
  paymentShare: string;
  customShareAmount?: number;
};

export async function updateParticipationShare(payload: UpdateParticipationSharePayload): Promise<unknown> {
  return apiRequest("/participation/organizer/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
