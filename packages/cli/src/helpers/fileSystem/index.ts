import { globSync } from "npm:glob";
import { dirname, join } from "@std/path";
import { csharpLanguage, pythonLanguage } from "../treeSitter/parsers.ts";

export function getExtensionsForLanguage(language: string) {
  const supportedLanguages: Record<string, string[]> = {
    [pythonLanguage]: ["py"],
    [csharpLanguage]: ["cs", "csproj"],
  };

  const supportedLanguage = supportedLanguages[language];
  if (!supportedLanguage) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return supportedLanguage;
}

export function getFilesFromDirectory(
  dir: string,
  options?: {
    includes?: string[];
    excludes?: string[];
    extensions?: string[];
    logMessages?: boolean;
  },
) {
  const defaultOptions = {
    includes: ["**"],
    excludes: [],
    extensions: [],
    logMessages: false,
  };
  const mergedOptions = { ...defaultOptions, ...options };

  if (mergedOptions.logMessages) console.info(`Getting files from ${dir}...`);

  const relativeFilePaths = globSync(mergedOptions.includes, {
    cwd: dir,
    nodir: true,
    ignore: mergedOptions.excludes,
  });

  if (mergedOptions.logMessages) {
    console.info(
      `Found a total of ${relativeFilePaths.length} files in ${dir}`,
    );
  }

  const files = new Map<string, { path: string; content: string }>();

  relativeFilePaths.forEach((relativeFilePath) => {
    let include = true;
    if (mergedOptions.extensions.length > 0) {
      const fileExtension = relativeFilePath.split(".").pop();
      if (!fileExtension || !mergedOptions.extensions.includes(fileExtension)) {
        include = false;
      }
    }

    if (include) {
      const fullPath = join(dir, relativeFilePath);
      const fileContent = Deno.readTextFileSync(fullPath);
      files.set(relativeFilePath, {
        path: relativeFilePath,
        content: fileContent,
      });
    } else {
      if (mergedOptions.logMessages) {
        console.info(`❌ Not including ${relativeFilePath} (not supported)`);
      }
    }
  });

  if (mergedOptions.logMessages) {
    console.info(`Included a total of ${files.size} files from ${dir}`);
  }

  return files;
}

export function writeFilesToDirectory(
  files: Map<string, { path: string; content: string }>,
  dir: string,
) {
  // empty the directory first
  try {
    Deno.removeSync(dir, { recursive: true });
  } catch {
    // directory doesn't exist
  }
  Deno.mkdirSync(dir, { recursive: true });

  for (const { path, content } of files.values()) {
    const fullPath = join(dir, path);
    Deno.mkdirSync(dirname(fullPath), { recursive: true });
    Deno.writeTextFileSync(fullPath, content);
  }
}
