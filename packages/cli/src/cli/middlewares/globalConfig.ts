import type { Arguments } from "yargs-types";
import { join } from "@std/path";
import z from "zod";

export const globalConfigSchema = z.object({
  userId: z.string(),
  jwt: z.string().optional(),
  apiHost: z.string(),
});

export const defaultApiHost = "https://api.nanoapi.io";

const defaultConfig: z.infer<typeof globalConfigSchema> = {
  userId: crypto.randomUUID(),
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
        config = defaultConfig;
        Deno.writeTextFileSync(configPath, JSON.stringify(config, null, 2));
      }
      if (result.data) {
        config = result.data;
      }
    } else {
      // no config, generate a new one
      config = defaultConfig;
      Deno.writeTextFileSync(configPath, JSON.stringify(config, null, 2));
    }
  } catch (_error) {
    // failed to read or create config, generate a new one
    config = defaultConfig;
    Deno.writeTextFileSync(configPath, JSON.stringify(config, null, 2));
  }

  args.globalConfig = config;
}

export function setJwt(
  config: z.infer<typeof globalConfigSchema>,
  apiHost: string,
  jwt: string,
) {
  config.jwt = jwt;
  config.apiHost = apiHost;
  Deno.writeTextFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}
