import { join } from "@std/path";
import { z } from "npm:zod";
import pythonStdlibList from "../scripts/generate_python_stdlib_list/output.json" with {
  type: "json",
};
import {
  cLanguage,
  csharpLanguage,
  pythonLanguage,
} from "../helpers/treeSitter/parsers.ts";

const pythonVersions = Object.keys(pythonStdlibList);

export const localConfigSchema = z.object({
  language: z.enum([pythonLanguage, csharpLanguage, cLanguage]),
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
  metrics: z
    .object({
      file: z
        .object({
          maxCodeChar: z.number().optional(),
          maxChar: z.number().optional(),
          maxCodeLine: z.number().optional(),
          maxLine: z.number().optional(),
          maxDependency: z.number().optional(),
          maxDependent: z.number().optional(),
          maxCyclomaticComplexity: z.number().optional(),
        })
        .optional(),
      symbol: z
        .object({
          maxCodeChar: z.number().optional(),
          maxChar: z.number().optional(),
          maxCodeLine: z.number().optional(),
          maxLine: z.number().optional(),
          maxDependency: z.number().optional(),
          maxDependent: z.number().optional(),
          maxCyclomaticComplexity: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

const napiConfigFileName = ".napirc";

export function isConfigExistInWorkdir(workdir: string) {
  try {
    const napircPath = join(workdir, napiConfigFileName);
    return Deno.statSync(napircPath).isFile;
  } catch {
    return false;
  }
}

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
