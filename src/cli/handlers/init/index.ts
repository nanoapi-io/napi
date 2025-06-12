import type { Arguments } from "yargs-types";
import {
  createConfig,
  getConfigFromWorkDir,
} from "../../middlewares/napiConfig.ts";
import { join, normalize, relative } from "@std/path";
import type z from "zod";
import type { localConfigSchema } from "../../middlewares/napiConfig.ts";
import pythonStdlibList from "../../../scripts/generate_python_stdlib_list/output.json" with {
  type: "json",
};
import { confirm, input, search, select } from "@inquirer/prompts";
import { globSync } from "glob";
import {
  cLanguage,
  csharpLanguage,
  javaLanguage,
  pythonLanguage,
} from "../../../helpers/treeSitter/parsers.ts";
import { ApiService } from "../../../apiService/index.ts";
import type { globalConfigSchema } from "../../middlewares/globalConfig.ts";
import { isAuthenticatedMiddleware } from "../../middlewares/isAuthenticated.ts";

function builder(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs
    .middleware(isAuthenticatedMiddleware);
}

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  const globalConfig = argv.globalConfig as z.infer<typeof globalConfigSchema>;
  const apiHost = globalConfig.apiHost;

  try {
    // Check if config already exists
    try {
      if (getConfigFromWorkDir(argv.workdir)) {
        const confirmOverwrite = await confirm({
          message:
            `⚠️ A .napirc file already exists in the selected directory. Do you want to overwrite it?`,
          default: false,
        });
        if (!confirmOverwrite) {
          console.info("✅ Keeping existing configuration");
          Deno.exit(0);
        }
        console.info("🔄 Proceeding with configuration overwrite");
      }
    } catch {
      // Config doesn't exist, continue with initialization
      console.info(
        "📝 No existing valid configuration found, creating new one",
      );
    }

    console.info("\n🔧 Starting interactive configuration...");

    // Generate the config using the interactive prompts
    const napiConfig = await generateConfig(
      argv.workdir,
      apiHost,
      globalConfig,
    );

    // Confirm and show the config
    console.info("\n📋 Generated configuration:");
    console.info("─".repeat(50));
    console.info(JSON.stringify(napiConfig, null, 2));
    console.info("─".repeat(50));

    const confirmSave = await confirm({
      message: "Do you want to save this configuration?",
      default: true,
    });

    if (confirmSave) {
      createConfig(napiConfig, argv.workdir);
      console.info("\n✅ Configuration saved successfully!");
      console.info(`📄 Created: ${argv.workdir}/.napirc`);
      console.info("🎉 Your NanoAPI project is ready!");
    } else {
      console.info("❌ Configuration not saved");
      console.info("   Run 'napi init' again when you're ready to configure");
      Deno.exit(0);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("❌ Initialization failed");
    console.error(`   Error: ${errorMessage}`);
    console.error("\n💡 Common solutions:");
    console.error("  • Check that you have write permissions in the directory");
    console.error("  • Ensure the directory exists and is accessible");
    console.error("  • Try running the command again");

    Deno.exit(1);
  }
}

export default {
  command: "init",
  describe: "Initialize a NanoAPI project with interactive configuration",
  builder,
  handler,
};

/**
 * Shows files that match a given glob pattern
 */
function showMatchingFiles(
  workDir: string,
  pattern: string,
  maxFilesToShow = 10,
) {
  try {
    // Find matching files using glob
    const files = globSync(pattern, {
      cwd: workDir,
      nodir: true,
    });

    if (files.length === 0) {
      console.info(`No files match the pattern '${pattern}'`);
      return;
    }

    const totalMatches = files.length;
    const filesToShow = files.slice(0, maxFilesToShow);

    console.info(`\nPattern '${pattern}' matches ${totalMatches} file(s):`);
    filesToShow.forEach((file: string) => console.info(`- ${file}`));

    if (totalMatches > maxFilesToShow) {
      console.info(`... and ${totalMatches - maxFilesToShow} more`);
    }
  } catch (error) {
    console.info(`Error previewing files for pattern '${pattern}': ${error}`);
  }
}

