import { Metric } from "../dependencyManifest/types.js";

/**
 * Represents an alert for a specific metric that exceeds target thresholds.
 * Alerts can be associated with files or symbols within files.
 */
export interface AuditAlert {
  /** The metric type that triggered this alert */
  metric: Metric;
  /** Severity level from 1 (low) to 5 (critical) */
  severity: 1 | 2 | 3 | 4 | 5;
  /** Alert messages in both short and detailed formats */
  message: {
    /** Brief description of the alert */
    short: string;
    /** Detailed explanation of the alert */
    long: string;
  };
  /** Current value of the metric */
  value: string;
  /** Target threshold value that was exceeded */
  target: string;
}

/**
 * Represents audit information for a specific symbol (class, function, variable)
 * within a file, including any alerts triggered by that symbol.
 */
export interface SymbolAuditManifest {
  /** Unique identifier for the symbol */
  id: string;
  /** Collection of alerts associated with this symbol, keyed by alert ID */
  alerts: Record<string, AuditAlert>;
}

/**
 * Represents audit information for a specific file, including alerts at the
 * file level and for individual symbols within the file.
 */
export interface FileAuditManifest {
  /** Unique identifier for the file, typically the file path */
  id: string;
  /** Collection of alerts associated with this file, keyed by alert ID */
  alerts: Record<string, AuditAlert>;
  /** Audit information for individual symbols within this file */
  symbols: Record<string, SymbolAuditManifest>;
}

/**
 * A global structure mapping each file's unique ID to its audit information.
 * This collectively represents the project's audit manifest.
 */
export type AuditManifest = Record<string, FileAuditManifest>;
