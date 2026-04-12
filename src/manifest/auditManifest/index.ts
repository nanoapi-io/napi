import type { DependencyManifest } from "../dependencyManifest/types.ts";
import {
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "../dependencyManifest/types.ts";
import type {
  AuditConfig,
  AuditManifest,
  FileAuditManifest,
  SymbolAuditManifest,
} from "./types.ts";

function getSeverityLevel(
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
  config: AuditConfig,
): AuditManifest {
  const auditManifest: AuditManifest = {};

  for (const fileDependencyManifest of Object.values(dependencyManifest)) {
    const fileAudit: FileAuditManifest = {
      id: fileDependencyManifest.id,
      alerts: {},
      symbols: {},
    };

    const fm = fileDependencyManifest.metrics;

    if (fm.codeCharacterCount > config.file.maxCodeChar) {
      fileAudit.alerts[metricCodeCharacterCount] = {
        metric: metricCodeCharacterCount,
        severity: getSeverityLevel(
          fm.codeCharacterCount,
          config.file.maxCodeChar,
        ),
        message: {
          short: "File too large",
          long:
            `File exceeds maximum character limit (${fm.codeCharacterCount}/${config.file.maxCodeChar})`,
        },
      };
    }

    if (fm.characterCount > config.file.maxChar) {
      fileAudit.alerts[metricCharacterCount] = {
        metric: metricCharacterCount,
        severity: getSeverityLevel(fm.characterCount, config.file.maxChar),
        message: {
          short: "File too large",
          long:
            `File exceeds maximum character limit (${fm.characterCount}/${config.file.maxChar})`,
        },
      };
    }

    if (fm.codeLineCount > config.file.maxCodeLine) {
      fileAudit.alerts[metricCodeLineCount] = {
        metric: metricCodeLineCount,
        severity: getSeverityLevel(fm.codeLineCount, config.file.maxCodeLine),
        message: {
          short: "Too many lines",
          long:
            `File exceeds maximum line count (${fm.codeLineCount}/${config.file.maxCodeLine})`,
        },
      };
    }

    if (fm.linesCount > config.file.maxLine) {
      fileAudit.alerts[metricLinesCount] = {
        metric: metricLinesCount,
        severity: getSeverityLevel(fm.linesCount, config.file.maxLine),
        message: {
          short: "Too many lines",
          long:
            `File exceeds maximum line count (${fm.linesCount}/${config.file.maxLine})`,
        },
      };
    }

    if (fm.dependencyCount > config.file.maxDependency) {
      fileAudit.alerts[metricDependencyCount] = {
        metric: metricDependencyCount,
        severity: getSeverityLevel(
          fm.dependencyCount,
          config.file.maxDependency,
        ),
        message: {
          short: "Too many dependencies",
          long:
            `File exceeds maximum dependency count (${fm.dependencyCount}/${config.file.maxDependency})`,
        },
      };
    }

    if (fm.dependentCount > config.file.maxDependent) {
      fileAudit.alerts[metricDependentCount] = {
        metric: metricDependentCount,
        severity: getSeverityLevel(fm.dependentCount, config.file.maxDependent),
        message: {
          short: "Too many dependents",
          long:
            `File exceeds maximum dependent count (${fm.dependentCount}/${config.file.maxDependent})`,
        },
      };
    }

    if (fm.cyclomaticComplexity > config.file.maxCyclomaticComplexity) {
      fileAudit.alerts[metricCyclomaticComplexity] = {
        metric: metricCyclomaticComplexity,
        severity: getSeverityLevel(
          fm.cyclomaticComplexity,
          config.file.maxCyclomaticComplexity,
        ),
        message: {
          short: "Too complex",
          long:
            `File exceeds maximum cyclomatic complexity (${fm.cyclomaticComplexity}/${config.file.maxCyclomaticComplexity})`,
        },
      };
    }

    for (const symbol of Object.values(fileDependencyManifest.symbols)) {
      const symbolAudit: SymbolAuditManifest = {
        id: symbol.id,
        alerts: {},
      };

      const sm = symbol.metrics;

      if (sm.codeCharacterCount > config.symbol.maxCodeChar) {
        symbolAudit.alerts[metricCodeCharacterCount] = {
          metric: metricCodeCharacterCount,
          severity: getSeverityLevel(
            sm.codeCharacterCount,
            config.symbol.maxCodeChar,
          ),
          message: {
            short: "Symbol too large",
            long:
              `Symbol exceeds maximum character limit (${sm.codeCharacterCount}/${config.symbol.maxCodeChar})`,
          },
        };
      }

      if (sm.characterCount > config.symbol.maxChar) {
        symbolAudit.alerts[metricCharacterCount] = {
          metric: metricCharacterCount,
          severity: getSeverityLevel(sm.characterCount, config.symbol.maxChar),
          message: {
            short: "Symbol too large",
            long:
              `Symbol exceeds maximum character limit (${sm.characterCount}/${config.symbol.maxChar})`,
          },
        };
      }

      if (sm.codeLineCount > config.symbol.maxCodeLine) {
        symbolAudit.alerts[metricCodeLineCount] = {
          metric: metricCodeLineCount,
          severity: getSeverityLevel(
            sm.codeLineCount,
            config.symbol.maxCodeLine,
          ),
          message: {
            short: "Symbol too long",
            long:
              `Symbol exceeds maximum line count (${sm.codeLineCount}/${config.symbol.maxCodeLine})`,
          },
        };
      }

      if (sm.linesCount > config.symbol.maxLine) {
        symbolAudit.alerts[metricLinesCount] = {
          metric: metricLinesCount,
          severity: getSeverityLevel(sm.linesCount, config.symbol.maxLine),
          message: {
            short: "Symbol too long",
            long:
              `Symbol exceeds maximum line count (${sm.linesCount}/${config.symbol.maxLine})`,
          },
        };
      }

      if (sm.dependencyCount > config.symbol.maxDependency) {
        symbolAudit.alerts[metricDependencyCount] = {
          metric: metricDependencyCount,
          severity: getSeverityLevel(
            sm.dependencyCount,
            config.symbol.maxDependency,
          ),
          message: {
            short: "Too many dependencies",
            long:
              `Symbol exceeds maximum dependency count (${sm.dependencyCount}/${config.symbol.maxDependency})`,
          },
        };
      }

      if (sm.dependentCount > config.symbol.maxDependent) {
        symbolAudit.alerts[metricDependentCount] = {
          metric: metricDependentCount,
          severity: getSeverityLevel(
            sm.dependentCount,
            config.symbol.maxDependent,
          ),
          message: {
            short: "Too many dependents",
            long:
              `Symbol exceeds maximum dependent count (${sm.dependentCount}/${config.symbol.maxDependent})`,
          },
        };
      }

      if (sm.cyclomaticComplexity > config.symbol.maxCyclomaticComplexity) {
        symbolAudit.alerts[metricCyclomaticComplexity] = {
          metric: metricCyclomaticComplexity,
          severity: getSeverityLevel(
            sm.cyclomaticComplexity,
            config.symbol.maxCyclomaticComplexity,
          ),
          message: {
            short: "Symbol too complex",
            long:
              `Symbol exceeds maximum cyclomatic complexity (${sm.cyclomaticComplexity}/${config.symbol.maxCyclomaticComplexity})`,
          },
        };
      }

      fileAudit.symbols[symbol.id] = symbolAudit;
    }

    auditManifest[fileDependencyManifest.id] = fileAudit;
  }

  return auditManifest;
}
