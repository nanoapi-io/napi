import prompts from "prompts";
import z from "zod";
import {
  createConfig,
  getConfigFromWorkDir,
  localConfigSchema,
} from "../../config/localConfig";
import yargs from "yargs";
import { globalOptions } from "../helpers/options";
import { TelemetryEvents, trackEvent } from "../../telemetry";
import fs from "fs";
import path from "path";
import pythonStdlibList from "../../scripts/generate_python_stdlib_list/output.json";
import {
  getFilesFromDirectory,
  getExtensionsForLanguage,
} from "../../helpers/fileSystem";

/**
 * List files and directories in a given path
 */
function getFilesAndDirs(dirPath: string) {
  try {
    const items = fs.readdirSync(dirPath);
    return items.map((item) => {
      const itemPath = path.join(dirPath, item);
      const isDirectory = fs.statSync(itemPath).isDirectory();
      return {
        title: isDirectory ? `📁 ${item}/` : `📄 ${item}`,
        value: itemPath,
        isDirectory,
      };
    });
  } catch (error) {
    console.error(`Error reading directory: ${error}`);
    return [];
  }
}

/**
 * Reusable function to select files and directories
 */
async function selectPaths(options: {
  message: string;
  initialPrompt?: {
    message: string;
    initial: boolean;
  };
  required?: boolean;
  defaultValue?: string[];
  language?: string;
}): Promise<string[]> {
  const {
    message,
    initialPrompt,
    required = false,
    defaultValue = [],
    language,
  } = options;

  // If not required, ask if user wants to select paths
  if (!required && initialPrompt) {
    const askForPaths = await prompts({
      type: "confirm",
      name: "add",
      message: initialPrompt.message,
      initial: initialPrompt.initial,
    });

    if (!askForPaths.add) {
      return defaultValue;
    }
  }

  const selectedPaths: string[] = [];
  let currentPath = process.cwd();
  let continuePicking = true;

  console.info(`\n${message}:`);

  while (continuePicking) {
    const backOption = { title: "📂 ..", value: "..", isDirectory: true };
    const itemChoices = getFilesAndDirs(currentPath);

    // Add option to select current directory
    const selectCurrentDir = {
      title: `✅ Select current directory (${path.basename(currentPath) || currentPath})`,
      value: "SELECT_CURRENT",
    };

    // Add option to finish selection if at least one path is included or selection is not required
    const doneOption =
      selectedPaths.length > 0 || !required
        ? { title: "✅ Done selecting", value: "DONE" }
        : null;

    const choices = [
      // Don't show back option if at root
      ...(currentPath !== "/" ? [backOption] : []),
      selectCurrentDir,
      ...(doneOption ? [doneOption] : []),
      ...itemChoices,
    ];

    const selection = await prompts({
      type: "select",
      name: "path",
      message: `Browsing: ${currentPath}`,
      choices,
      hint: "Use arrow keys to navigate, Enter to select",
    });

    // Handle cancellation
    if (selection.path === undefined) {
      continuePicking = false;
      continue;
    }

    if (selection.path === "DONE") {
      continuePicking = false;
    } else if (selection.path === "SELECT_CURRENT") {
      // Add the current directory to selected paths
      const relativePath = path.relative(process.cwd(), currentPath) || ".";

      // Show preview of files in this directory
      const globPattern =
        relativePath === "." ? "**/*" : `${relativePath}/**/*`;
      const matchingFiles = previewMatchingFiles([globPattern], [], language);

      if (matchingFiles.length > 0) {
        console.info(`\nPreview of files in ${relativePath}:`);
        matchingFiles.forEach((line) => console.info(line));
      } else {
        console.info(`\nNo files found in ${relativePath}.`);
      }

      // Confirm selection after showing preview
      const confirmDir = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Add "${relativePath}" to selection?`,
        initial: true,
      });

      if (confirmDir.confirm) {
        selectedPaths.push(relativePath);

        const pathType = required ? "includes" : "excludes";
        const addMore = await prompts({
          type: "confirm",
          name: "continue",
          message: `Added "${relativePath}" to ${pathType}. Do you want to add more ${required ? "files/directories" : "exclusions"}?`,
          initial: true,
        });

        if (!addMore.continue) {
          continuePicking = false;
        }
      }
    } else if (selection.path === "..") {
      // Navigate up one directory
      currentPath = path.dirname(currentPath);
    } else {
      const selectedItem = itemChoices.find(
        (item) => item.value === selection.path,
      );

      if (selectedItem?.isDirectory) {
        // If directory, show preview and ask if user wants to add it or navigate into it
        const relativePath =
          path.relative(process.cwd(), selection.path) || ".";
        const globPattern = `${relativePath}/**/*`;
        const matchingFiles = previewMatchingFiles([globPattern], [], language);

        if (matchingFiles.length > 0) {
          console.info(`\nPreview of files in ${relativePath}:`);
          matchingFiles.forEach((line) => console.info(line));
        } else {
          console.info(`\nNo files found in ${relativePath}.`);
        }

        const pathType = required ? "includes" : "excludes";
        const dirAction = await prompts({
          type: "select",
          name: "action",
          message: `Do you want to add this directory to ${pathType} or navigate into it?`,
          choices: [
            { title: `Add directory to ${pathType}`, value: "add" },
            { title: "Navigate into directory", value: "navigate" },
          ],
        });

        if (dirAction.action === "add") {
          // Add the directory to selected paths (as relative path)
          const relativePath = path.relative(process.cwd(), selection.path);
          selectedPaths.push(relativePath);

          const pathType = required ? "includes" : "excludes";
          const addMore = await prompts({
            type: "confirm",
            name: "continue",
            message: `Added "${relativePath}" to ${pathType}. Do you want to add more ${required ? "files/directories" : "exclusions"}?`,
            initial: true,
          });

          if (!addMore.continue) {
            continuePicking = false;
          }
        } else if (dirAction.action === "navigate") {
          // Navigate into the selected directory
          currentPath = selection.path;
        }
      } else {
        // If file, add it to selected paths (as relative path)
        const relativePath = path.relative(process.cwd(), selection.path);
        selectedPaths.push(relativePath);

        const pathType = required ? "includes" : "excludes";
        const addMore = await prompts({
          type: "confirm",
          name: "continue",
          message: `Added "${relativePath}" to ${pathType}. Do you want to add more ${required ? "files/directories" : "exclusions"}?`,
          initial: true,
        });

        if (!addMore.continue) {
          continuePicking = false;
        }
      }
    }
  }

  // If no paths were selected and selection is required, use default value
  if (selectedPaths.length === 0 && required) {
    return defaultValue.length > 0 ? defaultValue : ["**"];
  }

  return selectedPaths;
}

interface FileTreeNode {
  _files?: string[];
  [key: string]: FileTreeNode | string[] | undefined;
}

/**
 * Get common preset patterns based on project type and pattern type
 */
function getPresetPatterns(
  type: "include" | "exclude",
  language?: string,
): { title: string; value: string }[] {
  const commonIncludes = [
    { title: "All files (**)", value: "**" },
    { title: "All files in src directory (src/**)", value: "src/**" },
  ];

  const commonExcludes = [
    { title: "Node modules (node_modules/**)", value: "node_modules/**" },
    {
      title: "Build output directories (dist/**, build/**)",
      value: "{dist,build}/**",
    },
    {
      title: "Cache directories (.cache/**, __pycache__/**)",
      value: "{.cache,__pycache__}/**",
    },
    {
      title: "Environment & local files (.env*, *.local)",
      value: "{.env*,*.local}",
    },
    {
      title: "Test files (test/**, tests/**, **/*.test.*)",
      value: "{test,tests}/**,**/*.test.*",
    },
  ];

  // Language-specific patterns
  if (language) {
    if (language === "python") {
      if (type === "include") {
        commonIncludes.push({ title: "Python files (*.py)", value: "**/*.py" });
      } else {
        commonExcludes.push({
          title: "Python virtual environments (venv/**, env/**)",
          value: "{venv,env}/**",
        });
      }
    } else if (language === "csharp") {
      if (type === "include") {
        commonIncludes.push({ title: "C# files (*.cs)", value: "**/*.cs" });
      } else {
        commonExcludes.push({
          title: "C# build output (bin/**, obj/**)",
          value: "{bin,obj}/**",
        });
      }
    }
  }

  return type === "include" ? commonIncludes : commonExcludes;
}

/**
 * Preview files that match the given patterns in a directory structure
 */
function previewMatchingFiles(
  includePatterns: string[],
  excludePatterns: string[] = [],
  language?: string,
): string[] {
  const dir = process.cwd();
  const files = Array.from(
    getFilesFromDirectory(dir, {
      includes: includePatterns,
      excludes: excludePatterns,
    }).keys(),
  ) as string[];

  // Return an empty array if no files match
  if (files.length === 0) {
    return [];
  }

  // Get supported extensions for the language if specified
  let supportedExtensions: string[] = [];
  if (language) {
    try {
      supportedExtensions = getExtensionsForLanguage(language);
    } catch {
      // If language not supported, continue without extension highlighting
    }
  }

  // Track statistics for file types
  const extensionStats: Record<string, number> = {};
  let supportedFileCount = 0;
  let unsupportedFileCount = 0;

  // Build a directory tree structure
  const fileTree: FileTreeNode = {};

  for (const file of files) {
    // Track file extension statistics
    const fileExt = file.split(".").pop()?.toLowerCase() || "";
    if (fileExt) {
      extensionStats[fileExt] = (extensionStats[fileExt] || 0) + 1;
      if (supportedExtensions.includes(fileExt)) {
        supportedFileCount++;
      } else {
        unsupportedFileCount++;
      }
    }

    const parts = file.split(/[/\\]/); // Split on both forward and backslashes
    let current = fileTree;

    // Build the tree structure
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // If we're at a leaf node (file)
      if (i === parts.length - 1) {
        if (!current._files) current._files = [];
        current._files.push(part);
      }
      // Otherwise we're at a directory
      else {
        if (!current[part]) current[part] = {};
        current = current[part] as FileTreeNode;
      }
    }
  }

  // Format the tree output with counts
  const formattedOutput: string[] = [];

  // Function to count total files in a subtree
  function countFiles(node: FileTreeNode): number {
    let count = node._files ? node._files.length : 0;

    for (const key in node) {
      if (key !== "_files") {
        count += countFiles(node[key] as FileTreeNode);
      }
    }

    return count;
  }

  // Function to format the tree with indentation
  function formatTree(
    node: FileTreeNode,
    path = "",
    depth = 0,
    maxDirs = 3,
  ): number {
    const indent = "  ".repeat(depth);
    let dirsDisplayed = 0;

    // Display files in current directory (limited)
    if (node._files && node._files.length > 0) {
      // Group files by extension for better organization
      const filesByExt: Record<string, string[]> = {};
      let supportedCount = 0;

      // Group files by extension
      for (const file of node._files) {
        const ext = file.split(".").pop()?.toLowerCase() || "no-ext";
        if (!filesByExt[ext]) filesByExt[ext] = [];
        filesByExt[ext].push(file);

        if (supportedExtensions.includes(ext)) {
          supportedCount++;
        }
      }

      const fileCount = node._files.length;

      // If we have language info and supported files to show
      if (language && supportedExtensions.length > 0) {
        formattedOutput.push(
          `${indent}📄 ${fileCount} files (${supportedCount} supported)`,
        );

        // Show supported files first (limited to 3)
        let shown = 0;
        for (const ext of supportedExtensions) {
          if (filesByExt[ext] && shown < 3) {
            for (const file of filesByExt[ext].slice(0, 3 - shown)) {
              formattedOutput.push(`${indent}  ✅ ${file}`);
              shown++;
            }

            // If more files of this extension exist, show a count
            if (filesByExt[ext].length > 3 - shown) {
              const remaining = filesByExt[ext].length - (3 - shown);
              formattedOutput.push(
                `${indent}  ✅ ... and ${remaining} more ${ext} files`,
              );
              shown = 3; // Mark as fully shown
            }
          }
        }
      }
      // Without language info or with few files, show files directly
      else if (fileCount <= 3) {
        for (const file of node._files) {
          const ext = file.split(".").pop()?.toLowerCase() || "";
          const isSupported = supportedExtensions.includes(ext);
          const icon = isSupported ? "✅" : "📄";
          formattedOutput.push(`${indent}${icon} ${file}`);
        }
      }
      // Otherwise just show counts
      else {
        formattedOutput.push(`${indent}📄 ${fileCount} files`);
      }
    }

    // Get sorted directories
    const dirEntries = Object.entries(node)
      .filter(([key]) => key !== "_files")
      .sort(
        (a, b) =>
          countFiles(b[1] as FileTreeNode) - countFiles(a[1] as FileTreeNode),
      ); // Sort by file count

    // Display directories (limited)
    for (const [dir, subNode] of dirEntries) {
      if (dirsDisplayed >= maxDirs) {
        const remainingDirs = dirEntries.length - maxDirs;
        if (remainingDirs > 0) {
          formattedOutput.push(
            `${indent}... and ${remainingDirs} more directories`,
          );
        }
        break;
      }

      const fileCount = countFiles(subNode as FileTreeNode);
      const dirPath = path ? `${path}/${dir}` : dir;

      // Count supported files in this directory
      let supportedInDir = 0;
      if (language && supportedExtensions.length > 0) {
        function countSupportedFiles(node: FileTreeNode): number {
          let count = 0;

          // Count files in current directory
          if (node._files) {
            for (const file of node._files) {
              const ext = file.split(".").pop()?.toLowerCase() || "";
              if (supportedExtensions.includes(ext)) {
                count++;
              }
            }
          }

          // Recursively count in subdirectories
          for (const key in node) {
            if (key !== "_files") {
              count += countSupportedFiles(node[key] as FileTreeNode);
            }
          }

          return count;
        }

        supportedInDir = countSupportedFiles(subNode as FileTreeNode);
      }

      if (language && supportedExtensions.length > 0) {
        formattedOutput.push(
          `${indent}📁 ${dir}/ (${fileCount} files, ${supportedInDir} supported)`,
        );
      } else {
        formattedOutput.push(`${indent}📁 ${dir}/ (${fileCount} files)`);
      }

      // Recursively format subdirectories
      if (depth < 2) {
        // Limit depth to prevent too detailed output
        dirsDisplayed += formatTree(
          subNode as FileTreeNode,
          dirPath,
          depth + 1,
          maxDirs - dirsDisplayed,
        );
      }

      dirsDisplayed++;
    }

    return dirsDisplayed;
  }

  // Format the entire tree
  formatTree(fileTree);

  // Add extension statistics
  if (language && supportedExtensions.length > 0) {
    formattedOutput.push("\nFile types:");

    // Display supported extensions first
    for (const ext of supportedExtensions) {
      if (extensionStats[ext]) {
        formattedOutput.push(
          `  ✅ ${ext}: ${extensionStats[ext]} files (supported)`,
        );
      }
    }

    // Then display other extensions
    Object.entries(extensionStats)
      .filter(([ext]) => !supportedExtensions.includes(ext))
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 5) // Limit to top 5 unsupported extensions
      .forEach(([ext, count]) => {
        formattedOutput.push(`  ❌ ${ext}: ${count} files (not supported)`);
      });
  }

  // Add a summary line for total files
  if (language && supportedExtensions.length > 0) {
    formattedOutput.push(
      `\nTotal: ${files.length} file(s) (${supportedFileCount} supported, ${unsupportedFileCount} not supported)`,
    );
  } else {
    formattedOutput.push(`\nTotal: ${files.length} file(s)`);
  }

  return formattedOutput;
}

/**
 * Display helpful guidance about glob patterns
 */
function showGlobPatternGuide(): void {
  console.info("\n📖 Glob Pattern Guide:");
  console.info(
    "  * - Match any number of characters in a filename (e.g., *.js)",
  );
  console.info("  ** - Match any number of directories (e.g., src/**/test.js)");
  console.info("  ? - Match a single character (e.g., test?.js)");
  console.info("  {a,b} - Match any of the patterns (e.g., {src,lib}/**/*.js)");
  console.info("  ! - Negate a pattern (only in exclude patterns)");
  console.info("\n📋 Examples:");
  console.info(
    "  - src/**/*.js - All JavaScript files in src directory and subdirectories",
  );
  console.info(
    "  - {src,lib}/**/*.{js,ts} - All JS/TS files in src or lib directories",
  );
  console.info("  - **/*.test.js - All JavaScript test files");
  console.info("");
}

/**
 * Utility function to collect glob patterns via text input or interactive browser
 */
async function collectPatterns(options: {
  type: "include" | "exclude";
  defaultValue?: string[];
  required?: boolean;
  language?: string;
}): Promise<string[]> {
  const { type, defaultValue = [], required = false, language } = options;

  // Show glob pattern guide
  showGlobPatternGuide();

  // List of collected patterns
  const patterns: string[] = [];
  let continueAdding = true;

  while (continueAdding) {
    // Ask how to specify files for each pattern
    const modeResponse = await prompts({
      type: "select",
      name: "mode",
      message:
        patterns.length === 0
          ? `How would you like to specify files to ${type}?`
          : `How would you like to add another ${type} pattern?`,
      choices: [
        { title: "Select from common presets", value: "preset" },
        { title: "Interactive file browser", value: "interactive" },
        { title: "Text-based glob patterns", value: "text" },
      ],
    });

    // Handle presets
    if (modeResponse.mode === "preset") {
      // Get presets based on the language and pattern type
      const presetChoices = getPresetPatterns(type, language);

      const { pattern } = await prompts({
        type: "select",
        name: "pattern",
        message: `Select a preset ${type} pattern`,
        choices: presetChoices,
      });

      patterns.push(pattern);
    }
    // Handle text-based input
    else if (modeResponse.mode === "text") {
      const { pattern } = await prompts({
        type: "text",
        name: "pattern",
        message: `Enter a glob pattern to ${type}`,
        initial: patterns.length === 0 && type === "include" ? "**" : "",
        validate: (input: string) => {
          if (!input) return "Pattern cannot be empty";
          return true;
        },
      });

      patterns.push(pattern.trim());
    }
    // Handle interactive browser
    else if (modeResponse.mode === "interactive") {
      const paths = await selectPaths({
        message: `Select files/directories to ${type} in your project`,
        required: true, // For single selection, make it required
        defaultValue: [],
        language,
      });

      // Convert selected paths to glob patterns
      const selectedPatterns = paths.map((p: string) => {
        const fullPath = path.resolve(process.cwd(), p);
        try {
          if (fs.statSync(fullPath).isDirectory()) {
            return `${p.replace(/\/$/, "")}/**/*`;
          }
        } catch {
          // ignore stat errors
        }
        return p;
      });

      // Add all selected patterns
      patterns.push(...selectedPatterns);
    }

    // Show preview of matching files after adding each pattern
    const matchingFiles = previewMatchingFiles(
      type === "include" ? patterns : ["**"],
      type === "exclude" ? patterns : [],
      language,
    );

    if (matchingFiles.length > 0) {
      console.info(
        `\nPreview of files ${type === "include" ? "included" : "excluded"}:`,
      );
      matchingFiles.forEach((line) => console.info(line));
    } else {
      console.info(
        `\nNo files ${type === "include" ? "included" : "excluded"} with current patterns.`,
      );
    }

    // List the current patterns
    console.info(`Current ${type} patterns:`);
    patterns.forEach((p, i) => console.info(`${i + 1}. ${p}`));

    // Ask if user wants to add more patterns
    const { more } = await prompts({
      type: "confirm",
      name: "more",
      message: `Add another ${type} pattern?`,
      initial: patterns.length < 2,
    });

    continueAdding = more;
  }

  // If no patterns were selected and selection is required, use default value
  if (patterns.length === 0 && required) {
    return defaultValue.length > 0 ? defaultValue : ["**"];
  }

  return patterns;
}

/**
 * Generate a configuration object based on user input
 */
async function generateConfig(): Promise<z.infer<typeof localConfigSchema>> {
  // Language selection
  const languageResponse = await prompts({
    type: "select",
    name: "language",
    message: "Select the language of your project",
    choices: [
      { title: "Python", value: "python" },
      { title: "C#", value: "csharp" },
    ],
  });

  // Python-specific config (if Python is selected)
  let pythonConfig = undefined;
  if (languageResponse.language === "python") {
    const supportedVersions = Object.keys(pythonStdlibList);
    const pythonVersionResponse = await prompts({
      type: "text",
      name: "version",
      message: "Enter the Python version of your project (e.g., 3.9)",
      initial: supportedVersions[supportedVersions.length - 1].toString(),
      validate: (value) => {
        if (!value) return false; // Empty is not allowed
        if (supportedVersions.includes(value)) return true;
        return `Version ${value} is not supported. Supported versions: ${supportedVersions.join(", ")}`;
      },
    });

    if (pythonVersionResponse.version) {
      pythonConfig = {
        version: pythonVersionResponse.version,
      };
    }
  }

  // Collect include patterns
  const includePatterns = await collectPatterns({
    type: "include",
    defaultValue: ["**"],
    required: true,
    language: languageResponse.language,
  });

  // Ask if user wants to exclude any files or directories
  const excludeAnyResponse = await prompts({
    type: "confirm",
    name: "excludeAny",
    message: "Do you want to exclude any files or directories?",
    initial: true,
  });

  let excludePatterns: string[] = [];
  if (excludeAnyResponse.excludeAny) {
    excludePatterns = await collectPatterns({
      type: "exclude",
      required: true,
      language: languageResponse.language,
    });
  }

  // Output directory - must be a valid directory name within the project
  const outDirResponse = await prompts({
    type: "text",
    name: "outDir",
    message: "Enter the output directory (must be a valid directory name)",
    initial: "napi_out",
    validate: (value) => {
      if (!value) return "Output directory cannot be empty"; // Empty is not allowed
      // Check if the directory name is valid
      if (value.includes("..") || value.includes("/") || value.includes("\\")) {
        return "Please enter a valid directory name without path separators";
      }
      return true;
    },
  });

  // Provide information about metrics before asking
  console.info("\n📏 ABOUT CODE METRICS:");
  console.info(
    "Code metrics help audit your codebase and identify areas that may need improvement.",
  );
  console.info(
    "NanoAPI uses these metrics to flag files and symbols that exceed recommended thresholds.",
  );
  console.info(
    "• Files or symbols exceeding these limits may benefit from refactoring",
  );
  console.info(
    "• These metrics help identify overly complex or large components in your code",
  );
  console.info(
    "• You can use the default values or customize them based on your project standards",
  );

  // Ask if the user wants to configure metrics
  const configureMetricsResponse = await prompts({
    type: "confirm",
    name: "configureMetrics",
    message: "Do you want to configure code quality metrics thresholds?",
    initial: false,
  });

  // Default metrics values
  const defaultMetrics = {
    file: {
      maxChar: 1000000,
      maxLine: 10000,
      maxDep: 1000,
    },
    symbol: {
      maxChar: 100000,
      maxLine: 1000,
      maxDep: 100,
    },
  };

  // Metrics configuration
  let metrics = undefined;

  if (configureMetricsResponse.configureMetrics) {
    console.info("\n📏 Configuring code quality metrics...");
    console.info(
      "These metrics establish thresholds for identifying potentially problematic code.",
    );
    console.info(
      "Files and symbols that exceed these limits will be flagged during analysis.",
    );
    console.info(
      "Appropriate limits help maintain code quality and identify refactoring opportunities.",
    );

    // Metrics - File
    console.info("\n📄 FILE METRICS - Thresholds for entire source files:");
    console.info(
      "  • maxChar: Maximum acceptable number of characters in a file",
    );
    console.info("  • maxLine: Maximum acceptable number of lines in a file");
    console.info(
      "  • maxDep: Maximum acceptable number of dependencies (imports/references) per file",
    );

    const fileMetricsResponse = await prompts([
      {
        type: "number",
        name: "maxChar",
        message: "Enter maximum characters per file",
        initial: defaultMetrics.file.maxChar,
        hint: `Default: ${defaultMetrics.file.maxChar.toLocaleString()} - Files exceeding this may be too large`,
      },
      {
        type: "number",
        name: "maxLine",
        message: "Enter maximum lines per file",
        initial: defaultMetrics.file.maxLine,
        hint: `Default: ${defaultMetrics.file.maxLine.toLocaleString()} - Files exceeding this may need to be split`,
      },
      {
        type: "number",
        name: "maxDep",
        message: "Enter maximum dependencies per file",
        initial: defaultMetrics.file.maxDep,
        hint: `Default: ${defaultMetrics.file.maxDep.toLocaleString()} - Files with more dependencies may be too coupled`,
      },
    ]);

    // Metrics - Symbol
    console.info(
      "\n🔣 SYMBOL METRICS - Thresholds for individual functions, classes, etc.:",
    );
    console.info(
      "  • maxChar: Maximum acceptable number of characters per symbol",
    );
    console.info(
      "  • maxLine: Maximum acceptable number of lines per symbol definition",
    );
    console.info(
      "  • maxDep: Maximum acceptable number of dependencies per symbol",
    );

    const symbolMetricsResponse = await prompts([
      {
        type: "number",
        name: "maxChar",
        message: "Enter maximum characters per symbol",
        initial: defaultMetrics.symbol.maxChar,
        hint: `Default: ${defaultMetrics.symbol.maxChar.toLocaleString()} - Symbols exceeding this may be too complex`,
      },
      {
        type: "number",
        name: "maxLine",
        message: "Enter maximum lines per symbol",
        initial: defaultMetrics.symbol.maxLine,
        hint: `Default: ${defaultMetrics.symbol.maxLine.toLocaleString()} - Symbols exceeding this may need to be broken down`,
      },
      {
        type: "number",
        name: "maxDep",
        message: "Enter maximum dependencies per symbol",
        initial: defaultMetrics.symbol.maxDep,
        hint: `Default: ${defaultMetrics.symbol.maxDep.toLocaleString()} - Symbols with more dependencies may violate SRP`,
      },
    ]);

    // Recommendations based on code quality standards
    console.info("\n💡 RECOMMENDATIONS:");
    console.info(
      "  • For maintaining high code quality: Consider using stricter (lower) thresholds",
    );
    console.info(
      "  • For legacy codebases: You may need higher thresholds initially, then gradually reduce them",
    );
    console.info(
      "  • For standardization: Align these metrics with your team's coding standards",
    );

    metrics = {
      file: {
        maxChar: fileMetricsResponse.maxChar,
        maxLine: fileMetricsResponse.maxLine,
        maxDep: fileMetricsResponse.maxDep,
      },
      symbol: {
        maxChar: symbolMetricsResponse.maxChar,
        maxLine: symbolMetricsResponse.maxLine,
        maxDep: symbolMetricsResponse.maxDep,
      },
    };
  }

  // Build the config object
  const config: z.infer<typeof localConfigSchema> = {
    language: languageResponse.language,
    project: {
      include: includePatterns,
      exclude: excludePatterns.length > 0 ? excludePatterns : undefined,
    },
    outDir: outDirResponse.outDir || undefined,
    metrics: metrics,
  };

  // Add python config if it exists
  if (pythonConfig) {
    config.python = pythonConfig;
  }

  return config;
}

async function handler(
  argv: yargs.ArgumentsCamelCase<
    yargs.InferredOptionTypes<typeof globalOptions>
  >,
) {
  const startTime = Date.now();
  trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
    message: "Init command started",
  });

  try {
    // Check if config already exists
    try {
      if (getConfigFromWorkDir(argv.workdir)) {
        const response = await prompts({
          type: "confirm",
          name: "confirm",
          message: `A .napirc file already exists in the selected directory. Do you want to overwrite it?`,
          initial: false,
        });
        if (!response.confirm) {
          return;
        }
      }
    } catch {
      // Config doesn't exist, continue with initialization
    }

    console.info("Generating a new .napirc configuration file...");

    // Generate the config using the interactive prompts
    const napiConfig = await generateConfig();

    // Confirm and show the config
    console.info("\nGenerated configuration:");
    console.info(JSON.stringify(napiConfig, null, 2));

    const confirmResponse = await prompts({
      type: "confirm",
      name: "confirm",
      message: "Do you want to save this configuration?",
      initial: true,
    });

    if (confirmResponse.confirm) {
      createConfig(napiConfig, argv.workdir);
      console.info("Successfully created .napirc");
    } else {
      console.info("Configuration not saved.");
    }

    trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
      message: "Init command finished",
      duration: Date.now() - startTime,
    });
  } catch (error) {
    trackEvent(TelemetryEvents.CLI_INIT_COMMAND, {
      message: "Init command error",
      duration: Date.now() - startTime,
      error: error,
    });
    throw error;
  }
}

export default {
  command: "init",
  describe: "Initialize a NanoAPI project with interactive configuration",
  builder: {},
  handler,
};

// Export for testing
export { generateConfig, selectPaths };
