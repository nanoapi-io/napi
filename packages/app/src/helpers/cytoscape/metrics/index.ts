import {
  type FileAuditManifest,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
  type SymbolAuditManifest,
} from "@napi/shared";

import type { Metric } from "@napi/shared";

/**
 * Extracts metric severity levels from an audit manifest for visualization.
 *
 * Processes the audit manifest to build a record of severity values (0-5) for each
 * supported metric type. Default severity is 0 (no issues) for metrics not present
 * in the audit manifest.
 *
 * @param auditManifest - Audit information for a file or symbol
 * @returns Object mapping each metric type to its severity level (0-5)
 */
export function getMetricsSeverityForNode(
  auditManifest: FileAuditManifest | SymbolAuditManifest | undefined,
) {
  const metricsSeverity: Record<Metric, number> = {
    [metricLinesCount]: 0,
    [metricCodeLineCount]: 0,
    [metricCodeCharacterCount]: 0,
    [metricCharacterCount]: 0,
    [metricDependencyCount]: 0,
    [metricDependentCount]: 0,
    [metricCyclomaticComplexity]: 0,
  };

  if (auditManifest) {
    Object.entries(auditManifest.alerts).forEach(([metric, value]) => {
      metricsSeverity[metric as Metric] = value.severity;
    });
  }

  return metricsSeverity;
}
