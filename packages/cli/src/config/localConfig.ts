import path from "path";
import fs from "fs";
import { z } from "zod";

export const localConfigSchema = z.object({
  audit: z.object({
    language: z.string(), // python for now, more later
    pythonVersion: z.string().optional(), // only for python
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
    targetMaxCharInFile: z.number().optional(),
    targetMaxLineInFile: z.number().optional(),
    targetMaxDepPerFile: z.number().optional(),
    targetMaxCharPerInstance: z.number().optional(),
    targetMaxLinePerInstance: z.number().optional(),
    targetMaxDepPerInstance: z.number().optional(),
    manifestoJsonOutputPath: z.string().optional(),
  }),
});

export const napiConfigFileName = ".napirc";

export function getConfigFromWorkDir(workdir: string) {
  const napircPath = path.join(workdir, napiConfigFileName);

  if (!fs.existsSync(napircPath)) {
    return undefined;
  }

  const napircContent = fs.readFileSync(napircPath, "utf-8");

  const result = localConfigSchema.safeParse(JSON.parse(napircContent));

  if (!result.success) {
    console.error("Invalid NapiConfig:", result.error);
    return;
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