/**
 * Shows the final set of files that will be included after applying include and exclude patterns
 */
function showFinalFileSelection(
  workDir: string,
  includePatterns: string[],
  excludePatterns: string[],
  maxFilesToShow = 20,
) {
  try {
    // Get all included files
    const files = globSync(includePatterns, {
      cwd: workDir,
      nodir: true,
      ignore: excludePatterns, // Default ignores
    });

    // Display results
    console.info("\n🔍 FINAL FILE SELECTION");
    console.info(
      `After applying all patterns, ${files.length} files will be processed:`,
    );

    const filesToShow = files.slice(0, maxFilesToShow);
    filesToShow.forEach((file: string) => console.info(`- ${file}`));

    if (files.length > maxFilesToShow) {
      console.info(`... and ${files.length - maxFilesToShow} more`);
    }

    if (files.length === 0) {
      console.warn(
        "\n⚠️ WARNING: No files match your include/exclude patterns. Please review your configuration.",
      );
    }
  } catch (error) {
    console.info(`Error showing final file selection: ${error}`);
  }
}

/**
 * Get an overview of the project structure
 */
function getProjectStructureOverview(workDir: string): string[] {
  const overview: string[] = [];

  try {
    const traverseDirectory = (dir: string, depth: number) => {
      const entries = Deno.readDirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = relative(workDir, fullPath);

        try {
          const stat = Deno.statSync(fullPath);
          const isDirectory = stat.isDirectory;

          const indentation = "  ".repeat(depth);
          const icon = isDirectory ? "📂" : "📄";
          const line = `${indentation}${icon} ${relativePath}`;
          overview.push(line);

          if (isDirectory && depth < 2) {
            traverseDirectory(fullPath, depth + 1);
          }
        } catch (error) {
          // Skip entries we can't access
          console.info(`Could not access ${fullPath}: ${error}`);
        }
      }
    };

    traverseDirectory(workDir, 0);
  } catch (error) {
    console.info(`Error getting project structure: ${error}`);
  }

  return overview;
}

/**
 * Utility function to collect glob patterns for include patterns
 */
async function collectIncludePatterns(
  workDir: string,
  language: string,
): Promise<string[]> {
  // Show project structure overview
  const projectStructure = getProjectStructureOverview(workDir);

  console.info(
    `
Include patterns define which files NanoAPI will process and analyze.

Examples:
- '**/*.py' for all Python files
- 'src/**' for all files in src directory
- '*.py' for all Python files in the root directory
`,
  );

  // Suggest intelligent defaults based on project structure
  const suggestedIncludes = suggestIncludePatterns(projectStructure, language);
  console.info("\nSuggested include patterns (based on project structure):");
  suggestedIncludes.forEach((pattern) => console.info(`- ${pattern}`));

  // Show preview of files that would be included with suggested patterns
  console.info("\nPreview of files that would be included:");
  for (const pattern of suggestedIncludes) {
    showMatchingFiles(workDir, pattern);
  }

  // Prompt user to use suggested includes or customize
  const useSuggested = await confirm({
    message: "Do you want to use the suggested include patterns?",
    default: true,
  });

  if (useSuggested) {
    console.info("Using suggested include patterns.");
    return suggestedIncludes;
  }

  console.info(
    "Please enter the glob patterns for files to include (one per line):",
  );

  // Start with empty pattern list
  let includePatterns: string[] = [];
  let continueAdding = true;
  let validSelection = false;

  while (!validSelection) {
    includePatterns = [];
    continueAdding = true;

    while (continueAdding) {
      const pattern = await input({
        message: "Enter glob pattern (e.g., '**/*.py', 'src/**')",
        validate: (value) => {
          if (!value.trim()) return "Pattern cannot be empty";
          try {
            // Basic validation - a more thorough validation could use a glob validation library
            new RegExp(value.replace(/\*\*/g, "*").replace(/\*/g, ".*"));

            // Show preview of files that match this pattern
            console.info(`\nPreviewing files matching '${value}':`);
            const files = globSync(value, {
              cwd: workDir,
              nodir: true,
            });

            if (files.length === 0) {
              return `No files match the pattern '${value}'. Please check and try again.`;
            }

            const totalMatches = files.length;
            const filesToShow = files.slice(0, 5);

            filesToShow.forEach((file: string) => console.info(`- ${file}`));

            if (totalMatches > 5) {
              console.info(`... and ${totalMatches - 5} more`);
            }

            return true;
          } catch {
            return "Invalid pattern";
          }
        },
      });

      includePatterns.push(pattern);

      continueAdding = await confirm({
        message: "Do you want to add another include pattern?",
        default: false,
      });
    }

    if (includePatterns.length === 0) {
      console.info("No patterns provided, using default '**' (all files)");
      includePatterns = ["**"];
    }

    console.info("\nSelected include patterns:");
    includePatterns.forEach((pattern) => console.info(`- ${pattern}`));

    // Show a preview of all files that match the patterns collectively
    showFinalFileSelection(workDir, includePatterns, []);

    // Ask user to validate the selection
    validSelection = await confirm({
      message: "Are you satisfied with this file selection?",
      default: true,
    });

    if (!validSelection) {
      console.info("\nLet's try again with different include patterns.");
    }
  }

  return includePatterns;
}

