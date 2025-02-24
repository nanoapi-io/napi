import { Endpoint } from "./types";
import getAPIData from "../../apiData";

export async function scanCodebase() {
  // const response = await fetch("/api/split/scan", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // });

  // if (!response.ok || response.status !== 200) {
  //   throw new Error("Failed to scan endpoints");
  // }

  // const responseBody = (await response.json()) as Promise<{
  //   endpoints: Endpoint[];
  // }>;

  const responseBody = {
    endpoints: getAPIData()
  }

  return await responseBody;
}

export async function syncEndpoints(payload: { endpoints: Endpoint[] }) {
  const response = await fetch("/api/split/sync", {
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

export async function splitCodebase() {
  const response = await fetch("/api/split", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok || response.status !== 200) {
    throw new Error("Failed to sync endpoints");
  }
}
