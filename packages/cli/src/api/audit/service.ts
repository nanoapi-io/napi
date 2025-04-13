import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { globSync } from "glob";
import { generateDependencyManifest } from "../../manifest/dependencyManifest";
import { readFileSync } from "fs";
import { join } from "path";
import Parser from "tree-sitter";
import { pythonParser, csharpParser } from "../../helpers/treeSitter/parsers";
import { generateAuditManifest } from "../../manifest/auditManifest";

export function generateAuditResponse(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const supportedLanguages = {
    ["python" as string]: {
      parser: pythonParser,
      validExtensions: [".py"],
    },
    ["c-sharp" as string]: {
      parser: csharpParser,
      validExtensions: [".cs"],
    },
  };

  const supportedLanguage = supportedLanguages[napiConfig.audit.language];
  if (!supportedLanguages) {
    throw new Error(
      `
      Unsupported language: ${napiConfig.audit.language}.
      List of supported languages: ${Object.keys(supportedLanguages).join(", ")}
      Set one of the supported languages in your .napirc file (audit.language).
      `,
    );
  }

  const parser = supportedLanguage.parser;
  const validExtensions = supportedLanguage.validExtensions;

  const filePaths = globSync(napiConfig.audit?.include || ["**"], {
    cwd: workDir,
    nodir: true,
    ignore: napiConfig.audit?.exclude || [],
  });

  const files = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();
  filePaths.forEach((filePath) => {
    const extension = filePath.split(".").pop();
    if (!extension || !validExtensions.includes(`.${extension}`)) {
      return;
    }
    let fileContent: string;
    try {
      const fullPath = join(workDir, filePath);
      fileContent = readFileSync(fullPath, "utf-8");
    } catch (e) {
      console.error(`Error reading ${filePath}, skipping`);
      console.error(e);
      return;
    }
    try {
      const rootNode = parser.parse(fileContent, undefined, {
        bufferSize: fileContent.length + 10,
      }).rootNode;
      files.set(filePath, { path: filePath, rootNode });
    } catch (e) {
      console.error(`Error parsing ${filePath}, skipping`);
      console.error(e);
    }
  });

  console.info(`Parsed ${files.size} files`);

  const dependencyManifest = generateDependencyManifest(
    files,
    parser,
    napiConfig,
  );

  const auditManifest = generateAuditManifest(dependencyManifest, napiConfig);

  return {
    dependencyManifest,
    auditManifest,
  };
}
