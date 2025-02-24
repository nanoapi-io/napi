import z from "zod";
import path from "path";
import fs from "fs";
import { localConfigSchema } from "../config/localConfig";
import {
  AuditInstanceReference,
  AuditFileDependency,
  AuditInstance,
  AuditInstanceType,
  AuditMap,
  auditAnalysisResultOk,
  AuditAnalysisResult,
  auditAnalysisResultError,
  auditAnalysisResultWarning,
  AuditAnalysis,
} from "./types";
import { getLanguagePlugin } from "../languagesPlugins";
import UnknownPlugin from "../languagesPlugins/unknown";
import {
  DepExport,
  DepImport,
  LanguagePlugin,
} from "../languagesPlugins/types";
import Parser from "tree-sitter";

export class Audit {
  auditMap: AuditMap;

  constructor(baseDir: string, config: z.infer<typeof localConfigSchema>) {
    const files = this.#getFiles(baseDir, config);

    const auditMap = this.#initAuditMap(baseDir, files, config);

    this.auditMap = auditMap;
  }

  #getFiles(baseDir: string, config: z.infer<typeof localConfigSchema>) {
    const patterns = config.audit?.patterns
      ? config.audit?.patterns.map((pattern) => path.join(baseDir, pattern))
      : [`${baseDir}/**`];

    let filePaths = fs.globSync(patterns);
    filePaths = filePaths.filter((filePath) => fs.lstatSync(filePath).isFile());

    const files: { path: string; sourceCode: string }[] = [];

    filePaths.forEach((filePath) => {
      const sourceCode = fs.readFileSync(filePath, "utf8");
      files.push({ path: filePath, sourceCode });
    });

