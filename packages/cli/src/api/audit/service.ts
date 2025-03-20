import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { globSync } from "glob";
import { generateDependencyManifesto } from "../../manifestos/dependencyManifesto";
import { readFileSync } from "fs";
import { join } from "path";
import Parser from "tree-sitter";
import { pythonParser } from "../../helpers/treeSitter/parsers";
import { generateAuditManifesto } from "../../manifestos/auditManifesto";

export function generateAuditResponse(
  workDir: string,
  napiConfig: z.infer<typeof localConfigSchema>,
) {
  const filePaths = globSync(napiConfig.audit?.include || ["**"], {
    cwd: workDir,
    nodir: true,
    ignore: napiConfig.audit?.exclude || [],
  });

  const parser = pythonParser;
  const files = new Map<
    string,
    { path: string; rootNode: Parser.SyntaxNode }
  >();
  filePaths.forEach((filePath) => {
    if (!filePath.endsWith(".py")) {
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

  const dependencyManifesto = generateDependencyManifesto(
    files,
    parser.getLanguage(),
  );

  const auditManifesto = generateAuditManifesto(dependencyManifesto);

  return {
    dependencyManifesto,
    auditManifesto,
  };
}
