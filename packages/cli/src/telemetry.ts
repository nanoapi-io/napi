// telemetry.ts
import { EventEmitter } from "events";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { request } from "http";
import { join } from "path";
import { URL } from "url";
import { v4 as uuidv4 } from "uuid";

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

const telemetry = new EventEmitter();
// TODO: @erbesharat: Deploy mongoose script to GCF and update the endpoint
const TELEMETRY_ENDPOINT =
  process.env.TELEMETRY_ENDPOINT || "http://localhost:3000/telemetry";
const SESSION_FILE_PATH = join("/tmp", "napi_session_id");

// getSessionId generates a new session ID and cache it in SESSION_FILE_PATH
const getSessionId = (): string => {
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
};

const SESSION_ID = getSessionId();

telemetry.on("event", (data) => {
  sendTelemetryData(data);
});

const sendTelemetryData = (data: any) => {
  try {
    const url = new URL(TELEMETRY_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(JSON.stringify(data)),
        "User-Agent": "napi",
      },
    };

    const req = request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        console.info(`Telemetry response: ${res.statusCode} - ${responseData}`);
      });
    });

    req.on("error", (error) => {
      console.error(`Failed to send telemetry data: ${error}`);
    });

    req.write(JSON.stringify(data));
    req.end();
  } catch (error) {
    console.error(`Error in telemetry setup: ${error}`);
  }
};

export const trackEvent = (eventId: TelemetryEvents, eventData: any) => {
  const telemetryPayload = {
    sessionId: SESSION_ID,
    eventId,
    data: eventData,
    timestamp: new Date().toISOString(),
  };

  telemetry.emit("event", telemetryPayload);
};