/**
 * Utility function to collect glob patterns for exclude patterns
 */
async function collectExcludePatterns(
  workDir: string,
  includePatterns: string[],
  language: string,
  outDir: string,
): Promise<string[]> {
  console.info("\n❌ Specifying files to exclude from your project");
  console.info(
    `
Exclude patterns define which files NanoAPI will ignore during processing.

Examples:
- 'node_modules/**' to exclude all node modules
- '**/*.test.js' to exclude all JavaScript test files
- '.git/**' to exclude git directory
`,
  );

  // Suggest intelligent defaults based on include patterns
  const suggestedExcludes = suggestExcludePatterns(
    includePatterns,
    language,
    outDir,
  );
  console.info("\nSuggested exclude patterns (based on included files):");
  suggestedExcludes.forEach((pattern) => console.info(`- ${pattern}`));

  // Show preview of files that would be excluded with suggested patterns
  console.info("\nPreview of files that would be excluded:");
  for (const pattern of suggestedExcludes) {
    showMatchingFiles(workDir, pattern);
  }

  // Prompt user to use suggested excludes or customize
  const useSuggested = await confirm({
    message: "Do you want to use the suggested exclude patterns?",
    default: true,
  });

  if (useSuggested) {
    console.info("Using suggested exclude patterns.");
    return suggestedExcludes;
  }

  console.info(
    "Please enter the glob patterns for files to exclude (one per line):",
  );

  // Start with empty pattern list
  let excludePatterns: string[] = [];
  let continueAdding = true;
  let validSelection = false;

  while (!validSelection) {
    excludePatterns = [];
    continueAdding = true;

    while (continueAdding) {
      const pattern = await input({
        message: "Enter glob pattern (e.g., 'node_modules/**', '**/*.test.js')",
        validate: (value) => {
          if (!value.trim()) return "Pattern cannot be empty";
          try {
            // Basic validation - a more thorough validation could use a glob validation library
            new RegExp(value.replace(/\*\*/g, "*").replace(/\*/g, ".*"));

            // Show preview of files that match this pattern
            console.info(`\nPreviewing files matching '${value}':`);
            const files = globSync(value, {
              cwd: workDir,
              nodir: true,
            });

            if (files.length === 0) {
              console.info(
                `Note: No files currently match the pattern '${value}'`,
              );
              // Allow empty matches for exclude patterns as they may be preventative
              return true;
            }

            const totalMatches = files.length;
            const filesToShow = files.slice(0, 5);

            filesToShow.forEach((file: string) => console.info(`- ${file}`));

            if (totalMatches > 5) {
              console.info(`... and ${totalMatches - 5} more`);
            }

            return true;
          } catch {
            return "Invalid pattern";
          }
        },
      });

      excludePatterns.push(pattern);

      continueAdding = await confirm({
        message: "Do you want to add another exclude pattern?",
        default: false,
      });
    }

    console.info("\nSelected exclude patterns:");
    excludePatterns.forEach((pattern) => console.info(`- ${pattern}`));

    // Show final file selection after applying include and exclude patterns
    showFinalFileSelection(workDir, includePatterns, excludePatterns);

    // Ask user to validate the selection
    validSelection = await confirm({
      message: "Are you satisfied with this file selection?",
      default: true,
    });

    if (!validSelection) {
      console.info("\nLet's try again with different exclude patterns.");
    }
  }

  return excludePatterns;
}

