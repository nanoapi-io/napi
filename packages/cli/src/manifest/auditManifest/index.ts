import z from "zod";
import { localConfigSchema } from "../../config/localConfig.js";
import {
  AuditAlert,
  DependencyManifest,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@nanoapi.io/shared";
import {
  AuditManifest,
  FileAuditManifest,
  SymbolAuditManifest,
} from "@nanoapi.io/shared";

function getNumberSeverityLevel(
  value: number,
  targetValue = 0,
): 1 | 2 | 3 | 4 | 5 {
  if (value > targetValue * 10) {
    return 5;
  } else if (value > targetValue * 5) {
    return 4;
  } else if (value > targetValue * 2) {
    return 3;
  } else if (value > targetValue * 1.5) {
    return 2;
  } else {
    return 1;
  }
}

export function generateAuditManifest(
  dependencyManifest: DependencyManifest,
  napiConfig: z.infer<typeof localConfigSchema>,
): AuditManifest {
  const AuditManifest: AuditManifest = {};

  for (const fileDependencyManifest of Object.values(dependencyManifest)) {
    const fileAuditManifest: FileAuditManifest = {
      id: fileDependencyManifest.id,
      alerts: {},
      symbols: {},
    };

    // Check #1: File length (characters)
    if (napiConfig.metrics?.file?.maxCodeChar) {
      const value = fileDependencyManifest.metrics[metricCodeCharacterCount];
      const target = napiConfig.metrics.file.maxCodeChar;
      if (value > target) {
        const alert: AuditAlert = {
          metric: metricCodeCharacterCount,
          severity: getNumberSeverityLevel(value, target),
          message: {
            short: "File too large",
            long: `File exceeds maximum character limit (${value}/${target})`,
          },
          value: value.toString(),
          target: target.toString(),
        };
        fileAuditManifest.alerts[metricCodeCharacterCount] = alert;
      }
    }
    if (napiConfig.metrics?.file?.maxChar) {
      const value = fileDependencyManifest.metrics[metricCharacterCount];
      const target = napiConfig.metrics.file.maxChar;
      if (value > target) {
        const alert: AuditAlert = {
          metric: metricCharacterCount,
          severity: getNumberSeverityLevel(value, target),
          message: {
            short: "File too large",
            long: `File exceeds maximum character limit (${value}/${target})`,
          },
          value: value.toString(),
          target: target.toString(),
        };
        fileAuditManifest.alerts[metricCharacterCount] = alert;
      }
    }

    // Check #2: Lines of Code
    if (napiConfig.metrics?.file?.maxCodeLine) {
      const value = fileDependencyManifest.metrics[metricCodeLineCount];
      const target = napiConfig.metrics.file.maxCodeLine;
      if (value > target) {
        const alert: AuditAlert = {
          metric: metricCodeLineCount,
          severity: getNumberSeverityLevel(value, target),
          message: {
            short: "Too many lines",
            long: `File exceeds maximum line count (${value}/${target})`,
          },
          value: value.toString(),
          target: target.toString(),
        };
        fileAuditManifest.alerts[metricCodeLineCount] = alert;
      }
    }
    if (napiConfig.metrics?.file?.maxLine) {
      const value = fileDependencyManifest.metrics[metricLinesCount];
      const target = napiConfig.metrics.file.maxLine;
      if (value > target) {
        const alert: AuditAlert = {
          metric: metricLinesCount,
          severity: getNumberSeverityLevel(value, target),
          message: {
            short: "Too many lines",
            long: `File exceeds maximum line count (${value}/${target})`,
          },
          value: value.toString(),
          target: target.toString(),
        };
        fileAuditManifest.alerts[metricLinesCount] = alert;
      }
    }

    // Check #3: Dependencies per File
    if (napiConfig.metrics?.file?.maxDependency) {
      const value = fileDependencyManifest.metrics[metricDependencyCount];
      const target = napiConfig.metrics.file.maxDependency;
      if (value > target) {
        const alert: AuditAlert = {
          metric: metricDependencyCount,
          severity: getNumberSeverityLevel(value, target),
          message: {
            short: "Too many dependencies",
            long: `File exceeds maximum dependency count (${value}/${target})`,
          },
          value: value.toString(),
          target: target.toString(),
        };
        fileAuditManifest.alerts[metricDependencyCount] = alert;
      }
    }
    if (napiConfig.metrics?.file?.maxDependent) {
      const value = fileDependencyManifest.metrics[metricDependentCount];
      const target = napiConfig.metrics.file.maxDependent;
      if (value > target) {
        const alert: AuditAlert = {
          metric: metricDependentCount,
          severity: getNumberSeverityLevel(value, target),
          message: {
            short: "Too many dependents",
            long: `File exceeds maximum dependent count (${value}/${target})`,
          },
          value: value.toString(),
          target: target.toString(),
        };
        fileAuditManifest.alerts[metricDependentCount] = alert;
      }
    }

    // Check #4: Cyclomatic Complexity per file
    if (napiConfig.metrics.file.maxCyclomaticComplexity) {
      const value = fileDependencyManifest.metrics[metricCyclomaticComplexity];
      const target = napiConfig.metrics.file.maxCyclomaticComplexity;
      if (value > target) {
        const alert: AuditAlert = {
          metric: metricCyclomaticComplexity,
          severity: getNumberSeverityLevel(value, target),
          message: {
            short: "Too complex",
            long: `File exceeds maximum cyclomatic complexity (${value}/${target})`,
          },
          value: value.toString(),
          target: target.toString(),
        };
        fileAuditManifest.alerts[metricCyclomaticComplexity] = alert;
      }
    }

    for (const symbol of Object.values(fileDependencyManifest.symbols)) {
      const symbolAuditManifest: SymbolAuditManifest = {
        id: symbol.id,
        alerts: {},
      };

      // Check #1: Symbol length (characters)
      if (napiConfig.metrics?.symbol?.maxCodeChar) {
        const value = symbol.metrics[metricCodeCharacterCount];
        const target = napiConfig.metrics.symbol.maxCodeChar;
        if (value > target) {
          const alert: AuditAlert = {
            metric: metricCodeCharacterCount,
            severity: getNumberSeverityLevel(value, target),
            message: {
              short: "Symbol too large",
              long: `Symbol exceeds maximum character limit (${value}/${target})`,
            },
            value: value.toString(),
            target: target.toString(),
          };
          symbolAuditManifest.alerts[metricCodeCharacterCount] = alert;
        }
      }
      if (napiConfig.metrics?.symbol?.maxChar) {
        const value = symbol.metrics[metricCharacterCount];
        const target = napiConfig.metrics.symbol.maxChar;
        if (value > target) {
          const alert: AuditAlert = {
            metric: metricCharacterCount,
            severity: getNumberSeverityLevel(value, target),
            message: {
              short: "Symbol too large",
              long: `Symbol exceeds maximum character limit (${value}/${target})`,
            },
            value: value.toString(),
            target: target.toString(),
          };
          symbolAuditManifest.alerts[metricCharacterCount] = alert;
        }
      }

      // Check #2: Symbol length (lines)
      if (napiConfig.metrics?.symbol?.maxCodeLine) {
        const value = symbol.metrics[metricCodeLineCount];
        const target = napiConfig.metrics.symbol.maxCodeLine;
        if (value > target) {
          const alert: AuditAlert = {
            metric: metricCodeLineCount,
            severity: getNumberSeverityLevel(value, target),
            message: {
              short: "Symbol too long",
              long: `Symbol exceeds maximum line count (${value}/${target})`,
            },
            value: value.toString(),
            target: target.toString(),
          };
          symbolAuditManifest.alerts[metricCodeLineCount] = alert;
        }
      }
      if (napiConfig.metrics?.symbol?.maxLine) {
        const value = symbol.metrics[metricLinesCount];
        const target = napiConfig.metrics.symbol.maxLine;
        if (value > target) {
          const alert: AuditAlert = {
            metric: metricLinesCount,
            severity: getNumberSeverityLevel(value, target),
            message: {
              short: "Symbol too long",
              long: `Symbol exceeds maximum line count (${value}/${target})`,
            },
            value: value.toString(),
            target: target.toString(),
          };
          symbolAuditManifest.alerts[metricLinesCount] = alert;
        }
      }

      // Check #3: Dependencies per Symbol
      if (napiConfig.metrics?.symbol?.maxDependency) {
        const value = symbol.metrics[metricDependencyCount];
        const target = napiConfig.metrics.symbol.maxDependency;
        if (value > target) {
          const alert: AuditAlert = {
            metric: metricDependencyCount,
            severity: getNumberSeverityLevel(value, target),
            message: {
              short: "Too many dependencies",
              long: `Symbol exceeds maximum dependency count (${value}/${target})`,
            },
            value: value.toString(),
            target: target.toString(),
          };
          symbolAuditManifest.alerts[metricDependencyCount] = alert;
        }
      }
      if (napiConfig.metrics?.symbol?.maxDependent) {
        const value = symbol.metrics[metricDependentCount];
        const target = napiConfig.metrics.symbol.maxDependent;
        if (value > target) {
          const alert: AuditAlert = {
            metric: metricDependentCount,
            severity: getNumberSeverityLevel(value, target),
            message: {
              short: "Too many dependents",
              long: `Symbol exceeds maximum dependent count (${value}/${target})`,
            },
            value: value.toString(),
            target: target.toString(),
          };
          symbolAuditManifest.alerts[metricDependentCount] = alert;
        }
      }

      // Check #4: Cyclomatic Complexity
      if (napiConfig.metrics?.symbol?.maxCyclomaticComplexity) {
        const value = symbol.metrics[metricCyclomaticComplexity];
        const target = napiConfig.metrics.symbol.maxCyclomaticComplexity;
        if (value > target) {
          const alert: AuditAlert = {
            metric: metricCyclomaticComplexity,
            severity: getNumberSeverityLevel(value, target),
            message: {
              short: "Symbol too complex",
              long: `Symbol exceeds maximum cyclomatic complexity (${value}/${target})`,
            },
            value: value.toString(),
            target: target.toString(),
          };
          symbolAuditManifest.alerts[metricCyclomaticComplexity] = alert;
        }
      }

      fileAuditManifest.symbols[symbol.id] = symbolAuditManifest;
    }

    AuditManifest[fileDependencyManifest.id] = fileAuditManifest;
  }

  return AuditManifest;
}
