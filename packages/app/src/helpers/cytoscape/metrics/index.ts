import {
  metricCyclomaticComplexity,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricDependencyCount,
  metricLinesCount,
  metricCharacterCount,
  metricDependentCount,
  FileAuditManifest,
  SymbolAuditManifest,
} from "@napi/shared";

import { Metric } from "@napi/shared";

/**
 * Returns a color for a specific metric severity level based on theme.
 *
 * Maps severity levels (0-5) to appropriate colors in either light or dark theme.
 * Level 0 represents no issues (green), while level 5 represents critical issues (red).
 * Colors are optimized for visibility in each theme mode.
 *
 * @param theme - The current UI theme ("light" or "dark")
 * @param level - The severity level of the metric (0-5)
 * @returns The hex color code for the specified severity level
 */
export function getMetricLevelColor(
  theme: "light" | "dark",
  level: number,
): string {
  const levelToColor =
    theme === "light"
      ? {
          0: "#22c55e", // green - no issues
          1: "#eab308", // yellow - minor issues
          2: "#f97316", // orange - moderate issues
          3: "#d97706", // amber - significant issues
          4: "#991b1b", // dark red - severe issues
          5: "#ef4444", // red - critical issues
        }
      : {
          0: "#4ade80", // lighter green for dark theme - no issues
          1: "#facc15", // brighter yellow for dark theme - minor issues
          2: "#fb923c", // lighter orange for dark theme - moderate issues
          3: "#fbbf24", // brighter amber for dark theme - significant issues
          4: "#b91c1c", // slightly brighter dark red for dark theme - severe issues
          5: "#f87171", // lighter red for dark theme - critical issues
        };

  return levelToColor[level] || levelToColor[5];
}

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