/**
 * Suggest include patterns based on project structure and language
 */
function suggestIncludePatterns(
  projectStructure: string[],
  language: string,
): string[] {
  const suggestions: string[] = [];

  // Language-specific suggestions
  if (language === pythonLanguage) {
    // Check for common Python project structures
    if (projectStructure.some((entry) => entry.includes("📂 src/"))) {
      suggestions.push("src/**/*.py");
    }
    if (projectStructure.some((entry) => entry.includes("📂 lib/"))) {
      suggestions.push("lib/**/*.py");
    }
    if (suggestions.length === 0) {
      if (projectStructure.some((entry) => entry.includes("📂 app/"))) {
        suggestions.push("app/**/*.py");
      }
    }

    // If no specific directories found, suggest all Python files
    if (suggestions.length === 0) {
      suggestions.push("**/*.py");
    }
  } else if (language === csharpLanguage) {
    // Check for common C# project structures
    if (projectStructure.some((entry) => entry.includes("📂 src/"))) {
      suggestions.push("src/**/*.cs");
    }
    if (projectStructure.some((entry) => entry.includes("📂 lib/"))) {
      suggestions.push("lib/**/*.cs");
    }
    if (suggestions.length === 0) {
      if (projectStructure.some((entry) => entry.includes("📂 Controllers/"))) {
        suggestions.push("Controllers/**/*.cs");
      }
      if (projectStructure.some((entry) => entry.includes("📂 Models/"))) {
        suggestions.push("Models/**/*.cs");
      }
      if (projectStructure.some((entry) => entry.includes("📂 Services/"))) {
        suggestions.push("Services/**/*.cs");
      }
    }

    // If no specific directories found, suggest all C# files
    if (suggestions.length === 0) {
      suggestions.push("**/*.cs");
    }
  }

  return suggestions;
}

/**
 * Suggest exclude patterns based on include patterns and language
 */
function suggestExcludePatterns(
  _includePatterns: string[],
  language: string,
  outDir: string,
): string[] {
  const suggestions: string[] = [];

  // add outDir to the suggestions
  suggestions.push(`${outDir}/**`);

  // Common exclusions for all languages
  suggestions.push(".git/**");
  suggestions.push("**/dist/**");
  suggestions.push("**/build/**");

  // Language-specific suggestions
  if (language === pythonLanguage) {
    suggestions.push("**/__pycache__/**");
    suggestions.push("**/*.pyc");
    suggestions.push("**/.pytest_cache/**");
    suggestions.push("**/venv/**");
    suggestions.push("**/.env/**");
    suggestions.push("**/*.egg-info/**");
    suggestions.push("**/.tox/**");
    suggestions.push("**/.coverage");
    suggestions.push("**/htmlcov/**");
    suggestions.push("**/.mypy_cache/**");
  } else if (language === csharpLanguage) {
    suggestions.push("**/bin/**");
    suggestions.push("**/obj/**");
    suggestions.push("**/packages/**");
    suggestions.push("**/.vs/**");
    suggestions.push("**/TestResults/**");
    suggestions.push("**/*.user");
    suggestions.push("**/*.suo");
    suggestions.push("**/.nuget/**");
    suggestions.push("**/artifacts/**");
    suggestions.push("**/packages/**");
  }

  return suggestions;
}

/**
 * Create a new project via the API
 */
