import z from "zod";
import { lstatSync, readFileSync } from "fs";
import { globSync } from "glob";
import { localConfigSchema } from "../config/localConfig";
import {
  AuditInstanceReference,
  AuditFileDependency,
  AuditInstance,
  AuditInstanceType,
  AuditMap,
  auditAnalysisResultOk,
  auditAnalysisResultError,
  auditAnalysisResultWarning,
  AuditResult,
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
  private baseDir: string;
  private config: z.infer<typeof localConfigSchema>;
  auditMap: AuditMap;

  constructor(baseDir: string, config: z.infer<typeof localConfigSchema>) {
    this.baseDir = baseDir;
    this.config = config;

    const files = this.#getFiles();

    const auditMap = this.#initAuditMap(files);

    this.auditMap = auditMap;
  }

  #getFiles() {
    const filePaths = globSync(this.config.audit?.include || ["**"], {
      cwd: this.baseDir,
      ignore: this.config.audit?.exclude || [],
    });

    const files: { path: string; sourceCode: string }[] = [];

    filePaths.forEach((filePath) => {
      const fullPath = `${this.baseDir}/${filePath}`;
      if (lstatSync(fullPath).isFile()) {
        // TODO for bigger file, try another encoding to read the file
        const sourceCode = readFileSync(fullPath, "utf8");
        files.push({ path: filePath, sourceCode });
      }
    });

    return files;
  }

  #getTooManyCharInFileResult(target: number, value: number): AuditResult {
    const auditResult: AuditResult = {
      name: "tooManyCharInFile",
      target: target.toString(),
      value: value.toString(),
      result: auditAnalysisResultOk,
      message: {
        short: `File has an acceptable number of characters`,
        long: `The file has ${value} characters, which is less than the target of ${target}.`,
      },
    };

    if (target > 0 && value > target) {
      auditResult.result = auditAnalysisResultError;
      auditResult.message = {
        short: `File has too many characters`,
        long: `The file has ${value} characters, which is more than the target of ${target}.`,
      };
    } else if (target > 0 && value > target * 0.9) {
      auditResult.result = auditAnalysisResultWarning;
      auditResult.message = {
        short: `File has many characters`,
        long: `The file has ${value} characters, which is close to the target of ${target}.`,
      };
    }

    return auditResult;
  }

  #getTooManyCharInInstanceResult(target: number, value: number): AuditResult {
    const auditResult: AuditResult = {
      name: "tooManyCharInInstance",
      target: target.toString(),
      value: value.toString(),
      result: auditAnalysisResultOk,
      message: {
        short: `Instance has an acceptable number of characters`,
        long: `The instance has ${value} characters, which is less than the target of ${target}.`,
      },
    };

    if (target > 0 && value > target) {
      auditResult.result = auditAnalysisResultError;
      auditResult.message = {
        short: `Instance has too many characters`,
        long: `The instance has ${value} characters, which is more than the target of ${target}.`,
      };
    } else if (target > 0 && value > target * 0.9) {
      auditResult.result = auditAnalysisResultWarning;
      auditResult.message = {
        short: `Instance has many characters`,
        long: `The instance has ${value} characters, which is close to the target of ${target}.`,
      };
    }

    return auditResult;
  }

  #getTooManyLineInFileResult(target: number, value: number): AuditResult {
    const auditResult: AuditResult = {
      name: "tooManyLineInFile",
      target: target.toString(),
      value: value.toString(),
      result: auditAnalysisResultOk,
      message: {
        short: `File has an acceptable number of lines`,
        long: `The file has ${value} lines, which is less than the target of ${target}.`,
      },
    };

    if (target > 0 && value > target) {
      auditResult.result = auditAnalysisResultError;
      auditResult.message = {
        short: `File has too many lines`,
        long: `The file has ${value} lines, which is more than the target of ${target}.`,
      };
    } else if (target > 0 && value > target * 0.9) {
      auditResult.result = auditAnalysisResultWarning;
      auditResult.message = {
        short: `File has many lines`,
        long: `The file has ${value} lines, which is close to the target of ${target}.`,
      };
    }

    return auditResult;
  }

  #getTooManyLineInInstanceResult(target: number, value: number): AuditResult {
    const auditResult: AuditResult = {
      name: "tooManyLineInInstance",
      target: target.toString(),
      value: value.toString(),
      result: auditAnalysisResultOk,
      message: {
        short: `Instance has an acceptable number of lines`,
        long: `The instance has ${value} lines, which is less than the target of ${target}.`,
      },
    };

    if (target > 0 && value > target) {
      auditResult.result = auditAnalysisResultError;
      auditResult.message = {
        short: `Instance has too many lines`,
        long: `The instance has ${value} lines, which is more than the target of ${target}.`,
      };
    } else if (target > 0 && value > target * 0.9) {
      auditResult.result = auditAnalysisResultWarning;
      auditResult.message = {
        short: `Instance has many lines`,
        long: `The instance has ${value} lines, which is close to the target of ${target}.`,
      };
    }

    return auditResult;
  }

  #getTooManyInternalDependenciesInFileResult(
    target: number,
    value: number,
  ): AuditResult {
    const auditResult: AuditResult = {
      name: "tooManyInternalDependenciesInFile",
      target: target.toString(),
      value: value.toString(),
      result: auditAnalysisResultOk,
      message: {
        short: `File has an acceptable number of internal dependencies`,
        long: `The file has ${value} internal dependencies, which is less than the target of ${target}.`,
      },
    };

    if (target > 0 && value > target) {
      auditResult.result = auditAnalysisResultError;
      auditResult.message = {
        short: `File has too many internal dependencies`,
        long: `The file has ${value} internal dependencies, which is more than the target of ${target}.`,
      };
    } else if (target > 0 && value > target * 0.9) {
      auditResult.result = auditAnalysisResultWarning;
      auditResult.message = {
        short: `File has many internal dependencies`,
        long: `The file has ${value} internal dependencies, which is close to the target of ${target}.`,
      };
    }

    return auditResult;
  }

  #getTooManyInternalDependenciesInInstanceResult(
    target: number,
    value: number,
  ): AuditResult {
    const auditResult: AuditResult = {
      name: "tooManyInternalDependenciesInInstance",
      target: target.toString(),
      value: value.toString(),
      result: auditAnalysisResultOk,
      message: {
        short: `Instance has an acceptable number of internal dependencies`,
        long: `The instance has ${value} internal dependencies, which is less than the target of ${target}.`,
      },
    };

    if (target > 0 && value > target) {
      auditResult.result = auditAnalysisResultError;
      auditResult.message = {
        short: `Instance has too many internal dependencies`,
        long: `The instance has ${value} internal dependencies, which is more than the target of ${target}.`,
      };
    } else if (target > 0 && value > target * 0.9) {
      auditResult.result = auditAnalysisResultWarning;
      auditResult.message = {
        short: `Instance has many internal dependencies`,
        long: `The instance has ${value} internal dependencies, which is close to the target of ${target}.`,
      };
    }

    return auditResult;
  }

  #initAuditMap(files: { path: string; sourceCode: string }[]) {
    const auditMap: AuditMap = {};

    files.forEach((file) => {
      const fullPath = `${this.baseDir}/${file.path}`;
      const plugin = getLanguagePlugin(this.baseDir, fullPath);

      const tooManyCharInFileResult = this.#getTooManyCharInFileResult(
        this.config.audit?.targetMaxCharInFile || 0,
        file.sourceCode.length,
      );

      const tooManyLineInFileResult = this.#getTooManyLineInFileResult(
        this.config.audit?.targetMaxLineInFile || 0,
        file.sourceCode.split("\n").length,
      );

      if (plugin.constructor === UnknownPlugin) {
        console.warn(`Unknown file type, ignoring: ${file.path}`);

        auditMap[file.path] = {
          id: file.path,
          path: file.path,
          isUnknown: true,
          instances: {},
          dependenciesMap: {},
          auditResults: [tooManyCharInFileResult, tooManyLineInFileResult],
        };
        return;
      }

      let tree: Parser.Tree;
      try {
        tree = plugin.parser.parse(file.sourceCode);
      } catch (e) {
        console.warn(`Failed to parse file, ignoring: ${file.path}`);
        console.warn(e);
        return;
      }

      const depExports = plugin.getExports(tree.rootNode);
      const depImports = plugin.getImports(file.path, tree.rootNode);

      const instances = this.#initInstancesInMap(
        plugin,
        file.path,
        depExports,
        depImports,
      );

      const dependenciesMap = this.#buildFileDependenciesMap(
        plugin,
        tree.rootNode,
        depImports,
      );

      const internalDependencySourcesCount = Object.values(
        dependenciesMap,
      ).filter((dep) => !dep.isExternal).length;

      const tooManyInternalDependenciesResult =
        this.#getTooManyInternalDependenciesInFileResult(
          this.config.audit?.targetMaxDepPerFile || 0,
          internalDependencySourcesCount,
        );

      auditMap[file.path] = {
        id: file.path,
        path: file.path,
        isUnknown: false,
        instances,
        dependenciesMap,
        auditResults: [
          tooManyCharInFileResult,
          tooManyLineInFileResult,
          tooManyInternalDependenciesResult,
        ],
      };
    });

    this.#populateDependentsMap(auditMap);

    this.#performPostAuditAnalysis(auditMap);

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
    currentFilePath: string,
    depExports: DepExport[],
    depImports: DepImport[],
  ) {
    const instanceMap: Record<string, AuditInstance> = {};

    depExports.forEach((depExport) => {
      depExport.identifiers.forEach((depExportIdentifier) => {
        const instanceId = depExportIdentifier.aliasNode
          ? depExportIdentifier.aliasNode.text
          : depExportIdentifier.identifierNode.text;

        const dependenciesMap = this.#buildInstanceDependenciesMap(
          plugin,
          currentFilePath,
          depExportIdentifier,
          depImports,
          depExports,
        );

        const tooManyCharResult = this.#getTooManyCharInInstanceResult(
          this.config.audit?.targetMaxCharPerInstance || 0,
          depExportIdentifier.node.text.length,
        );

        const tooManyLinesResult = this.#getTooManyLineInInstanceResult(
          this.config.audit?.targetMaxLinePerInstance || 0,
          depExportIdentifier.node.text.split("\n").length,
        );

        const internalDependencySourcesCount = Object.values(
          dependenciesMap,
        ).filter((dep) => !dep.isExternal).length;

        const tooManyInternalDependenciesResult =
          this.#getTooManyInternalDependenciesInInstanceResult(
            this.config.audit?.targetMaxDepPerInstance || 0,
            internalDependencySourcesCount,
          );

        instanceMap[instanceId] = {
          id: instanceId,
          name: depExportIdentifier.identifierNode.text,
          type: depExportIdentifier.type as AuditInstanceType,
          dependenciesMap,
          dependentsMap: {},
          auditResults: [
            tooManyCharResult,
            tooManyLinesResult,
            tooManyInternalDependenciesResult,
          ],
        };
      });
    });

    return instanceMap;
  }

  #buildInstanceDependenciesMap(
    plugin: LanguagePlugin,
    currentFilePath: string,
    currentDepExportIdentifier: DepExport["identifiers"][0],
    depImports: DepImport[],
    depExports: DepExport[],
  ) {
    const dependenciesMap: Record<string, AuditInstanceReference> = {};

    depImports.forEach((depImport) => {
      const auditInstanceReference: AuditInstanceReference = {
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
          currentDepExportIdentifier.node,
          lookupIdentifierNode,
        );

        if (matchNodes.length > 0) {
          auditInstanceReference.instanceIds.push(instanceId);
        }
      });

      if (auditInstanceReference.instanceIds.length > 0) {
        dependenciesMap[depImport.source] = auditInstanceReference;
      }
    });

    const auditInstanceReference: AuditInstanceReference = {
      isExternal: false,
      fileId: currentFilePath,
      path: currentFilePath,
      instanceIds: [],
    };
    depExports.forEach((depExport) => {
      depExport.identifiers.forEach((depExportIdentifier) => {
        if (
          depExportIdentifier.identifierNode.text ===
          currentDepExportIdentifier.identifierNode.text
        ) {
          // skip the current instance, we don't want to include it in the dependenciesMap
          return;
        }

        const instanceId = depExportIdentifier.identifierNode.text;
        const lookupIdentifierNode = depExportIdentifier.aliasNode
          ? depExportIdentifier.aliasNode
          : depExportIdentifier.identifierNode;

        const matchNodes = plugin.getIdentifiersNode(
          currentDepExportIdentifier.node,
          lookupIdentifierNode,
        );

        if (matchNodes.length > 0) {
          auditInstanceReference.instanceIds.push(instanceId);
        }
      });
    });

    if (auditInstanceReference.instanceIds.length > 0) {
      dependenciesMap[currentFilePath] = auditInstanceReference;
    }

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

  #performPostAuditAnalysis(auditMap: AuditMap) {
    Object.values(auditMap).forEach((auditFile) => {
      // check if file is unused
      let isUsed = false;
      Object.values(auditMap).forEach((targetFile) => {
        if (targetFile.dependenciesMap[auditFile.id]) {
          isUsed = true;
          return;
        }
      });
      if (!isUsed) {
        // add warning for unused file
        auditFile.auditResults.push({
          name: "unusedFile",
          target: auditFile.id,
          value: "",
          result: auditAnalysisResultWarning,
          message: {
            short: "This file is not used in any other file.",
            long: "This file is not used in any other file.",
          },
        });
      }

      // check for unused instances
      Object.values(auditFile.instances).forEach((instance) => {
        let isUsed = false;
        Object.values(auditMap).forEach((targetFile) => {
          if (targetFile.dependenciesMap[auditFile.id]) {
            targetFile.dependenciesMap[auditFile.id].instances.forEach(() => {
              isUsed = true;
              return;
            });
          }
        });
        if (!isUsed) {
          // add warning for unused instance
          auditFile.auditResults.push({
            name: "unusedInstance",
            target: instance.id,
            value: "",
            result: auditAnalysisResultWarning,
            message: {
              short: "This instance is not used in any file.",
              long: "This instance is not used in any file.",
            },
          });
        }
      });

      // check for circular dependencies
      const circularDependencySources: string[] = [];
      Object.values(auditFile.dependenciesMap).forEach((dependency) => {
        Object.values(auditFile.instances).forEach((instance) => {
          Object.values(instance.dependentsMap).forEach((dependent) => {
            if (dependent.fileId === dependency.fileId) {
              circularDependencySources.push(dependency.fileId);
            }
          });
        });
      });

      circularDependencySources.forEach((source) => {
        auditFile.auditResults.push({
          name: "circularDependency",
          target: source,
          value: "",
          result: auditAnalysisResultError,
          message: {
            short: `This file has a circular dependency with ${source}.`,
            long: `This file has a circular dependency with ${source}.`,
          },
        });
      });
    });
  }
}
