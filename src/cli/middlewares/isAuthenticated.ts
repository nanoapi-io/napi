import type { Arguments } from "yargs-types";
import type { z } from "zod";
import type { globalConfigSchema } from "./globalConfig.ts";
import { ApiService } from "../../apiService/index.ts";

export async function isAuthenticatedMiddleware(
  args: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  const globalConfig = args.globalConfig as z.infer<typeof globalConfigSchema>;

  if (!globalConfig.jwt) {
    console.error("❌ Not logged in");
    console.error("   Please login first using: napi login");
    Deno.exit(1);
  }

  try {
    const apiService = new ApiService(
      globalConfig,
    );
    const response = await apiService.performRequest("GET", "/auth/me");

    if (response.status === 401) {
      console.error("❌ Authentication expired");
      console.error("   Please login again using: napi login");
      Deno.exit(1);
    }

    if (response.status !== 200) {
      console.error("❌ Authentication check failed");
      console.error(`   Status: ${response.status}`);
      console.error("   Please try logging in again using: napi login");
      Deno.exit(1);
    }

    console.info("✅ Authentication verified");
  } catch (error) {
    console.error("❌ Failed to verify authentication");
    console.error(
      `   Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error("   Please check your connection and try logging in again");
    Deno.exit(1);
  }
}
