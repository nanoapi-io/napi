import { AuditResponse } from "./types";

export async function getAudit() {
  const response = await fetch("/api/audit/2", {
    method: "GET",
  });

  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to get audit data");
  }

  const responseBody = (await response.json()) as Promise<AuditResponse>;

  return await responseBody;
}
