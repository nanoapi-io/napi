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
import { ApiService } from "../../../apiService/index.ts";
import {
  defaultApiHost,
  type globalConfigSchema,
} from "../../middlewares/globalConfig.ts";
import { isAuthenticatedMiddleware } from "../../middlewares/isAuthenticated.ts";

function builder(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs
    .middleware(napiConfigMiddleware)
    .middleware(isAuthenticatedMiddleware)
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
        // Validate date format
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(
            "Invalid date format for commit-sha-date. Please use ISO 8601 format (e.g. 2024-01-01T00:00:00Z)",
          );
        }
        return value;
      },
    }).option("upload-batch", {
      type: "number",
      description: "Number of files to process in parallel batches",
      default: 20,
    });
}

/**
 * Get the current Git branch name
 */
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
      return branch || "main"; // fallback to 'main' if branch name is empty
    }

    return "main"; // fallback branch name
  } catch {
    return "main"; // fallback if git command fails
  }
}

/**
 * Get the current Git commit hash
 */
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

    return ""; // return empty string if no commit found
  } catch {
    return ""; // return empty string if git command fails
  }
}

/**
 * Get the current Git commit date in ISO format
 */
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

    return new Date().toISOString(); // fallback to current date
  } catch {
    return new Date().toISOString(); // fallback to current date if git command fails
  }
}

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  } & {
    branch?: string;
    commitSha?: string;
    commitShaDate?: string;
    "upload-batch": number;
  },
) {
  const napiConfig = argv.napiConfig as z.infer<typeof localConfigSchema>;
  const globalConfig = argv.globalConfig as z.infer<typeof globalConfigSchema>;

  let branch: string;
  let commitSha: string;
  let commitShaDate: string;

  // Handle branch
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

  // Handle commit SHA
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

  // Handle commit SHA date
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

    const dependencyManifest = generateDependencyManifest(files, napiConfig);

    // Upload manifest to API instead of writing to disk
    const apiService = new ApiService(
      globalConfig,
    );

    for (const projectId of napiConfig.projectIds) {
      try {
        const response = await apiService.performRequest(
          "POST",
          "/manifests",
          {
            projectId,
            branch,
            commitSha,
            commitShaDate,
            manifest: dependencyManifest,
          },
        );
        if (response.status !== 201) {
          console.error(
            `❌ Failed to upload manifest to API for project id: ${projectId}`,
          );
          const responseBody = await response.json();
          if (responseBody.error) {
            if (responseBody.error.includes("access_disabled")) {
              console.error(
                "\n💳 Your workspace has been disabled you need to add or change your payment method to continue uploading manifests",
              );
              console.error(
                "Go to your workspace settings and add or update a payment method: https://app.nanoapi.io",
              );
            } else {
              console.error(`   Error: ${responseBody.error}`);
            }
          } else {
            console.error(`   Status: ${response.status}`);
          }
          Deno.exit(1);
        }

        const responseBody = await response.json() as { id: number };

        const duration = Date.now() - start;
        console.info(
          `✅ Manifest uploaded successfully for project id: ${projectId} in ${duration}ms`,
        );
        console.info(`📄 Generated manifest contains:`);
        console.info(`   • ${Object.keys(dependencyManifest).length} files`);
        console.info(`   • Dependencies and relationships mapped`);

        if (globalConfig.apiHost === defaultApiHost) {
          console.info(
            `\nView it here: https://app.nanoapi.io/projects/${projectId}/manifests/${responseBody.id}`,
          );
        }

        console.info("🔍 Requesting labeling...");
        await requestLabeling(
          files,
          responseBody.id,
          apiService,
          argv["upload-batch"],
        );
        console.info("✅ Labeling requested successfully");
      } catch (error) {
        console.error(
          `❌ Failed to upload manifest to API for project id: ${projectId}`,
        );
        console.error(
          `   Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        Deno.exit(1);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Failed to generate manifest");
    console.error(`   Error: ${errorMessage}`);
    console.error("");
    console.error("💡 Common solutions:");
    console.error("   • Check that your project files are accessible");
    console.error("   • Verify your .napirc configuration");
    console.error("   • Ensure you're logged in (run 'napi login')");

    Deno.exit(1);
  }
}

export default {
  command: "generate",
  describe: "generate a manifest for your program",
  builder,
  handler,
};

async function requestLabeling(
  files: Map<string, { path: string; content: string }>,
  manifestId: number,
  apiService: ApiService,
  batchSize: number,
) {
  // Prepare for labeling
  console.info("🔍 Preparing for labeling...");
  const filesArray = Array.from(files.values());

  // Upload files in configurable batches
  const allUploadResults: { path: string; bucketName: string | null }[] = [];

  for (let i = 0; i < filesArray.length; i += batchSize) {
    const batch = filesArray.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(filesArray.length / batchSize);

    console.info(
      `📝 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)...`,
    );

    // Separate empty files from files that need uploading
    const filesToUpload = batch.filter((file) =>
      file.content && file.content.trim() !== ""
    );
    const emptyFiles = batch.filter((file) =>
      !file.content || file.content.trim() === ""
    );

    // Add empty files to results with null bucket names
    emptyFiles.forEach((file) => {
      allUploadResults.push({ path: file.path, bucketName: null });
    });

    // Upload non-empty files in parallel
    if (filesToUpload.length > 0) {
      const batchPromises = filesToUpload.map(async (file) => {
        try {
          const response = await apiService.performRequest(
            "POST",
            "/labeling/temp",
            { path: file.path, content: file.content },
          );

          if (response.status !== 200) {
            const errorText = await response.text();
            throw new Error(
              `Failed to upload file ${file.path}: ${errorText} ${response.status}`,
            );
          }

          const { bucketName } = await response.json() as {
            bucketName: string;
          };
          return { path: file.path, bucketName };
        } catch (error) {
          console.error(
            `❌ Failed to upload ${file.path}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const successfulResults = batchResults.filter((
        result,
      ): result is { path: string; bucketName: string } => result !== null);
      allUploadResults.push(...successfulResults);

      const skippedCount = emptyFiles.length;
      const failedCount = filesToUpload.length - successfulResults.length;

      if (failedCount > 0) {
        console.warn(
          `⚠️ Batch ${batchNumber} completed (${successfulResults.length} uploaded, ${failedCount} failed, ${skippedCount} skipped)`,
        );
      } else {
        console.info(
          `✅ Batch ${batchNumber} completed (${successfulResults.length} files uploaded, ${skippedCount} skipped)`,
        );
      }
    } else {
      console.info(
        `✅ Batch ${batchNumber} completed (${emptyFiles.length} files skipped)`,
      );
    }
  }

  const labelingMap = Object.fromEntries(
    allUploadResults.map(({ path, bucketName }) => [path, bucketName]),
  );

  // Upload labeling payload as a temp file
  const labelingMapFile = await apiService.performRequest(
    "POST",
    "/labeling/temp",
    {
      path: "labelingMapFile.json",
      content: JSON.stringify(labelingMap, null, 2),
    },
  );

  if (labelingMapFile.status !== 200) {
    console.error(`❌ Failed to upload labeling payload`);
    Deno.exit(1);
  }

  const labelingFileMapFileResponse = await labelingMapFile.json() as {
    bucketName: string;
  };

  console.info(`✅ Labeling preparation completed successfully`);

  // request labeling to API with the temp file
  const labelingResponse = await apiService.performRequest(
    "POST",
    "/labeling/request",
    {
      manifestId,
      fileMapName: labelingFileMapFileResponse.bucketName,
    },
  );

  if (labelingResponse.status !== 200) {
    console.error(`❌ Failed to request labeling`);
    console.error(
      `   Error: ${labelingResponse.statusText} ${labelingResponse.status} ${await labelingResponse
        .text()}`,
    );
    Deno.exit(1);
  }

  console.info(`✅ Labeling request completed successfully`);
}