    return files;
  }

  #initAuditMap(
    baseDir: string,
    files: { path: string; sourceCode: string }[],
    config: z.infer<typeof localConfigSchema>,
  ) {
    const auditMap: AuditMap = {};

    files.forEach((file) => {
      const plugin = getLanguagePlugin(baseDir, file.path);

      const tooManyChar = this.#getAnalysis(
        file.sourceCode.length,
        config.audit?.targetMaxCharInFile || 0,
      );

      const tooManyLines = this.#getAnalysis(
        file.sourceCode.split("\n").length,
        config.audit?.targetMaxLineInFile || 0,
      );

      if (plugin.constructor === UnknownPlugin) {
        console.warn(`Unknown file type, ignoring: ${file.path}`);

        const tooManyInternalDependencies = this.#getAnalysis(0, 0);

        auditMap[file.path] = {
          id: file.path,
          path: file.path,
          isUnknown: true,
          instances: {},
          dependenciesMap: {},
          analysis: {
            tooManyChar,
            tooManyLines,
            tooManyInternalDependencies,
          },
        };
        return;
      }

      const tree = plugin.parser.parse(file.sourceCode);

      const depExports = plugin.getExports(tree.rootNode);
      const depImports = plugin.getImports(file.path, tree.rootNode);

      const instances = this.#initInstancesInMap(
        plugin,
        depExports,
        depImports,
        config,
      );

      const dependenciesMap = this.#buildFileDependenciesMap(
        plugin,
        tree.rootNode,
        depImports,
      );

      const internalDependencySourcesCount = Object.values(
        dependenciesMap,
      ).filter((dep) => !dep.isExternal).length;

      const tooManyInternalDependencies = this.#getAnalysis(
        internalDependencySourcesCount,
        config.audit?.targetMaxDepPerFile || 0,
      );

      auditMap[file.path] = {
        id: file.path,
        path: file.path,
        isUnknown: false,
        instances,
        dependenciesMap,
        analysis: {
          tooManyChar,
          tooManyLines,
          tooManyInternalDependencies,
        },
      };
    });

    this.#populateDependentsMap(auditMap);

    return auditMap;
  }

  #buildFileDependenciesMap(
    plugin: LanguagePlugin,
    node: Parser.SyntaxNode,
    depImports: DepImport[],
  ) {
    const fileDependenciesMap: Record<string, AuditFileDependency> = {};

    depImports.forEach((depImport) => {
      if (!fileDependenciesMap[depImport.source]) {
        fileDependenciesMap[depImport.source] = {
          isExternal: depImport.isExternal,
          fileId: depImport.source,
          path: depImport.source,
          instances: [],
        };
      }

      depImport.identifiers.forEach((depImportIdentifier) => {
        const instanceId = depImportIdentifier.identifierNode.text;
        const lookupIdentifierNode = depImportIdentifier.aliasNode
          ? depImportIdentifier.aliasNode
          : depImportIdentifier.identifierNode;

        const matchNodes = plugin.getIdentifiersNode(
          node,
          lookupIdentifierNode,
        );

        fileDependenciesMap[depImport.source].instances.push({
          id: instanceId,
          isUsed: matchNodes.length > 0,
        });
      });
    });

    return fileDependenciesMap;
  }

  #initInstancesInMap(
    plugin: LanguagePlugin,
    depExports: DepExport[],
    depImports: DepImport[],
    config: z.infer<typeof localConfigSchema>,
  ) {
    const instanceMap: Record<string, AuditInstance> = {};

    depExports.forEach((depExport) => {
      depExport.identifiers.forEach((depExportIdentifier) => {
        const instanceId = depExportIdentifier.aliasNode
          ? depExportIdentifier.aliasNode.text
          : depExportIdentifier.identifierNode.text;

        const dependenciesMap = this.#buildInstanceDependenciesMap(
          plugin,
          depExportIdentifier,
          depImports,
        );

        const tooManyChar = this.#getAnalysis(
          depExportIdentifier.node.text.length,
          config.audit?.targetMaxCharPerInstance || 0,
        );

        const tooManyLines = this.#getAnalysis(
          depExportIdentifier.node.text.split("\n").length,
          config.audit?.targetMaxLinePerInstance || 0,
        );

        const internalDependencySourcesCount = Object.values(
          dependenciesMap,
        ).filter((dep) => !dep.isExternal).length;

        const tooManyInternalDependencies = this.#getAnalysis(
          internalDependencySourcesCount,
          config.audit?.targetMaxDepPerInstance || 0,
        );

        instanceMap[instanceId] = {
          id: instanceId,
          name: depExportIdentifier.identifierNode.text,
          type: depExport.type as AuditInstanceType,
          dependenciesMap,
          dependentsMap: {},
          analysis: {
            tooManyChar,
            tooManyLines,
            tooManyInternalDependencies,
          },
        };
      });
    });

    return instanceMap;
  }

  #buildInstanceDependenciesMap(
    plugin: LanguagePlugin,
    depExportIdentifier: DepExport["identifiers"][0],
    depImports: DepImport[],
  ) {
    const dependenciesMap: Record<string, AuditInstanceReference> = {};

    depImports.forEach((depImport) => {
      const AuditInstanceReference: AuditInstanceReference = {
        isExternal: depImport.isExternal,
        fileId: depImport.source,
        path: depImport.source,
        instanceIds: [],
      };

      depImport.identifiers.forEach((depImportIdentifier) => {
        const instanceId = depImportIdentifier.identifierNode.text;
        const lookupIdentifierNode = depImportIdentifier.aliasNode
          ? depImportIdentifier.aliasNode
          : depImportIdentifier.identifierNode;

        const matchNodes = plugin.getIdentifiersNode(
          depExportIdentifier.node,
          lookupIdentifierNode,
        );

        if (matchNodes.length > 0) {
          AuditInstanceReference.instanceIds.push(instanceId);
        }
      });

      if (AuditInstanceReference.instanceIds.length > 0) {
        dependenciesMap[depImport.source] = AuditInstanceReference;
      }
    });

    return dependenciesMap;
  }

  #populateDependentsMap(auditMap: AuditMap) {
    // Single pass over each file
    Object.values(auditMap).forEach((auditFile) => {
      // A) FILE-LEVEL PASS
      Object.entries(auditFile.dependenciesMap).forEach(
        ([depFileId, fileDep]) => {
          if (fileDep.isExternal) return;

          const targetFile = auditMap[depFileId];
          if (!targetFile) return;

          // For each instance in the target file that the file says is "used"
          fileDep.instances.forEach(({ id: targetInstanceId, isUsed }) => {
            if (!isUsed) return; // skip if the file doesn't actually use it
            const targetInstance = targetFile.instances[targetInstanceId];
            if (!targetInstance) return;

            // Ensure the target instance has a reverse-ref entry for this file
            if (!targetInstance.dependentsMap[auditFile.id]) {
              targetInstance.dependentsMap[auditFile.id] = {
                isExternal: false,
                fileId: auditFile.id,
                path: auditFile.path,
                // We don't push any local instance IDs here, so we leave it empty
                instanceIds: [],
              };
            }
          });
        },
      );

      // B) INSTANCE-LEVEL PASS
      Object.values(auditFile.instances).forEach((instance) => {
        Object.values(instance.dependenciesMap).forEach((dependencyRel) => {
          if (dependencyRel.isExternal) return;

          const targetFile = auditMap[dependencyRel.fileId];
          if (!targetFile) return;

          // For each target instance in the dependency
          dependencyRel.instanceIds.forEach((targetInstanceId) => {
            const targetInstance = targetFile.instances[targetInstanceId];
            if (!targetInstance) return;

            // Ensure the target instance has a reverse-ref entry for this file
            if (!targetInstance.dependentsMap[auditFile.id]) {
              targetInstance.dependentsMap[auditFile.id] = {
                isExternal: false,
                fileId: auditFile.id,
                path: auditFile.path,
                instanceIds: [],
              };
            }

            // Add the current instance ID if not already present
            const revRel = targetInstance.dependentsMap[auditFile.id];
            if (!revRel.instanceIds.includes(instance.id)) {
              revRel.instanceIds.push(instance.id);
            }
          });
        });
      });
    });
  }

  #getAnalysis(value: number, target: number) {
    let result: AuditAnalysisResult = auditAnalysisResultOk;

    if (target === 0) {
      result = auditAnalysisResultOk;
    } else if (value > target) {
      result = auditAnalysisResultError;
    } else if (value > target * 0.9) {
      result = auditAnalysisResultWarning;
    }

    const analysis: AuditAnalysis = {
      value,
      target,
      result,
    };

    return analysis;
  }
}
