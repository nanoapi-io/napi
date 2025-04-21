import path from "path";
import fs from "fs";
import { z } from "zod";

export const localConfigSchema = z.object({
  language: z.string(), // python, csharp, etc
  python: z
    .object({
      version: z.string().optional(),
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
          maxChar: z.number().optional(),
          maxLine: z.number().optional(),
          maxDep: z.number().optional(),
        })
        .optional(),
      symbol: z
        .object({
          maxChar: z.number().optional(),
          maxLine: z.number().optional(),
          maxDep: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const napiConfigFileName = ".napirc";

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
