import type { Arguments } from "yargs-types";
import {
  defaultApiHost,
  type globalConfigSchema,
  setJwt,
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
};

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  } & {
    apiHost: string;
  },
) {
  const globalConfig = argv.globalConfig as z.infer<typeof globalConfigSchema>;

  console.info(`🔑 You are about to login to NanoAPI (${argv.apiHost})`);

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
    argv.apiHost,
    undefined,
    undefined,
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

  setJwt(globalConfig, argv.apiHost, responseBody.token);

  console.info(`🚀 You are now logged in as ${email}!`);
}

export default {
  command: "login",
  describe: "Login to NanoAPI",
  builder,
  handler,
};
