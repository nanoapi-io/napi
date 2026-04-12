import type { Metric } from "../dependencyManifest/types.ts";

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

export interface AuditConfig {
  file: {
    maxCodeChar: number;
    maxChar: number;
    maxCodeLine: number;
    maxLine: number;
    maxDependency: number;
    maxDependent: number;
    maxCyclomaticComplexity: number;
  };
  symbol: {
    maxCodeChar: number;
    maxChar: number;
    maxCodeLine: number;
    maxLine: number;
    maxDependency: number;
    maxDependent: number;
    maxCyclomaticComplexity: number;
  };
}

export const defaultAuditConfig: AuditConfig = {
  file: {
    maxCodeChar: 1000,
    maxChar: 1000,
    maxCodeLine: 100,
    maxLine: 100,
    maxDependency: 100,
    maxDependent: 100,
    maxCyclomaticComplexity: 100,
  },
  symbol: {
    maxCodeChar: 100,
    maxChar: 100,
    maxCodeLine: 10,
    maxLine: 10,
    maxDependency: 10,
    maxDependent: 10,
    maxCyclomaticComplexity: 10,
  },
};
