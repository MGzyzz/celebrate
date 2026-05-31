import { apiRequest } from "./client";

export async function joinGroupByCode(code: string) {
  return apiRequest("/auth/join-group/", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
