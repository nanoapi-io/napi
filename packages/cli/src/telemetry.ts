import { EventEmitter } from "events";
import os from "os";
import { getOrCreateGlobalConfig } from "./config/globalConfig";
import packageJson from "../package.json";

export enum TelemetryEvents {
  APP_START = "app_start",
  INIT_COMMAND = "init_command",
  ANNOTATE_COMMAND = "annotate_command",
  SPLIT_COMMAND = "split_command",
  UI_OPEN = "ui_open",
  SERVER_STARTED = "server_started",
  API_REQUEST = "api_request",
  ERROR_OCCURRED = "error_occurred",
  USER_ACTION = "user_action",
}

export interface TelemetryEvent {
  userId: string;
  os: string;
  version: string;
  eventId: TelemetryEvents;
  data: Record<string, unknown>;
  timestamp: string;
}

const telemetry = new EventEmitter();
const TELEMETRY_ENDPOINT =
  process.env.TELEMETRY_ENDPOINT ||
  "https://napi-watchdog-api-gateway-33ge7a49.nw.gateway.dev/telemetryHandler";

telemetry.on("event", (data) => {
  sendTelemetryData(data);
});

async function sendTelemetryData(data: TelemetryEvent) {
  const controller = new AbortController();
  const timeoutSeconds = 15;
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    const response = await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "napi",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.debug(`Failed to send telemetry data: ${response.statusText}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.debug("Request timed out");
    } else {
      console.debug(`Failed to send telemetry data: ${error}`);
    }
  }
}

export async function trackEvent(
  eventId: TelemetryEvents,
  eventData: Record<string, unknown>,
) {
  const config = await getOrCreateGlobalConfig();

  const telemetryPayload: TelemetryEvent = {
    userId: config.userId,
    os: os.platform(),
    version: packageJson.version,
    eventId,
    data: eventData,
    timestamp: new Date().toISOString(),
  };

  telemetry.emit("event", telemetryPayload);
}
