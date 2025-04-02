import { EventEmitter } from "events";
import os from "os";
import { getOrCreateGlobalConfig } from "./config/globalConfig";
import packageJson from "../package.json";

export enum TelemetryEvents {
  APP_START = "app_start",
  CLI_INIT_COMMAND = "cli_init_command",
  CLI_AUDIT_VIEW_COMMAND = "cli_audit_view_command",

  API_REQUEST_CONGIG = "api_request_config",
  API_REQUEST_AUDIT_VIEW = "api_request_audit_view",
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
    if (process.env.NODE_ENV !== "development") {
      const response = await fetch(TELEMETRY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "napi",
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.debug(`Failed to send telemetry data: ${response.statusText}`);
      }
    }

    clearTimeout(timeoutId);
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
