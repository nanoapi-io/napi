import {
  setUserAuthToken
} from "../../../config/globalConfig.ts";
import { TelemetryEvents, trackEvent } from "../../../telemetry.ts";
import { input } from "npm:@inquirer/prompts";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handler() {
  console.info("🔑 Logging in to NanoAPI...");

  trackEvent(TelemetryEvents.CLI_LOGIN_COMMAND, {
    message: "Login command started",
  });

  const email = await input({
    message: "Please enter your email to continue:",
    validate: (input) => {
      if (!input) {
        return "Email is required";
      }
      if (!isValidEmail(input)) {
        return "Invalid email address";
      }
      return true;
    },
  });

  const response = await fetch("https://api.nanoapi.io/v1/auth/requestOtp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    console.error("Failed to send verification code");
    return;
  }

  console.info(`Thank you. We have sent a verification code to ${email}`);

  console.info('(The email may take a moment to arrive, please wait up to 60 seconds before resending)');

  const code = await input({
    message: "Please enter the verification code:",
  });

  const tokenResponse = await fetch("https://api.nanoapi.io/v1/auth/verifyOtp", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });

  if (!tokenResponse.ok) {
    console.error('Failed to verify OTP');
    return;
  }

  const tokenBody = await tokenResponse.json();

  await setUserAuthToken(tokenBody.token);

  console.info("🔑 Login successful!");
}

export default handler;
