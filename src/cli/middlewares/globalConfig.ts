import type { Arguments } from "yargs-types";
import { dirname, join } from "@std/path";
import z from "zod";

export const globalConfigSchema = z.object({
  jwt: z.string().optional(),
  token: z.string().optional(),
  apiHost: z.string(),
});

export const defaultApiHost = "https://api.nanoapi.io";

const defaultConfig: z.infer<typeof globalConfigSchema> = {
  apiHost: defaultApiHost,
};

function getConfigPath() {
  const appName = "napi";

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

export function globalConfigMiddleware(
  args: Arguments & {
    workdir: string;
  },
) {
  const configPath = getConfigPath();

  let config: z.infer<typeof globalConfigSchema> = defaultConfig;

  try {
    let exists = false;
    try {
      Deno.statSync(configPath);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists) {
      const content = Deno.readTextFileSync(configPath);
      const result = globalConfigSchema.safeParse(JSON.parse(content));
      if (!result.success) {
        // wrong config, generate a new one
        setConfig(config);
        args.globalConfig = config;
        return;
      }

      // config is valid, use it
      config = result.data;
      args.globalConfig = config;
      return;
    } else {
      // no config, generate a new one
      setConfig(config);
      args.globalConfig = config;
      return;
    }
  } catch (_error) {
    // failed to read or create config, generate a new one
    config = defaultConfig;
    setConfig(config);
    args.globalConfig = config;
    return;
  }
}

export function setConfig(
  config: z.infer<typeof globalConfigSchema>,
) {
  const configPath = getConfigPath();
  const dir = dirname(configPath);
  let dirExists = false;
  try {
    Deno.statSync(dir);
    dirExists = true;
  } catch {
    dirExists = false;
  }
  if (!dirExists) {
    Deno.mkdirSync(dir, { recursive: true });
  }
  Deno.writeTextFileSync(configPath, JSON.stringify(config, null, 2));
}
