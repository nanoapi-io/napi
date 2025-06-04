import { confirm, input } from "npm:@inquirer/prompts";
import { z } from "npm:zod";
import type { ArgumentsCamelCase, InferredOptionTypes } from "npm:yargs";
import { setUserAuthToken } from "../../../config/globalConfig.ts";
import { TelemetryEvents, trackEvent } from "../../../telemetry.ts";
import type { globalOptions } from "../../index.ts";
import {
  getOrCreateGlobalConfig,
  setUserEmail,
} from "../../../config/globalConfig.ts";

function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}

async function handler(
  argv: ArgumentsCamelCase<InferredOptionTypes<typeof globalOptions>>,
) {
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

  const globalConfig = getOrCreateGlobalConfig();

  const host = globalConfig.napiHost || argv.host;

  const response = await fetch(`${host}/v1/auth/requestOtp`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    console.error("Failed to send verification code");
    return;
  }

  console.info(`Thank you. We have sent a verification code to ${email}`);

  console.info(
    "(The email may take a moment to arrive, please wait up to 60 seconds before resending)",
  );

  const code = await input({
    message: "Please enter the verification code:",
  });

  const tokenResponse = await fetch(
    `${host}/v1/auth/verifyOtp`,
    {
      method: "POST",
      body: JSON.stringify({ email, code }),
    },
  );

  if (!tokenResponse.ok) {
    console.error("Failed to verify OTP");
    return;
  }

  const tokenBody = await tokenResponse.json();

  await setUserAuthToken(tokenBody.token);

  console.info("🔑 Login successful!");

  const confirmEmail = await confirm({
    message: "Would you like to store the email for future login?",
    default: false,
  });

  if (confirmEmail) {
    setUserEmail(email);
    console.info("Email stored successfully for future logins.");
  }
}

export default handler;
