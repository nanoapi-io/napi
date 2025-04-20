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
  lookup: Record<string, AuditMessage[]>; // Allows direct lookup of specific warnings and errors
}

export type AuditManifest = Record<string, FileAuditManifest>;
