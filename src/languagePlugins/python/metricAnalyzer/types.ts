/**
 * Represents complexity metrics for a Python symbol
 */
export interface PythonComplexityMetrics {
  /** Cyclomatic complexity (McCabe complexity) */
  cyclomaticComplexity: number;
  /** Code lines (not including whitespace or comments) */
  codeLinesCount: number;
  /** Total lines (including whitespace and comments) */
  linesCount: number;
  /** Characters of actual code (excluding comments and excessive whitespace) */
  codeCharacterCount: number;
  /** Total characters in the entire symbol */
  characterCount: number;
}