async function createNewProject(apiService: ApiService): Promise<number> {
  // Workspace selection with dynamic search
  console.info("\n🏢 WORKSPACE SELECTION");
  const selectedWorkspaceId = await search<number>({
    message: "Search for the workspace to create your project in:",
    source: async (term) => {
      try {
        const workspacesResponse = await apiService.performRequest(
          "GET",
          `/workspaces?search=${
            encodeURIComponent(term || "")
          }&page=1&limit=10`,
        );

        if (workspacesResponse.status !== 200) {
          return [];
        }

        const response = await workspacesResponse.json() as {
          results: Array<{ id: number; name: string }>;
          total: number;
        };

        if (response.results.length === 0) {
          return [
            {
              name: `No workspaces found matching "${term}"`,
              value: -1,
              disabled: true,
            },
          ];
        }

        return response.results.map((w) => ({
          name: w.name,
          value: w.id,
        }));
      } catch {
        return [
          {
            name: "Error fetching workspaces",
            value: -1,
            disabled: true,
          },
        ];
      }
    },
  });

  console.info(`✅ Selected workspace ID: ${selectedWorkspaceId}`);

  const projectName = await input({
    message: "Enter a name for your new project:",
    validate: (value) => {
      if (!value.trim()) return "Project name cannot be empty";
      if (value.length > 100) {
        return "Project name must be less than 100 characters";
      }
      return true;
    },
  });

  try {
    const createProjectResponse = await apiService.performRequest(
      "POST",
      "/projects",
      {
        name: projectName,
        workspaceId: selectedWorkspaceId,
        maxCodeCharPerSymbol: 100,
        maxCodeCharPerFile: 1000,
        maxCharPerSymbol: 100,
        maxCharPerFile: 1000,
        maxCodeLinePerSymbol: 10,
        maxCodeLinePerFile: 100,
        maxLinePerSymbol: 10,
        maxLinePerFile: 100,
        maxDependencyPerSymbol: 10,
        maxDependencyPerFile: 100,
        maxDependentPerSymbol: 10,
        maxDependentPerFile: 100,
        maxCyclomaticComplexityPerSymbol: 10,
        maxCyclomaticComplexityPerFile: 100,
      },
    );

    if (createProjectResponse.status !== 201) {
      let errorMessage = "Unknown error";
      try {
        const responseBody = await createProjectResponse.json();
        if (responseBody.error) {
          errorMessage = responseBody.error;
        }
      } catch {
        errorMessage = `HTTP ${createProjectResponse.status}`;
      }
      console.error(`❌ Failed to create project: ${errorMessage}`);
      Deno.exit(1);
    }

    const newProject = await createProjectResponse.json() as {
      id: number;
    };
    console.info(`✅ Created new project: ${projectName}`);
    return newProject.id;
  } catch (error) {
    console.error("❌ Failed to create project");
    console.error(
      `   Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

/**
 * Generate a configuration object based on user input
 */
export async function generateConfig(
  workDir: string,
  apiHost: string,
  globalConfig: z.infer<typeof globalConfigSchema>,
): Promise<z.infer<typeof localConfigSchema>> {
  const apiService = new ApiService(apiHost, globalConfig.jwt, undefined);

  // Project selection/creation
  console.info("\n🏗️  PROJECT SETUP");
  const projectChoice = await select({
    message:
      "Would you like to connect to an existing project or create a new one?",
    choices: [
      { name: "Create a new project", value: "create" },
      { name: "Chose to an existing project", value: "existing" },
    ],
  });

  let selectedProjectId: number;

  if (projectChoice === "existing") {
    // Fetch and select existing project with dynamic search
    try {
      const selectedProject = await search<number>({
        message: "Search for your project:",
        source: async (term) => {
          if (!term || term.length < 1) {
            // Show recent/popular projects when no search term
            try {
              const projectsResponse = await apiService.performRequest(
                "GET",
                `/projects?page=1&limit=10`,
              );

              if (projectsResponse.status !== 200) {
                return [];
              }

              const response = await projectsResponse.json() as {
                results: Array<{ id: number; name: string }>;
                total: number;
              };

              return response.results.map((p) => ({
                name: p.name,
                value: p.id,
              }));
            } catch {
              return [];
            }
          }

          try {
            const projectsResponse = await apiService.performRequest(
              "GET",
              `/projects?search=${encodeURIComponent(term)}&page=1&limit=10`,
            );

            if (projectsResponse.status !== 200) {
              return [];
            }

            const response = await projectsResponse.json() as {
              results: Array<{ id: number; name: string }>;
              total: number;
            };

            if (response.results.length === 0) {
              return [
                {
                  name: `No projects found matching "${term}"`,
                  value: -1,
                  disabled: true,
                },
              ];
            }

            return response.results.map((p) => ({
              name: p.name,
              value: p.id,
            }));
          } catch {
            return [
              {
                name: "Error fetching projects",
                value: -1,
                disabled: true,
              },
            ];
          }
        },
      });

      selectedProjectId = selectedProject;
      console.info(`✅ Selected project ID: ${selectedProject}`);
    } catch (error) {
      console.error("❌ Failed to search projects");
      console.error(
        `   Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      Deno.exit(1);
    }
  } else {
    // Create new project
    selectedProjectId = await createNewProject(apiService);
  }

  // Language selection
  const language = await select({
    message: "Select the language of your project",
    choices: [
      { name: "Python", value: pythonLanguage },
      { name: "C#", value: csharpLanguage },
      { name: "C", value: cLanguage },
      { name: "Java", value: javaLanguage },
    ],
  });

  // Python-specific config (if Python is selected)
  let pythonConfig: z.infer<typeof localConfigSchema>["python"] | undefined =
    undefined;
  if (language === pythonLanguage) {
    const supportedVersions = Object.keys(pythonStdlibList);
    const pythonVersion = await search<string>({
      message: "Enter or search for your Python version (e.g., 3.9)",
      source: (term) => {
        if (!term) return supportedVersions;
        return supportedVersions.filter((version) => version.includes(term));
      },
    });

    if (pythonVersion) {
      pythonConfig = {
        version: pythonVersion,
      };
    }
  }

  // Output directory - must be a valid directory name within the project
  const outDir = await input({
    message: "Enter the output directory for NanoAPI artifacts",
    default: "napi_out",
    validate: (value) => {
      if (!value.trim()) return "Output directory cannot be empty";

      try {
        // Check if the path is valid by attempting to normalize it
        const normalizedPath = normalize(join(workDir, value));

        // Ensure the path is within the project directory (prevent directory traversal)
        if (!normalizedPath.startsWith(normalize(workDir))) {
          return "Output directory must be within the project directory";
        }

        // Check if the directory exists but is a file
        try {
          const stat = Deno.statSync(normalizedPath);
          if (stat && !stat.isDirectory) {
            return "A file with this name already exists. Please choose a different name";
          }
        } catch (_error) {
          // Path doesn't exist yet, which is fine
        }

        return true;
      } catch (error) {
        if (error instanceof Error) {
          return `Invalid directory name: ${error.message}`;
        }
        return "Invalid directory name";
      }
    },
  });

  console.info("\n🔍 ANALYZING PROJECT STRUCTURE...");

  // Collect include patterns
  const includePatterns = await collectIncludePatterns(workDir, language);

  // Collect exclude patterns
  const excludePatterns = await collectExcludePatterns(
    workDir,
    includePatterns,
    language,
    outDir,
  );

  // Show final file selection to the user
  showFinalFileSelection(workDir, includePatterns, excludePatterns);

  // Build the config object
  const config: z.infer<typeof localConfigSchema> = {
    language: language,
    project: {
      include: includePatterns,
      exclude: excludePatterns.length > 0 ? excludePatterns : undefined,
    },
    outDir: outDir ? outDir : "napi_out",
    projectIds: [selectedProjectId],
  };

  // Add python config if it exists
  if (pythonConfig) {
    config.python = pythonConfig;
  }

  return config;
}
