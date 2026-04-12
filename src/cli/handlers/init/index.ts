import type { Arguments } from "yargs-types";
import {
  createConfig,
  getConfigFromWorkDir,
} from "../../middlewares/napiConfig.ts";
import { join, normalize, relative, SEPARATOR } from "@std/path";
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
import type { globalConfigSchema } from "../../middlewares/globalConfig.ts";
import {
  ANTHROPIC_PROVIDER,
  GOOGLE_PROVIDER,
  OPENAI_PROVIDER,
} from "../../../manifest/dependencyManifest/labeling/model.ts";
import { defaultAuditConfig } from "../../../manifest/auditManifest/types.ts";

function builder(
  yargs: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  return yargs;
}

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  try {
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
      console.info(
        "📝 No existing valid configuration found, creating new one",
      );
    }

    console.info("\n🔧 Starting interactive configuration...");

    const napiConfig = await generateConfig(argv.workdir);

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
      console.info(`📄 Created: ${argv.workdir}${SEPARATOR}.napirc`);
      console.info("🎉 Your NanoAPI project is ready!");
      console.info("\n💡 Next steps:");
      console.info("   1. Run: napi generate");
      console.info("   2. Run: napi view");
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

function showMatchingFiles(
  workDir: string,
  pattern: string,
  maxFilesToShow = 10,
) {
  try {
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

function showFinalFileSelection(
  workDir: string,
  includePatterns: string[],
  excludePatterns: string[],
  maxFilesToShow = 20,
) {
  try {
    const files = globSync(includePatterns, {
      cwd: workDir,
      nodir: true,
      ignore: excludePatterns,
    });

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

async function collectIncludePatterns(
  workDir: string,
  language: string,
): Promise<string[]> {
  const projectStructure = getProjectStructureOverview(workDir);

  console.info(
    `
Include patterns define which files NanoAPI will process and analyze.

Examples:
- '**${SEPARATOR}*.py' for all Python files
- 'src${SEPARATOR}**' for all files in src directory
- '*.py' for all Python files in the root directory
`,
  );

  const suggestedIncludes = suggestIncludePatterns(projectStructure, language);
  console.info("\nSuggested include patterns (based on project structure):");
  suggestedIncludes.forEach((pattern) => console.info(`- ${pattern}`));

  console.info("\nPreview of files that would be included:");
  for (const pattern of suggestedIncludes) {
    showMatchingFiles(workDir, pattern);
  }

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

  let includePatterns: string[] = [];
  let continueAdding = true;
  let validSelection = false;

  while (!validSelection) {
    includePatterns = [];
    continueAdding = true;

    while (continueAdding) {
      const pattern = await input({
        message:
          `Enter glob pattern (e.g., '**${SEPARATOR}*.py', 'src${SEPARATOR}**')`,
        validate: (value) => {
          if (!value.trim()) return "Pattern cannot be empty";
          try {
            new RegExp(value.replace(/\*\*/g, "*").replace(/\*/g, ".*"));

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

    showFinalFileSelection(workDir, includePatterns, []);

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
- 'node_modules${SEPARATOR}**' to exclude all node modules
- '**${SEPARATOR}*.test.js' to exclude all JavaScript test files
- '.git${SEPARATOR}**' to exclude git directory
`,
  );

  const suggestedExcludes = suggestExcludePatterns(
    includePatterns,
    language,
    outDir,
  );
  console.info("\nSuggested exclude patterns (based on included files):");
  suggestedExcludes.forEach((pattern) => console.info(`- ${pattern}`));

  console.info("\nPreview of files that would be excluded:");
  for (const pattern of suggestedExcludes) {
    showMatchingFiles(workDir, pattern);
  }

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

  let excludePatterns: string[] = [];
  let continueAdding = true;
  let validSelection = false;

  while (!validSelection) {
    excludePatterns = [];
    continueAdding = true;

    while (continueAdding) {
      const pattern = await input({
        message:
          `Enter glob pattern (e.g., 'node_modules${SEPARATOR}**', '**${SEPARATOR}*.test.js')`,
        validate: (value) => {
          if (!value.trim()) return "Pattern cannot be empty";
          try {
            new RegExp(value.replace(/\*\*/g, "*").replace(/\*/g, ".*"));

            console.info(`\nPreviewing files matching '${value}':`);
            const files = globSync(value, {
              cwd: workDir,
              nodir: true,
            });

            if (files.length === 0) {
              console.info(
                `Note: No files currently match the pattern '${value}'`,
              );
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

    showFinalFileSelection(workDir, includePatterns, excludePatterns);

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

function suggestIncludePatterns(
  projectStructure: string[],
  language: string,
): string[] {
  const suggestions: string[] = [];

  if (language === pythonLanguage) {
    if (
      projectStructure.some((entry) => entry.includes(`📂 src${SEPARATOR}`))
    ) {
      suggestions.push(`src${SEPARATOR}**${SEPARATOR}*.py`);
    }
    if (
      projectStructure.some((entry) => entry.includes(`📂 lib${SEPARATOR}`))
    ) {
      suggestions.push(`lib${SEPARATOR}**${SEPARATOR}*.py`);
    }
    if (suggestions.length === 0) {
      if (
        projectStructure.some((entry) => entry.includes(`📂 app${SEPARATOR}`))
      ) {
        suggestions.push(`app${SEPARATOR}**${SEPARATOR}*.py`);
      }
    }
    if (suggestions.length === 0) {
      suggestions.push(`**${SEPARATOR}*.py`);
    }
  } else if (language === csharpLanguage) {
    if (
      projectStructure.some((entry) => entry.includes(`📂 src${SEPARATOR}`))
    ) {
      suggestions.push(`src${SEPARATOR}**${SEPARATOR}*.cs`);
    }
    if (
      projectStructure.some((entry) => entry.includes(`📂 lib${SEPARATOR}`))
    ) {
      suggestions.push(`lib${SEPARATOR}**${SEPARATOR}*.cs`);
    }
    if (suggestions.length === 0) {
      if (
        projectStructure.some((entry) =>
          entry.includes(`📂 Controllers${SEPARATOR}`)
        )
      ) {
        suggestions.push(`Controllers${SEPARATOR}**${SEPARATOR}*.cs`);
      }
      if (
        projectStructure.some((entry) =>
          entry.includes(`📂 Models${SEPARATOR}`)
        )
      ) {
        suggestions.push(`Models${SEPARATOR}**${SEPARATOR}*.cs`);
      }
      if (
        projectStructure.some((entry) =>
          entry.includes(`📂 Services${SEPARATOR}`)
        )
      ) {
        suggestions.push(`Services${SEPARATOR}**${SEPARATOR}*.cs`);
      }
    }
    if (suggestions.length === 0) {
      suggestions.push(`**${SEPARATOR}*.cs`);
    }
  } else if (language === cLanguage) {
    if (
      projectStructure.some((entry) => entry.includes(`📂 src${SEPARATOR}`))
    ) {
      suggestions.push(`src${SEPARATOR}**${SEPARATOR}*.c`);
      suggestions.push(`src${SEPARATOR}**${SEPARATOR}*.h`);
    }
    if (
      projectStructure.some((entry) => entry.includes(`📂 lib${SEPARATOR}`))
    ) {
      suggestions.push(`lib${SEPARATOR}**${SEPARATOR}*.c`);
      suggestions.push(`lib${SEPARATOR}**${SEPARATOR}*.h`);
    }
    if (suggestions.length === 0) {
      if (
        projectStructure.some((entry) =>
          entry.includes(`📂 include${SEPARATOR}`)
        )
      ) {
        suggestions.push(`include${SEPARATOR}**${SEPARATOR}*.c`);
        suggestions.push(`include${SEPARATOR}**${SEPARATOR}*.h`);
      }
    }
    if (suggestions.length === 0) {
      suggestions.push(`**${SEPARATOR}*.c`);
      suggestions.push(`**${SEPARATOR}*.h`);
    }
  } else if (language === javaLanguage) {
    if (
      projectStructure.some((entry) => entry.includes(`📂 src${SEPARATOR}`))
    ) {
      suggestions.push(`src${SEPARATOR}**${SEPARATOR}*.java`);
    }
    if (
      projectStructure.some((entry) => entry.includes(`📂 lib${SEPARATOR}`))
    ) {
      suggestions.push(`lib${SEPARATOR}**${SEPARATOR}*.java`);
    }
    if (suggestions.length === 0) {
      if (
        projectStructure.some((entry) =>
          entry.includes(`📂 buildSrc${SEPARATOR}`)
        )
      ) {
        suggestions.push(`buildSrc${SEPARATOR}**${SEPARATOR}*.java`);
      }
      if (
        projectStructure.some((entry) => entry.includes(`📂 app${SEPARATOR}`))
      ) {
        suggestions.push(`app${SEPARATOR}**${SEPARATOR}*.java`);
      }
      if (
        projectStructure.some((entry) => entry.includes(`📂 core${SEPARATOR}`))
      ) {
        suggestions.push(`core${SEPARATOR}**${SEPARATOR}*.java`);
      }
      if (
        projectStructure.some((entry) => entry.includes(`📂 util${SEPARATOR}`))
      ) {
        suggestions.push(`util${SEPARATOR}**${SEPARATOR}*.java`);
      }
      if (
        projectStructure.some((entry) => entry.includes(`📂 libs${SEPARATOR}`))
      ) {
        suggestions.push(`libs${SEPARATOR}**${SEPARATOR}*.java`);
      }
    }
    if (suggestions.length === 0) {
      suggestions.push(`**${SEPARATOR}*.java`);
    }
  }

  return suggestions;
}

function suggestExcludePatterns(
  _includePatterns: string[],
  language: string,
  outDir: string,
): string[] {
  const suggestions: string[] = [];

  suggestions.push(`${outDir}${SEPARATOR}**`);
  suggestions.push(`.napi${SEPARATOR}**`);
  suggestions.push(`.git${SEPARATOR}**`);
  suggestions.push(`**${SEPARATOR}dist${SEPARATOR}**`);
  suggestions.push(`**${SEPARATOR}build${SEPARATOR}**`);

  if (language === pythonLanguage) {
    suggestions.push(`**${SEPARATOR}__pycache__${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}*.pyc`);
    suggestions.push(`**${SEPARATOR}.pytest_cache${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}venv${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.env${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}*.egg-info${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.tox${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.coverage`);
    suggestions.push(`**${SEPARATOR}htmlcov${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.mypy_cache${SEPARATOR}**`);
  } else if (language === csharpLanguage) {
    suggestions.push(`**${SEPARATOR}bin${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}obj${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}packages${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.vs${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}TestResults${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}*.user`);
    suggestions.push(`**${SEPARATOR}*.suo`);
    suggestions.push(`**${SEPARATOR}.nuget${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}artifacts${SEPARATOR}**`);
  } else if (language === javaLanguage) {
    suggestions.push(`**${SEPARATOR}bin${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}obj${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.bin${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.obj${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}target${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.mvn${SEPARATOR}**`);
    suggestions.push(`**${SEPARATOR}.svn${SEPARATOR}**`);
  }

  return suggestions;
}

export async function generateConfig(
  workDir: string,
): Promise<z.infer<typeof localConfigSchema>> {
  const language = await select({
    message: "Select the language of your project",
    choices: [
      { name: "Python", value: pythonLanguage },
      { name: "C#", value: csharpLanguage },
      { name: "C", value: cLanguage },
      { name: "Java", value: javaLanguage },
    ],
  });

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

  let cConfig: z.infer<typeof localConfigSchema>["c"] | undefined = undefined;
  if (language === cLanguage) {
    const hasIncludeDirs = await confirm({
      message: "Does your project have include directories for headers?",
    });
    if (hasIncludeDirs) {
      const includeDirsInput = await input({
        message: "Enter the include directories, separated by commas:",
        validate: (value) => {
          if (!value.trim()) return "Include directories cannot be empty";
          return true;
        },
      });

      const includeDirs = includeDirsInput.split(",").map((dir) => dir.trim());

      if (includeDirs.length > 0) {
        cConfig = {
          includedirs: includeDirs,
        };
      }
    }
  }

  const outDir = await input({
    message: "Enter the output directory for NanoAPI artifacts",
    default: "napi_out",
    validate: (value) => {
      if (!value.trim()) return "Output directory cannot be empty";

      try {
        const normalizedPath = normalize(join(workDir, value));

        if (!normalizedPath.startsWith(normalize(workDir))) {
          return "Output directory must be within the project directory";
        }

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

  const includePatterns = await collectIncludePatterns(workDir, language);

  const excludePatterns = await collectExcludePatterns(
    workDir,
    includePatterns,
    language,
    outDir,
  );

  showFinalFileSelection(workDir, includePatterns, excludePatterns);

  console.info("\n🏷️  LABELING CONFIGURATION");
  console.info(
    "Labeling helps categorize and organize your code dependencies using AI models.",
  );

  const enableLabeling = await confirm({
    message: "Would you like to enable AI-powered labeling?",
    default: false,
  });

  let labelingConfig:
    | z.infer<typeof localConfigSchema>["labeling"]
    | undefined = undefined;

  if (enableLabeling) {
    console.info("\n🤖 AI MODEL SELECTION");
    console.info(
      "Choose an AI provider for labeling your dependencies:",
    );

    const modelProvider = await select({
      message: "Select AI model provider:",
      choices: [
        { name: "OpenAI (GPT-4o-mini)", value: OPENAI_PROVIDER },
        { name: "Google (Gemini 2.5 Flash)", value: GOOGLE_PROVIDER },
        { name: "Anthropic (Claude 3.5 Sonnet)", value: ANTHROPIC_PROVIDER },
      ],
    }) as
      | typeof OPENAI_PROVIDER
      | typeof GOOGLE_PROVIDER
      | typeof ANTHROPIC_PROVIDER;

    const maxConcurrency = await input({
      message: "Enter maximum concurrent requests (leave empty for unlimited):",
      validate: (value) => {
        if (!value.trim()) return true;
        const num = parseInt(value);
        if (isNaN(num) || num <= 0) {
          return "Please enter a positive number or leave empty for unlimited";
        }
        return true;
      },
    });

    labelingConfig = {
      modelProvider,
      maxConcurrency: maxConcurrency.trim()
        ? parseInt(maxConcurrency)
        : undefined,
    };

    console.info("✅ Labeling configuration added");
  }

  console.info("\n📊 AUDIT THRESHOLDS");
  console.info(
    "Audit thresholds flag files and symbols that exceed size or complexity limits.",
  );

  const enableAudit = await confirm({
    message: "Would you like to configure custom audit thresholds?",
    default: false,
  });

  let auditConfig:
    | z.infer<typeof localConfigSchema>["audit"]
    | undefined = undefined;

  if (enableAudit) {
    console.info(
      "\n📄 File-level thresholds (defaults shown, press Enter to keep):",
    );

    const fileMaxCodeLine = await input({
      message:
        `Max code lines per file [${defaultAuditConfig.file.maxCodeLine}]:`,
    });
    const fileMaxCodeChar = await input({
      message:
        `Max code characters per file [${defaultAuditConfig.file.maxCodeChar}]:`,
    });
    const fileMaxDependency = await input({
      message:
        `Max dependencies per file [${defaultAuditConfig.file.maxDependency}]:`,
    });
    const fileMaxDependent = await input({
      message:
        `Max dependents per file [${defaultAuditConfig.file.maxDependent}]:`,
    });
    const fileMaxCyclomaticComplexity = await input({
      message:
        `Max cyclomatic complexity per file [${defaultAuditConfig.file.maxCyclomaticComplexity}]:`,
    });

    console.info(
      "\n🔤 Symbol-level thresholds (defaults shown, press Enter to keep):",
    );

    const symbolMaxCodeLine = await input({
      message:
        `Max code lines per symbol [${defaultAuditConfig.symbol.maxCodeLine}]:`,
    });
    const symbolMaxCodeChar = await input({
      message:
        `Max code characters per symbol [${defaultAuditConfig.symbol.maxCodeChar}]:`,
    });
    const symbolMaxDependency = await input({
      message:
        `Max dependencies per symbol [${defaultAuditConfig.symbol.maxDependency}]:`,
    });
    const symbolMaxDependent = await input({
      message:
        `Max dependents per symbol [${defaultAuditConfig.symbol.maxDependent}]:`,
    });
    const symbolMaxCyclomaticComplexity = await input({
      message:
        `Max cyclomatic complexity per symbol [${defaultAuditConfig.symbol.maxCyclomaticComplexity}]:`,
    });

    const parseOptionalInt = (val: string): number | undefined => {
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      const num = parseInt(trimmed, 10);
      return isNaN(num) ? undefined : num;
    };

    const fileOverrides = {
      maxCodeLine: parseOptionalInt(fileMaxCodeLine),
      maxCodeChar: parseOptionalInt(fileMaxCodeChar),
      maxDependency: parseOptionalInt(fileMaxDependency),
      maxDependent: parseOptionalInt(fileMaxDependent),
      maxCyclomaticComplexity: parseOptionalInt(fileMaxCyclomaticComplexity),
    };

    const symbolOverrides = {
      maxCodeLine: parseOptionalInt(symbolMaxCodeLine),
      maxCodeChar: parseOptionalInt(symbolMaxCodeChar),
      maxDependency: parseOptionalInt(symbolMaxDependency),
      maxDependent: parseOptionalInt(symbolMaxDependent),
      maxCyclomaticComplexity: parseOptionalInt(symbolMaxCyclomaticComplexity),
    };

    const cleanObj = (obj: Record<string, number | undefined>) => {
      const result: Record<string, number> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) result[k] = v;
      }
      return Object.keys(result).length > 0 ? result : undefined;
    };

    const fileClean = cleanObj(fileOverrides);
    const symbolClean = cleanObj(symbolOverrides);

    if (fileClean || symbolClean) {
      auditConfig = {};
      if (fileClean) auditConfig.file = fileClean as typeof auditConfig.file;
      if (symbolClean) {
        auditConfig.symbol = symbolClean as typeof auditConfig.symbol;
      }
    }

    console.info("✅ Audit threshold configuration added");
  }

  const config: z.infer<typeof localConfigSchema> = {
    language: language,
    project: {
      include: includePatterns,
      exclude: excludePatterns.length > 0 ? excludePatterns : undefined,
    },
    outDir: outDir ? outDir : "napi_out",
  };

  if (pythonConfig) {
    config.python = pythonConfig;
  }

  if (cConfig) {
    config.c = cConfig;
  }

  if (labelingConfig) {
    config.labeling = labelingConfig;
  }

  if (auditConfig) {
    config.audit = auditConfig;
  }

  return config;
}
