import path from "path";
import fs from "fs";
import { z } from "zod";

export const localConfigSchema = z.object({
  entrypoint: z.string(),
  out: z.string(),
  openai: z
    .object({
      apiKey: z.string().optional(),
      apiKeyFilePath: z.string().optional(),
    })
    .optional(),
  visualizer: z
    .object({
      targetMaxCharInFile: z.number().optional(),
      targetMaxLineInFile: z.number().optional(),
      targetMaxDepPerFile: z.number().optional(),
    })
    .optional(),
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
    result.data.entrypoint = path.join(workdir, result.data.entrypoint);
    result.data.out = path.join(workdir, result.data.out);

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

export function getOpenaiApiKeyFromConfig(
  workdir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  if (napiConfig.openai?.apiKey) return napiConfig.openai.apiKey;

  if (napiConfig.openai?.apiKeyFilePath) {
    // check if file exists (use workdir)
    const filePath = path.join(workdir, napiConfig.openai.apiKeyFilePath);

    // check if file exists
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return content;
    }
  }
}
