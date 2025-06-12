/**
 * Interface for code volumes
 */
export interface CodeCounts {
  /** Number of lines of code */
  lines: number;
  /** Number of characters of code */
  characters: number;
}

export interface CommentSpan {
  start: { row: number; column: number };
  end: { row: number; column: number };
}

/**
 * Represents complexity metrics for a C symbol
 */
export interface CComplexityMetrics {
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
