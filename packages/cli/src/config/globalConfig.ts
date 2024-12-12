import os from "os";
import path from "path";
import fs from "fs";
import { v4 } from "uuid";
import { z } from "zod";

export const globalConfigSchema = z.object({
  userId: z.string(),
});

function getConfigPath() {
  const appName = "napi";
  const homeDir = os.homedir();

  if (os.platform() === "win32") {
    // Windows: Use %APPDATA%
    const appData =
      process.env.APPDATA || path.join(homeDir, "AppData", "Roaming");
    return path.join(appData, appName, "config.json");
  } else if (os.platform() === "darwin") {
    // macOS: Use ~/Library/Application Support
    return path.join(
      homeDir,
      "Library",
      "Application Support",
      appName,
      "config.json",
    );
  } else {
    // Linux and others: Use ~/.config
    const configDir =
      process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config");
    return path.join(configDir, appName, "config.json");
  }
}

async function createNewConfig(configPath: string) {
  const config = {
    userId: v4(),
  };

  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(`Failed to write config: ${error}`);
  }

  return config;
}

export async function getOrCreateGlobalConfig() {
  const configPath = getConfigPath();

  let config: z.infer<typeof globalConfigSchema>;

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");

      try {
        config = globalConfigSchema.parse(JSON.parse(content));
      } catch (error) {
        console.debug(`Failed to parse config: ${error}`);
        config = await createNewConfig(configPath);
      }
    } else {
      config = await createNewConfig(configPath);
    }
  } catch (error) {
    console.error(`Failed to read or create config: ${error}`);
    config = await createNewConfig(configPath);
  }

  return config;
}

export function updateConfig(newConfig: z.infer<typeof globalConfigSchema>) {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
}
