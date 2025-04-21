import fs from "fs";
import path from "path";
import z from "zod";
import { localConfigSchema } from "../../../config/localConfig";
import pythonStdlibList from "../../../scripts/generate_python_stdlib_list/output.json";
import { select, confirm, input, number, search } from "@inquirer/prompts";
import { globSync } from "glob";

/**
 * Shows files that match a given glob pattern
 */
async function showMatchingFiles(
  workDir: string,
  pattern: string,
  maxFilesToShow = 10,
): Promise<void> {
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
async function showFinalFileSelection(
  workDir: string,
  includePatterns: string[],
  excludePatterns: string[],
  maxFilesToShow = 20,
): Promise<void> {
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
    function traverseDirectory(dir: string, depth: number) {
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        // Skip node_modules and .git directories
        if (entry === "node_modules" || entry === ".git") {
          continue;
        }

        const fullPath = path.join(dir, entry);
        const relativePath = path.relative(workDir, fullPath);

        try {
          const stat = fs.statSync(fullPath);
          const isDirectory = stat.isDirectory();

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
    }

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
    await showMatchingFiles(workDir, pattern);
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
        validate: async (value) => {
          if (!value.trim()) return "Pattern cannot be empty";
          try {
            // Basic validation - a more thorough validation could use a glob validation library
            new RegExp(value.replace(/\*\*/g, "*").replace(/\*/g, ".*"));

            // Show preview of files that match this pattern
            console.info(`\nPreviewing files matching '${value}':`);
            const files = globSync(value, {
              cwd: workDir,
              ignore: ["node_modules/**", ".git/**"],
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
    await showFinalFileSelection(workDir, includePatterns, []);

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
  const suggestedExcludes = suggestExcludePatterns(includePatterns, language);
  console.info("\nSuggested exclude patterns (based on included files):");
  suggestedExcludes.forEach((pattern) => console.info(`- ${pattern}`));

  // Show preview of files that would be excluded with suggested patterns
  console.info("\nPreview of files that would be excluded:");
  for (const pattern of suggestedExcludes) {
    await showMatchingFiles(workDir, pattern);
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
        validate: async (value) => {
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
    await showFinalFileSelection(workDir, includePatterns, excludePatterns);

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
  if (language === "python") {
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
      if (projectStructure.some((entry) => entry.includes("📂 tests/"))) {
        suggestions.push("tests/**/*.py");
      }
    }

    // If no specific directories found, suggest all Python files
    if (suggestions.length === 0) {
      suggestions.push("**/*.py");
    }
  } else if (language === "csharp") {
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
      if (projectStructure.some((entry) => entry.includes("📂 Tests/"))) {
        suggestions.push("Tests/**/*.cs");
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
): string[] {
  const suggestions: string[] = [];

  // Common exclusions for all languages
  suggestions.push(".git/**");
  suggestions.push("**/dist/**");
  suggestions.push("**/build/**");

  // Language-specific suggestions
  if (language === "python") {
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
  } else if (language === "csharp") {
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
 * Generate a configuration object based on user input
 */
export async function generateConfig(
  workDir: string,
): Promise<z.infer<typeof localConfigSchema>> {
  // Language selection
  const language = await select({
    message: "Select the language of your project",
    choices: [
      { name: "Python", value: "python" },
      { name: "C#", value: "csharp" },
    ],
  });

  // Python-specific config (if Python is selected)
  let pythonConfig: z.infer<typeof localConfigSchema>["python"] | undefined =
    undefined;
  if (language === "python") {
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

  console.info("\n🔍 ANALYZING PROJECT STRUCTURE...");

  // Collect include patterns
  const includePatterns = await collectIncludePatterns(workDir, language);

  // Collect exclude patterns
  const excludePatterns = await collectExcludePatterns(
    workDir,
    includePatterns,
    language,
  );

  // Show final file selection to the user
  await showFinalFileSelection(workDir, includePatterns, excludePatterns);

  // Output directory - must be a valid directory name within the project
  const outDir = await input({
    message: "Enter the output directory for NanoAPI artifacts",
    default: "napi_out",
    validate: (value) => {
      if (!value.trim()) return "Output directory cannot be empty";

      try {
        // Check if the path is valid by attempting to normalize it
        const normalizedPath = path.normalize(path.join(workDir, value));

        // Ensure the path is within the project directory (prevent directory traversal)
        if (!normalizedPath.startsWith(path.normalize(workDir))) {
          return "Output directory must be within the project directory";
        }

        // Check if the directory exists but is a file
        if (
          fs.existsSync(normalizedPath) &&
          !fs.statSync(normalizedPath).isDirectory()
        ) {
          return "A file with this name already exists. Please choose a different name";
        }

        // Check if the output directory would conflict with project source directories
        if (
          includePatterns.some((pattern) => {
            const patternBase = pattern
              .split("/")[0]
              .replace("**", "")
              .replace("*", "");
            return patternBase === value;
          })
        ) {
          return "Output directory should not conflict with your source directories";
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

  // Provide information about metrics before asking
  console.info(
    `
📏 ABOUT CODE METRICS:

Code metrics help audit your codebase and identify areas that may need improvement.
NanoAPI uses these metrics to flag files and symbols that exceed recommended thresholds.

Files or symbols exceeding these limits may benefit from refactoring
• These metrics help identify overly complex or large components in your code
• You can use the default values or customize them based on your project standards
`,
  );

  // Ask if the user wants to configure metrics
  const configureMetrics = await confirm({
    message:
      "Do you want to configure code quality metrics thresholds (recommended)?",
    default: true,
  });

  // Default metrics values
  const defaultMetrics = {
    file: {
      maxChar: 100000,
      maxLine: 1000,
      maxDep: 10,
    },
    symbol: {
      maxChar: 50000,
      maxLine: 500,
      maxDep: 5,
    },
  };

  // Metrics configuration
  let metrics = undefined;

  if (configureMetrics) {
    console.info(`
📏 Configuring code quality metrics...

These metrics establish thresholds for identifying potentially problematic code.
Files and symbols that exceed these limits will be flagged during analysis.
Appropriate limits help maintain code quality and identify refactoring opportunities.

📄 FILE METRICS - Thresholds for entire source files:

• maxChar: Maximum acceptable number of characters in a file
• maxLine: Maximum acceptable number of lines in a file
• maxDep: Maximum acceptable number of dependencies (imports/references) per file

🔣 SYMBOL METRICS - Thresholds for individual functions, classes, etc.:

• maxChar: Maximum acceptable number of characters per symbol
• maxLine: Maximum acceptable number of lines per symbol definition
• maxDep: Maximum acceptable number of dependencies per symbol

RECOMMENDATIONS:

• For maintaining high code quality: Consider using stricter (lower) thresholds
• For legacy codebases: You may need higher thresholds initially, then gradually reduce them
• For standardization: Align these metrics with your team's coding standards
      `);

    const fileMaxChar = await number({
      message: "Enter maximum characters per file",
      default: defaultMetrics.file.maxChar,
      validate: (value: number | undefined) => {
        if (typeof value !== "number" || value <= 0) {
          return "Value must be greater than 0";
        }
        return true;
      },
    });

    const fileMaxLine = await number({
      message: "Enter maximum lines per file",
      default: defaultMetrics.file.maxLine,
      validate: (value: number | undefined) => {
        if (typeof value !== "number" || value <= 0) {
          return "Value must be greater than 0";
        }
        return true;
      },
    });

    const fileMaxDep = await number({
      message: "Enter maximum dependencies per file",
      default: defaultMetrics.file.maxDep,
      validate: (value: number | undefined) => {
        if (typeof value !== "number" || value <= 0) {
          return "Value must be greater than 0";
        }
        return true;
      },
    });

    const symbolMaxChar = await number({
      message: "Enter maximum characters per symbol",
      default: defaultMetrics.symbol.maxChar,
      validate: (value: number | undefined) => {
        if (typeof value !== "number" || value <= 0) {
          return "Value must be greater than 0";
        }
        return true;
      },
    });

    const symbolMaxLine = await number({
      message: "Enter maximum lines per symbol",
      default: defaultMetrics.symbol.maxLine,
      validate: (value: number | undefined) => {
        if (typeof value !== "number" || value <= 0) {
          return "Value must be greater than 0";
        }
        return true;
      },
    });

    const symbolMaxDep = await number({
      message: "Enter maximum dependencies per symbol",
      default: defaultMetrics.symbol.maxDep,
      validate: (value: number | undefined) => {
        if (typeof value !== "number" || value <= 0) {
          return "Value must be greater than 0";
        }
        return true;
      },
    });

    metrics = {
      file: {
        maxChar: fileMaxChar,
        maxLine: fileMaxLine,
        maxDep: fileMaxDep,
      },
      symbol: {
        maxChar: symbolMaxChar,
        maxLine: symbolMaxLine,
        maxDep: symbolMaxDep,
      },
    };
  }

  // Build the config object
  const config: z.infer<typeof localConfigSchema> = {
    language: language,
    project: {
      include: includePatterns,
      exclude: excludePatterns.length > 0 ? excludePatterns : undefined,
    },
    outDir: outDir ? outDir : "napi_out",
    metrics: metrics,
  };

  // Add python config if it exists
  if (pythonConfig) {
    config.python = pythonConfig;
  }

  return config;
}
