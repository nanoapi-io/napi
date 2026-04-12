import type { Arguments } from "yargs-types";
import {
  type localConfigSchema,
  napiConfigMiddleware,
} from "../../middlewares/napiConfig.ts";
import {
  getExtensionsForLanguage,
  getFilesFromDirectory,
} from "../../../helpers/fileSystem/index.ts";
import {
  generateDependencyManifest,
} from "../../../manifest/dependencyManifest/index.ts";
import type { z } from "zod";
import type { globalConfigSchema } from "../../middlewares/globalConfig.ts";
import { join } from "@std/path";

const NAPI_DIR = ".napi";
const MANIFESTS_DIR = "manifests";

function builder(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs
    .middleware(napiConfigMiddleware)
    .option("branch", {
      type: "string",
      description: "The branch to use for the manifest",
    }).option("commit-sha", {
      type: "string",
      description: "The commit SHA to use for the manifest",
    }).option("commit-sha-date", {
      type: "string",
      description: "The commit SHA date to use for the manifest",
      coerce: (value: string) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(
            "Invalid date format for commit-sha-date. Please use ISO 8601 format (e.g. 2024-01-01T00:00:00Z)",
          );
        }
        return value;
      },
    }).option("labelingApiKey", {
      type: "string",
      description: "The API key to use for the labeling",
    });
}

async function getGitBranch(workDir: string): Promise<string> {
  try {
    const command = new Deno.Command("git", {
      args: ["branch", "--show-current"],
      cwd: workDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code === 0) {
      const branch = new TextDecoder().decode(stdout).trim();
      return branch || "main";
    }

    return "main";
  } catch {
    return "main";
  }
}

async function getGitCommitSha(workDir: string): Promise<string> {
  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "HEAD"],
      cwd: workDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code === 0) {
      return new TextDecoder().decode(stdout).trim();
    }

    return "";
  } catch {
    return "";
  }
}

async function getGitCommitDate(workDir: string): Promise<string> {
  try {
    const command = new Deno.Command("git", {
      args: ["log", "-1", "--format=%cI"],
      cwd: workDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();

    if (code === 0) {
      return new TextDecoder().decode(stdout).trim();
    }

    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function ensureManifestsDir(workdir: string): string {
  const manifestsDir = join(workdir, NAPI_DIR, MANIFESTS_DIR);
  try {
    Deno.mkdirSync(manifestsDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
  return manifestsDir;
}

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  } & {
    branch?: string;
    commitSha?: string;
    commitShaDate?: string;
    labelingApiKey?: string;
  },
) {
  const napiConfig = argv.napiConfig as z.infer<typeof localConfigSchema>;
  const globalConfig = argv.globalConfig as z.infer<typeof globalConfigSchema>;

  let branch: string;
  let commitSha: string;
  let commitShaDate: string;

  if (argv.branch) {
    branch = argv.branch;
    console.info(`🌿 Using provided branch: ${branch}`);
  } else {
    console.info("🔍 Detecting Git branch...");
    const detectedBranch = await getGitBranch(argv.workdir);
    const userBranch = prompt(
      `Enter branch name or leave empty:`,
      detectedBranch,
    );
    branch = userBranch || detectedBranch;
    console.info(`🌿 Branch: ${branch}`);
  }

  if (argv.commitSha) {
    commitSha = argv.commitSha;
    console.info(`📝 Using provided commit: ${commitSha.substring(0, 8)}...`);
  } else {
    console.info("🔍 Detecting Git commit SHA...");
    const detectedCommitSha = await getGitCommitSha(argv.workdir);
    const userCommitSha = prompt(
      `Enter commit SHA or leave empty:`,
      detectedCommitSha,
    );
    commitSha = userCommitSha || detectedCommitSha;
    if (commitSha) {
      console.info(`📝 Commit SHA: ${commitSha.substring(0, 8)}...`);
    }
  }

  if (argv.commitShaDate) {
    commitShaDate = argv.commitShaDate;
    console.info(`📅 Using provided commit date: ${commitShaDate}`);
  } else {
    console.info("🔍 Detecting Git commit date...");
    const detectedCommitShaDate = await getGitCommitDate(argv.workdir);
    const userCommitShaDate = prompt(
      `Enter commit date or leave empty:`,
      detectedCommitShaDate,
    );
    commitShaDate = userCommitShaDate || detectedCommitShaDate;
    console.info(`📅 Commit date: ${commitShaDate}`);
  }

  const start = Date.now();

  console.info("🔧 Generating dependency manifest...");
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

    const dependencyManifest = await generateDependencyManifest(
      files,
      napiConfig,
      globalConfig,
      argv.labelingApiKey,
    );

    const manifestsDir = ensureManifestsDir(argv.workdir);

    const timestamp = Date.now();
    const shortSha = commitSha ? commitSha.substring(0, 7) : "unknown";
    const manifestId = `${timestamp}-${shortSha}`;
    const manifestFileName = `${manifestId}.json`;

    const manifestEnvelope = {
      id: manifestId,
      branch,
      commitSha,
      commitShaDate,
      createdAt: new Date().toISOString(),
      manifest: dependencyManifest,
    };

    const manifestPath = join(manifestsDir, manifestFileName);
    Deno.writeTextFileSync(
      manifestPath,
      JSON.stringify(manifestEnvelope, null, 2),
    );

    const duration = Date.now() - start;
    console.info(
      `✅ Manifest saved successfully in ${duration}ms`,
    );
    console.info(`📄 Generated manifest contains:`);
    console.info(`   • ${Object.keys(dependencyManifest).length} files`);
    console.info(`   • Dependencies and relationships mapped`);
    console.info(`\n💾 Saved to: ${manifestPath}`);
    console.info(`🔍 View it with: napi view`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Failed to generate manifest");
    console.error(`   Error: ${errorMessage}`);
    console.error("");
    console.error("💡 Common solutions:");
    console.error("   • Check that your project files are accessible");
    console.error("   • Verify your .napirc configuration");

    Deno.exit(1);
  }
}

export default {
  command: "generate",
  describe: "generate a dependency manifest for your program",
  builder,
  handler,
};
