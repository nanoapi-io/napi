import { AuditMap } from "./types";

export async function getAuditFiles() {
  const response = await fetch("/api/audit", {
    method: "GET",
  });

  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to get audit data");
  }

  const responseBody = (await response.json()) as Promise<AuditMap>;

  return await responseBody;
}
