import type { ArgumentsCamelCase, InferredOptionTypes } from "yargs";
import type { globalOptions } from "../../index.ts";
import { TelemetryEvents, trackEvent } from "../../../telemetry.ts";
import type { localConfigSchema } from "../../../config/localConfig.ts";
import { runServer } from "../../helpers/server.ts";
import {
  dependencyManifestExists,
  getDependencyManifest,
  getDependencyManifestPath,
} from "../../../manifest/dependencyManifest/index.ts";
import type { z } from "zod";

function handler(
  argv: ArgumentsCamelCase<InferredOptionTypes<typeof globalOptions>>,
) {
  const napiConfig = argv.napiConfig as z.infer<typeof localConfigSchema>;

  const start = Date.now();

  console.info("🔍 Loading dependency manifest...");

  trackEvent(TelemetryEvents.CLI_MANIFEST_VIEW_COMMAND, {
    message: "`napi manifest view` command started",
  });

  try {
    const manifestPath = getDependencyManifestPath(argv.workdir, napiConfig);
    const manifestExists = dependencyManifestExists(argv.workdir, napiConfig);

    if (!manifestExists) {
      console.error("❌ No dependency manifest found");
      console.error(`   Looking for: ${manifestPath}`);
      console.error("");
      console.error("💡 To generate a manifest:");
      console.error("   1. Run: napi manifest generate");
      console.error("   2. Then try: napi manifest view");
      Deno.exit(1);
    }

    console.info(`📄 Found manifest: ${manifestPath}`);
    console.info("📊 Loading dependency data...");

    const dependencyManifest = getDependencyManifest(argv.workdir, napiConfig);

    const fileCount = Object.keys(dependencyManifest).length;
    console.info(`✅ Loaded manifest with ${fileCount} files`);
    console.info("🚀 Starting web server...");

    runServer(argv.workdir, napiConfig, dependencyManifest);

    trackEvent(TelemetryEvents.CLI_MANIFEST_VIEW_COMMAND, {
      message: "`napi manifest view` command finished",
      duration: Date.now() - start,
    });
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Failed to view manifest");
    console.error(`   Error: ${errorMessage}`);
    console.error("");
    console.error("💡 Common solutions:");
    console.error("   • Run 'napi manifest generate' to create a manifest");
    console.error("   • Check that the manifest file is not corrupted");
    console.error("   • Verify file permissions");

    trackEvent(TelemetryEvents.CLI_MANIFEST_VIEW_COMMAND, {
      message: "`napi manifest view` command failed",
      duration: duration,
      error: errorMessage,
    });

    Deno.exit(1);
  }
}

export default {
  command: "view",
  describe: "view the dependency manifest for your program",
  builder: {},
  handler,
};
