import { NapiConfig } from "./types";

export async function getConfig() {
  const response = await fetch("/api/config", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to get config");
  }

  const responseBody = (await response.json()) as Promise<NapiConfig>;

  return await responseBody;
}
