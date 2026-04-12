import type { Metric } from "./dependencyManifest";

export type AuditAlert = {
  metric: Metric;
  severity: number;
  message: {
    short: string;
    long: string;
  };
};

export type SymbolAuditManifest = {
  id: string;
  alerts: Record<string, AuditAlert>;
};

export type FileAuditManifest = {
  id: string;
  alerts: Record<string, AuditAlert>;
  symbols: Record<string, SymbolAuditManifest>;
};

export type AuditManifest = Record<string, FileAuditManifest>;
