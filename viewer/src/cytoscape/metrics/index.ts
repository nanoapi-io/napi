import type * as auditManifestTypes from "../../types/auditManifest";
import * as dependencyManifestTypes from "../../types/dependencyManifest";

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
  auditManifest:
    | auditManifestTypes.AuditManifest[string]
    | auditManifestTypes.AuditManifest[string]["symbols"][string]
    | undefined,
) {
  const metricsSeverity: Record<dependencyManifestTypes.Metric, number> = {
    [dependencyManifestTypes.metricLinesCount]: 0,
    [dependencyManifestTypes.metricCodeLineCount]: 0,
    [dependencyManifestTypes.metricCodeCharacterCount]: 0,
    [dependencyManifestTypes.metricCharacterCount]: 0,
    [dependencyManifestTypes.metricDependencyCount]: 0,
    [dependencyManifestTypes.metricDependentCount]: 0,
    [dependencyManifestTypes.metricCyclomaticComplexity]: 0,
  };

  if (auditManifest) {
    Object.entries(auditManifest.alerts).forEach(([metric, value]) => {
      metricsSeverity[metric as dependencyManifestTypes.Metric] =
        value.severity;
    });
  }

  return metricsSeverity;
}
