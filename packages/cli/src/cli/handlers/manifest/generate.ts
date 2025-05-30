import type { ArgumentsCamelCase, InferredOptionTypes } from "npm:yargs";
import type { globalOptions } from "../../index.ts";
import { TelemetryEvents, trackEvent } from "../../../telemetry.ts";
import type { localConfigSchema } from "../../../config/localConfig.ts";
import {
  getExtensionsForLanguage,
  getFilesFromDirectory,
} from "../../../helpers/fileSystem/index.ts";
import {
  generateDependencyManifest,
  getDependencyManifestPath,
} from "../../../manifest/dependencyManifest/index.ts";
import type { z } from "zod";

function handler(
  argv: ArgumentsCamelCase<InferredOptionTypes<typeof globalOptions>>,
) {
  const napiConfig = argv.napiConfig as z.infer<typeof localConfigSchema>;

  const start = Date.now();

  console.info("🔧 Generating dependency manifest...");

  trackEvent(TelemetryEvents.CLI_MANIFEST_GENERATE_COMMAND, {
    message: "`napi manifest generate` command started",
  });

  try {
    console.info(`📝 Language: ${napiConfig.language}`);
    console.info(`📁 Working directory: ${argv.workdir}`);

    const fileExtensions = getExtensionsForLanguage(napiConfig.language);
    console.info(
      `🔍 Looking for files with extensions: ${fileExtensions.join(", ")}`,
    );

    const files = getFilesFromDirectory(argv.workdir, {
      includes: napiConfig.project.include,
      excludes: napiConfig.project.exclude,
      extensions: fileExtensions,
      logMessages: true,
    });

    if (files.size === 0) {
      console.warn("⚠️  No files found matching your project configuration");
      console.warn("   Check your include/exclude patterns in .napirc");
      console.warn("");
      console.warn("💡 Current patterns:");
      console.warn(`   Include: ${napiConfig.project.include.join(", ")}`);
      if (napiConfig.project.exclude) {
        console.warn(`   Exclude: ${napiConfig.project.exclude.join(", ")}`);
      }
      Deno.exit(1);
    }

    console.info(`📊 Processing ${files.size} files...`);

    const dependencyManifest = generateDependencyManifest(files, napiConfig);

    const manifestPath = getDependencyManifestPath(
      argv.workdir,
      napiConfig,
    );

    console.info(`💾 Writing manifest to: ${manifestPath}`);

    Deno.writeTextFileSync(
      manifestPath,
      JSON.stringify(dependencyManifest, null, 2),
    );

    const duration = Date.now() - start;

    console.info(`✅ Manifest generated successfully in ${duration}ms`);
    console.info(`📄 Generated manifest contains:`);
    console.info(`   • ${Object.keys(dependencyManifest).length} files`);
    console.info(`   • Dependencies and relationships mapped`);

    trackEvent(TelemetryEvents.CLI_MANIFEST_GENERATE_COMMAND, {
      message: "`napi manifest generate` command finished",
      duration: duration,
    });
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Failed to generate manifest");
    console.error(`   Error: ${errorMessage}`);
    console.error("");
    console.error("💡 Common solutions:");
    console.error("   • Check that your project files are accessible");
    console.error("   • Verify your .napirc configuration");
    console.error(
      "   • Ensure you have write permissions to the output directory",
    );

    trackEvent(TelemetryEvents.CLI_MANIFEST_GENERATE_COMMAND, {
      message: "`napi manifest generate` command failed",
      duration: duration,
      error: errorMessage,
    });

    Deno.exit(1);
  }
}

export default {
  command: "generate",
  describe: "generate a manifest for your program",
  builder: {},
  handler,
};
