import z from "zod";
import { localConfigSchema } from "../../config/localConfig.js";
import { DependencyManifest } from "../dependencyManifest/types.js";

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
  if (value > targetValue * 2) {
    return 3;
  } else if (value > targetValue * 1.5) {
    return 2;
  } else if (value > targetValue * 1.1) {
    return 1;
  } else {
    return 0;
  }
}

export function generateAuditManifest(
  dependencyManifest: DependencyManifest,
  napiConfig: z.infer<typeof localConfigSchema>,
): AuditManifest {
  const AuditManifest: AuditManifest = {};

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
    if (napiConfig.metrics?.file?.maxChar) {
      const charCount = fileManifest.characterCount;
      const maxChar = napiConfig.metrics.file.maxChar;
      if (charCount > maxChar) {
        const error = {
          shortMessage: "File too large",
          longMessage: `File exceeds maximum character limit (${charCount}/${maxChar})`,
          errorCode: "MAX_CHAR_LIMIT_EXCEEDED",
          value: charCount.toString(),
          target: maxChar.toString(),
          severity: getNumberSeverityLevel(charCount, maxChar),
        };
        fileAuditManifest.errors.push(error);
        fileAuditManifest.lookup.targetMaxCharInFile.push(error);
      }
    }

    // Check #2: Lines of Code
    if (napiConfig.metrics?.file?.maxLine) {
      const lineCount = fileManifest.lineCount;
      const maxLine = napiConfig.metrics.file.maxLine;
      if (lineCount > maxLine) {
        const error = {
          shortMessage: "Too many lines",
          longMessage: `File exceeds maximum line count (${lineCount}/${maxLine})`,
          errorCode: "MAX_LINE_LIMIT_EXCEEDED",
          value: lineCount.toString(),
          target: maxLine.toString(),
          severity: getNumberSeverityLevel(lineCount, maxLine),
        };
        fileAuditManifest.errors.push(error);
        fileAuditManifest.lookup.targetMaxLineInFile.push(error);
      }
    }

    // Check #3: Dependencies per File
    if (napiConfig.metrics?.file?.maxDep) {
      const depCount = Object.keys(fileManifest.dependencies).length;
      const maxDep = napiConfig.metrics.file.maxDep;
      if (depCount > maxDep) {
        const error = {
          shortMessage: "Too many dependencies",
          longMessage: `File has too many dependencies (${depCount}/${maxDep})`,
          errorCode: "MAX_DEP_LIMIT_EXCEEDED",
          value: depCount.toString(),
          target: maxDep.toString(),
          severity: getNumberSeverityLevel(depCount, maxDep),
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
