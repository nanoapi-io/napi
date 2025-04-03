import { DependencyManifest } from "../dependencyManifest";

export interface AuditMessage {
  shortMessage: string;
  longMessage: string;
  code: string;
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
}

export type AuditManifest = Record<string, FileAuditManifest>;

export function generateAuditManifest(
  dependencyManifest: DependencyManifest,
): AuditManifest {
  const AuditManifest: AuditManifest = {};

  for (const fileManifest of Object.values(dependencyManifest)) {
    const fileAuditManifest: FileAuditManifest = {
      id: fileManifest.id,
      filePath: fileManifest.filePath,
      warnings: [],
      errors: [],
      symbols: {},
    };

    for (const symbol of Object.values(fileManifest.symbols)) {
      const SymbolAuditManifest: SymbolAuditManifest = {
        id: symbol.id,
        warnings: [],
        errors: [],
      };
      fileAuditManifest.symbols[symbol.id] = SymbolAuditManifest;
    }
    AuditManifest[fileManifest.id] = fileAuditManifest;
  }

  return AuditManifest;
}
