import type { ArgumentsCamelCase } from "yargs";
import {
  getConfigFromWorkDir,
  isConfigExistInWorkdir,
} from "../../config/localConfig.ts";
import { join } from "@std/path";

export function napiConfigMiddleware(
  args: ArgumentsCamelCase<{
    workdir: string;
  }>,
) {
  try {
    // First, check if the workdir itself exists
    try {
      const stat = Deno.statSync(args.workdir);
      if (!stat.isDirectory) {
        console.error("❌ Error: Specified path is not a directory");
        console.error(`   Path: ${args.workdir}`);
        console.error("   Please specify a valid directory path.");
        Deno.exit(1);
      }
    } catch (error: unknown) {
      if (error instanceof Deno.errors.NotFound) {
        console.error("❌ Error: Directory not found");
        console.error(`   Path: ${args.workdir}`);
        console.error(
          "   Please check that the directory exists and try again.",
        );
      } else {
        console.error("❌ Error: Cannot access directory");
        console.error(`   Path: ${args.workdir}`);
        console.error(
          `   Reason: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      Deno.exit(1);
    }

    // Check if .napirc config file exists
    const isConfigExist = isConfigExistInWorkdir(args.workdir);

    if (!isConfigExist) {
      console.error("❌ No .napirc configuration file found");
      console.error(`   Looking in: ${args.workdir}`);
      console.error("   Expected file: .napirc");
      console.error("");
      console.error("💡 To get started:");
      console.error("   1. Navigate to your project directory");
      console.error("   2. Run: napi init");
      console.error("   3. Follow the interactive setup");
      Deno.exit(1);
    }

    // Then validate and load the config
    try {
      const napiConfig = getConfigFromWorkDir(args.workdir);
      args.napiConfig = napiConfig;
    } catch (error: unknown) {
      console.error("❌ Invalid .napirc configuration file");
      console.error(`   File: ${join(args.workdir, ".napirc")}`);
      console.error(
        `   Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error("");
      console.error("💡 To fix this:");
      console.error("   1. Check your .napirc file for syntax errors");
      console.error("   2. Or run 'napi init' to regenerate the configuration");
      Deno.exit(1);
    }
  } catch (error: unknown) {
    // Catch any unexpected errors
    console.error("❌ Unexpected error while loading configuration");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error("");
    console.error("💡 If this persists, please report this issue at:");
    console.error("   https://github.com/nanoapi-io/napi/issues");
    Deno.exit(1);
  }
}
