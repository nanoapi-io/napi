import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
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

export function getConfigFromWorkDir(workdir: string) {
  const napircPath = path.join(workdir, napiConfigFileName);

  if (!fs.existsSync(napircPath)) {
    throw new Error(`${napiConfigFileName} not found in ${workdir}`);
  }

  const napircContent = fs.readFileSync(napircPath, "utf-8");

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
  const napircPath = path.join(workdir, napiConfigFileName);
  fs.writeFileSync(napircPath, JSON.stringify(napiConfig, null, 2));
}
