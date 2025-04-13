import z from "zod";
import { localConfigSchema } from "../../config/localConfig";
import { DependencyManifest } from "../dependencyManifest";

export interface AuditMessage {
  shortMessage: string;
  longMessage: string;
  errorCode: string;
  value: string;
  target: string;
  severity: number;
}

export interface SymbolAuditManifest {
  id: string;
  warnings: AuditMessage[];
  errors: AuditMessage[];
}

export interface FileAuditManifest {
  id: string;
  filePath: string;
  warnings: AuditMessage[];
  errors: AuditMessage[];
  symbols: Record<string, SymbolAuditManifest>;
  lookup: Record<string, AuditMessage[]>; // Allows direct lookup of specific warnings and errors
}

export type AuditManifest = Record<string, FileAuditManifest>;

export function getNumberSeverityLevel(value: number, targetValue = 0): number {
  if (value > targetValue * 1.1) {
    return 1;
  } else if (value > targetValue * 1.5) {
    return 2;
  } else if (value > targetValue * 2) {
    return 3;
  } else {
    return 0;
  }
}

export function generateAuditManifest(
  dependencyManifest: DependencyManifest,
  napiConfig: z.infer<typeof localConfigSchema>,
): AuditManifest {
  const AuditManifest: AuditManifest = {};

  const auditConfig = napiConfig.audit;

  for (const fileManifest of Object.values(dependencyManifest)) {
    const fileAuditManifest: FileAuditManifest = {
      id: fileManifest.id,
      filePath: fileManifest.filePath,
      warnings: [],
      errors: [],
      symbols: {},
      lookup: {
        targetMaxCharInFile: [],
        targetMaxLineInFile: [],
        targetMaxDepPerFile: [],
      }, // Allows direct lookup of specific warnings and errors
    };

    // Check #1: File length (characters)
    if (auditConfig.targetMaxCharInFile) {
      const charCount = fileManifest.characterCount;
      if (charCount > auditConfig.targetMaxCharInFile) {
        const error = {
          shortMessage: "File too large",
          longMessage: `File exceeds maximum character limit (${charCount}/${auditConfig.targetMaxCharInFile})`,
          errorCode: "MAX_CHAR_LIMIT_EXCEEDED",
          value: charCount.toString(),
          target: auditConfig.targetMaxCharInFile.toString(),
          severity: getNumberSeverityLevel(
            charCount,
            auditConfig.targetMaxCharInFile,
          ),
        };
        fileAuditManifest.errors.push(error);
        fileAuditManifest.lookup.targetMaxCharInFile.push(error);
      }
    }

    // Check #2: Lines of Code
    if (auditConfig.targetMaxLineInFile) {
      const lineCount = fileManifest.lineCount;
      if (lineCount > auditConfig.targetMaxLineInFile) {
        const error = {
          shortMessage: "Too many lines",
          longMessage: `File exceeds maximum line count (${lineCount}/${auditConfig.targetMaxLineInFile})`,
          errorCode: "MAX_LINE_LIMIT_EXCEEDED",
          value: lineCount.toString(),
          target: auditConfig.targetMaxLineInFile.toString(),
          severity: getNumberSeverityLevel(
            lineCount,
            auditConfig.targetMaxLineInFile,
          ),
        };
        fileAuditManifest.errors.push(error);
        fileAuditManifest.lookup.targetMaxLineInFile.push(error);
      }
    }

    // Check #3: Dependencies per File
    if (auditConfig.targetMaxDepPerFile) {
      const depCount = Object.keys(fileManifest.dependencies).length;
      if (depCount > auditConfig.targetMaxDepPerFile) {
        const error = {
          shortMessage: "Too many dependencies",
          longMessage: `File has too many dependencies (${depCount}/${auditConfig.targetMaxDepPerFile})`,
          errorCode: "MAX_DEP_LIMIT_EXCEEDED",
          value: depCount.toString(),
          target: auditConfig.targetMaxDepPerFile.toString(),
          severity: getNumberSeverityLevel(
            depCount,
            auditConfig.targetMaxDepPerFile,
          ),
        };
        fileAuditManifest.errors.push(error);
        fileAuditManifest.lookup.targetMaxDepPerFile.push(error);
      }
    }

    // TODO: add symbol-level audits similarly here if needed
    for (const symbol of Object.values(fileManifest.symbols)) {
      const symbolAuditManifest: SymbolAuditManifest = {
        id: symbol.id,
        warnings: [],
        errors: [],
      };
      fileAuditManifest.symbols[symbol.id] = symbolAuditManifest;
    }

    AuditManifest[fileManifest.id] = fileAuditManifest;
  }

  return AuditManifest;
}
