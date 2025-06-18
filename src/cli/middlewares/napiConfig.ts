import { join } from "@std/path";
import type { Arguments } from "yargs-types";
import z from "zod";
import pythonStdlibList from "../../scripts/generate_python_stdlib_list/output.json" with {
  type: "json",
};
import {
  cLanguage,
  csharpLanguage,
  javaLanguage,
  pythonLanguage,
} from "../../helpers/treeSitter/parsers.ts";

const pythonVersions = Object.keys(pythonStdlibList);

export const localConfigSchema = z.object({
  projectIds: z.array(z.number().int()),
  language: z.enum([pythonLanguage, csharpLanguage, cLanguage, javaLanguage]),
  [pythonLanguage]: z
    .object({
      version: z
        .string()
        .refine((val) => pythonVersions.includes(val), {
          message: `Python version must be one of: ${
            pythonVersions.join(", ")
          }`,
        })
        .optional(),
    })
    .optional(), // python specific config
  [cLanguage]: z
    .object({
      includedirs: z.array(z.string()).optional(),
    })
    .optional(), // c specific config
  project: z.object({
    include: z.array(z.string()),
    exclude: z.array(z.string()).optional(),
  }),
  outDir: z.string(),
});

const napiConfigFileName = ".napirc";

export function getConfigFromWorkDir(workdir: string) {
  const napircPath = join(workdir, napiConfigFileName);

  try {
    Deno.statSync(napircPath);
  } catch {
    throw new Error(`${napiConfigFileName} not found in ${workdir}`);
  }

  const napircContent = Deno.readTextFileSync(napircPath);

  const result = localConfigSchema.safeParse(JSON.parse(napircContent));

  if (!result.success) {
    throw new Error("Invalid NapiConfig: " + result.error);
  }

  if (result.data) {
    return result.data;
  }
}

export function createConfig(
  napiConfig: z.infer<typeof localConfigSchema>,
  workdir: string,
) {
  const napircPath = join(workdir, napiConfigFileName);
  Deno.writeTextFileSync(napircPath, JSON.stringify(napiConfig, null, 2));
}

export function napiConfigMiddleware(
  args: Arguments & {
    workdir: string;
  },
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
    let isConfigExist = false;
    try {
      const stat = Deno.statSync(join(args.workdir, napiConfigFileName));
      isConfigExist = stat.isFile;
    } catch {
      isConfigExist = false;
    }

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
