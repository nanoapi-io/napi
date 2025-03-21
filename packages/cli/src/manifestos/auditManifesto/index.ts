import { DependencyManifesto } from "../dependencyManifesto";

export interface AuditMessage {
  shortMessage: string;
  longMessage: string;
  code: string;
  value: string;
  target: string;
  severity: number;
}

export interface SymbolAuditManifesto {
  id: string;
  warnings: AuditMessage[];
  errors: AuditMessage[];
}

export interface FileAuditManifesto {
  id: string;
  filePath: string;
  warnings: AuditMessage[];
  errors: AuditMessage[];
  symbols: Record<string, SymbolAuditManifesto>;
}

export type AuditManifesto = Record<string, FileAuditManifesto>;

export function generateAuditManifesto(
  dependencyManifesto: DependencyManifesto,
): AuditManifesto {
  const auditManifesto: AuditManifesto = {};

  for (const fileManifesto of Object.values(dependencyManifesto)) {
    const fileAuditManifesto: FileAuditManifesto = {
      id: fileManifesto.id,
      filePath: fileManifesto.filePath,
      warnings: [],
      errors: [],
      symbols: {},
    };

    for (const symbol of Object.values(fileManifesto.symbols)) {
      const symbolAuditManifesto: SymbolAuditManifesto = {
        id: symbol.id,
        warnings: [],
        errors: [],
      };
      fileAuditManifesto.symbols[symbol.id] = symbolAuditManifesto;
    }
    auditManifesto[fileManifesto.id] = fileAuditManifesto;
  }

  return auditManifesto;
}
