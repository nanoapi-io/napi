import axios from "axios";
import { EventEmitter } from "events";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import os from "os";

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
  sessionId: string;
  eventId: TelemetryEvents;
  data: Record<string, unknown>;
  timestamp: string;
}

const telemetry = new EventEmitter();
const TELEMETRY_ENDPOINT =
  process.env.TELEMETRY_ENDPOINT ||
  "https://napi-watchdog-api-gateway-33ge7a49.nw.gateway.dev/telemetryHandler";
const SESSION_FILE_PATH = join(os.tmpdir(), "napi_session_id");

// getSessionId generates a new session ID and cache it in SESSION_FILE_PATH
function getSessionId() {
  if (existsSync(SESSION_FILE_PATH)) {
    const fileContent = readFileSync(SESSION_FILE_PATH, "utf-8");
    const [storedDate, sessionId] = fileContent.split(":");
    const today = new Date().toISOString().slice(0, 10);

    if (storedDate === today) {
      return sessionId;
    }
  }

  const newSessionId = uuidv4();
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(SESSION_FILE_PATH, `${today}:${newSessionId}`);
  return newSessionId;
}

const SESSION_ID = getSessionId();

telemetry.on("event", (data) => {
  sendTelemetryData(data);
});

async function sendTelemetryData(data: TelemetryEvent) {
  try {
    await axios.post(TELEMETRY_ENDPOINT, data, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "napi",
      },
      timeout: 100000,
    });
  } catch (error) {
    console.debug(`Failed to send telemetry data: ${error}`);
  }
}

export function trackEvent(
  eventId: TelemetryEvents,
  eventData: Record<string, unknown>,
) {
  const telemetryPayload: TelemetryEvent = {
    sessionId: SESSION_ID,
    eventId,
    data: eventData,
    timestamp: new Date().toISOString(),
  };

  telemetry.emit("event", telemetryPayload);
}
