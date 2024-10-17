import { Endpoint } from "./types";

export async function syncEndpoints(payload: {
  entrypointPath: string;
  targetDir?: string;
  endpoints: Endpoint[];
}) {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to sync endpoints");
  }
}
