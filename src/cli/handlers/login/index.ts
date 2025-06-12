import type { Arguments } from "yargs-types";
import {
  defaultApiHost,
  type globalConfigSchema,
  setConfig,
} from "../../middlewares/globalConfig.ts";
import z from "zod";
import { input } from "@inquirer/prompts";
import { ApiService } from "../../../apiService/index.ts";

const builder = {
  "api-host": {
    type: "string" as const,
    describe: "API server URL to save to config",
    alias: "H",
    default: defaultApiHost,
  },
  "api-token": {
    type: "string" as const,
    describe:
      "API token to use for authentication. Can be generated here: https://app.nanoapi.io/profile",
    alias: "T",
  },
};

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  } & {
    apiHost: string;
    apiToken: string | undefined;
  },
) {
  const globalConfig = argv.globalConfig as z.infer<typeof globalConfigSchema>;
  globalConfig.apiHost = argv.apiHost;
  globalConfig.token = argv.apiToken;

  if (globalConfig.token) {
    const apiService = new ApiService(
      globalConfig,
    );
    const response = await apiService.performRequest("GET", "/auth/me");
    if (response.status !== 200) {
      console.error("❌ Authentication failed");
      console.error(`   Status: ${response.status}`);
      console.error("   Make sure the API token is valid");
      Deno.exit(1);
    }

    setConfig(globalConfig);
    console.info("🔑 You are already logged in using an API token");
    Deno.exit(0);
  }

  console.info(
    `🎫 You are about to login to NanoAPI (${globalConfig.apiHost})`,
  );

  const email = await input({
    message: "Enter your email:",
    validate: (value) => {
      const result = z.string().email().safeParse(value);
      if (!result.success) {
        return "Please enter a valid email address";
      }
      return true;
    },
  });

  const apiService = new ApiService(
    globalConfig,
  );

  const requestOtpResponse = await apiService.performRequest(
    "POST",
    "/auth/requestOtp",
    {
      email,
    },
  );

  if (requestOtpResponse.status !== 200) {
    let errorMessage = "Unknown error";
    const responseBody = await requestOtpResponse.json();
    if (responseBody.error) {
      errorMessage = responseBody.error;
    }
    console.error(`Failed to request OTP: ${errorMessage}`);
    Deno.exit(1);
  }

  console.info(`OTP sent to ${email}`);

  const otp = await input({
    message: "Enter the OTP you received:",
    validate: (value) => {
      const result = z.string().min(6).max(6).refine(
        (val) => !isNaN(Number(val)),
      ).safeParse(value);
      if (!result.success) {
        return "OTP must be exactly 6 digits";
      }
      return true;
    },
  });

  const verifyOtpResponse = await apiService.performRequest(
    "POST",
    "/auth/verifyOtp",
    {
      email,
      otp,
    },
  );

  if (verifyOtpResponse.status !== 200) {
    let errorMessage = "Unknown error";
    const responseBody = await verifyOtpResponse.json();
    if (responseBody.error) {
      errorMessage = responseBody.error;
    }
    console.error(`Failed to verify OTP: ${errorMessage}`);
    Deno.exit(1);
  }

  const responseBody = await verifyOtpResponse.json() as {
    token: string;
  };

  globalConfig.jwt = responseBody.token;
  setConfig(globalConfig);

  console.info(`🚀 You are now logged in as ${email}!`);
}

export default {
  command: "login",
  describe: "Login to NanoAPI",
  builder,
  handler,
};
