import type { Arguments } from "yargs-types";
import type { z } from "zod";
import {
  type globalConfigSchema,
  setConfig,
} from "../../middlewares/globalConfig.ts";
import {
  ANTHROPIC_PROVIDER,
  GOOGLE_PROVIDER,
  type ModelProvider,
  OPENAI_PROVIDER,
} from "../../../manifest/dependencyManifest/labeling/model.ts";
import { input, select } from "@inquirer/prompts";

async function handler(
  argv: Arguments & {
    globalConfig: z.infer<typeof globalConfigSchema>;
  },
) {
  const globalConfig = argv.globalConfig as z.infer<typeof globalConfigSchema>;

  const provider = await select({
    message: "Select a provider",
    choices: [
      { name: "Google", value: GOOGLE_PROVIDER },
      { name: "OpenAI", value: OPENAI_PROVIDER },
      { name: "Anthropic", value: ANTHROPIC_PROVIDER },
    ],
  }) as ModelProvider;

  const apiKey = await input({
    message: "Enter the API key",
    validate: (value) => {
      if (value.length === 0) {
        return "API key cannot be empty";
      }
      return true;
    },
  });

  const labeling = globalConfig.labeling || { apiKeys: {} };
  labeling.apiKeys[provider] = apiKey;
  setConfig({ ...globalConfig, labeling });

  console.info("API key set successfully");
}

export default {
  command: "apiKey",
  describe: "set an API key for a model provider in your global config",
  builder: () => {},
  handler,
};
