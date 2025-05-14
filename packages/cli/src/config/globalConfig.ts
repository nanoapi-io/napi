import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { v4 } from "npm:uuid";
import { z } from "npm:zod";
import process from "node:process";

const globalConfigSchema = z.object({
  userId: z.string(),
});

function getConfigPath() {
  const appName = "napi";
  const homeDir = os.homedir();

  if (os.platform() === "win32") {
    // Windows: Use %APPDATA%
    const appData = process.env.APPDATA ||
      path.join(homeDir, "AppData", "Roaming");
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
    const configDir = process.env.XDG_CONFIG_HOME ||
      path.join(homeDir, ".config");
    return path.join(configDir, appName, "config.json");
  }
}

function createNewConfig(configPath: string) {
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

export function getOrCreateGlobalConfig() {
  const configPath = getConfigPath();

  let config: z.infer<typeof globalConfigSchema>;

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");

      try {
        config = globalConfigSchema.parse(JSON.parse(content));
      } catch (error) {
        console.debug(`Failed to parse config: ${error}`);
        config = createNewConfig(configPath);
      }
    } else {
      config = createNewConfig(configPath);
    }
  } catch (error) {
    console.error(`Failed to read or create config: ${error}`);
    config = createNewConfig(configPath);
  }

  return config;
}
