import { dirname, join } from "@std/path";
import { z } from "npm:zod";

const globalConfigSchema = z.object({
  napiHost: z.string().url(),
  userId: z.string(),
  token: z.string().optional(),
  email: z.string().email().optional(),
});

function getConfigPath() {
  const appName = "napi";
  // const homeDir = os.homedir();

  if (Deno.build.os === "windows") {
    // Windows: Use %APPDATA%
    const homeDir = Deno.env.get("USERPROFILE");
    if (!homeDir) {
      throw new Error("USERPROFILE environment variable not found");
    }
    const appData = Deno.env.get("APPDATA") ||
      join(homeDir, "AppData", "Roaming");
    return join(appData, appName, "config.json");
  } else if (Deno.build.os === "darwin") {
    // macOS: Use ~/Library/Application Support
    const homeDir = Deno.env.get("HOME");
    if (!homeDir) {
      throw new Error("HOME environment variable not found");
    }
    return join(
      homeDir,
      "Library",
      "Application Support",
      appName,
      "config.json",
    );
  } else {
    // Linux and others: Use ~/.config
    const homeDir = Deno.env.get("HOME");
    if (!homeDir) {
      throw new Error("HOME environment variable not found");
    }
    const configDir = Deno.env.get("XDG_CONFIG_HOME") ||
      join(homeDir, ".config");
    return join(configDir, appName, "config.json");
  }
}

function createNewConfig(configPath: string) {
  const config = {
    napiHost: "https://api.nanoapi.io",
    userId: crypto.randomUUID(),
    email: "",
    token: "",
  };

  try {
    const configDir = dirname(configPath);
    try {
      Deno.statSync(configDir);
    } catch {
      Deno.mkdirSync(configDir, { recursive: true });
    }
    Deno.writeTextFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(`Failed to write config: ${error}`);
  }

  return config;
}

export function getOrCreateGlobalConfig() {
  const configPath = getConfigPath();

  let config: z.infer<typeof globalConfigSchema>;

  try {
    let exists = false;
    try {
      Deno.statSync(configPath);
      exists = true;
    } catch {
      // File doesn't exist
    }

    if (exists) {
      const content = Deno.readTextFileSync(configPath);

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

export function updateGlobalConfig(config: z.infer<typeof globalConfigSchema>) {
  try {
    const configPath = getConfigPath();
    Deno.writeTextFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(`Failed to update config: ${error}`);
  }
}

export function setNapiHost(host: string) {
  const config = getOrCreateGlobalConfig();
  config.napiHost = host;
  updateGlobalConfig(config);
}

export function setUserAuthToken(token: string) {
  const config = getOrCreateGlobalConfig();
  config.token = token;
  updateGlobalConfig(config);
}

export function setUserEmail(email: string) {
  const config = getOrCreateGlobalConfig();
  config.email = email;
  updateGlobalConfig(config);
}
