import Parser from "tree-sitter";
import { csharpParser } from "../../../helpers/treeSitter/parsers.js";

/**
 * Interface for code volumes
 */
export interface CodeCounts {
  /** Number of lines of code */
  lines: number;
  /** Number of characters of code */
  characters: number;
}

/**
 * Represents complexity metrics for a C# symbol
 */
export interface CSharpComplexityMetrics {
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

// Tree-sitter query to find complexity-related nodes
const complexityQuery = new Parser.Query(
  csharpParser.getLanguage(),
  `
    (if_statement) @complexity
    (while_statement) @complexity
    (for_statement) @complexity
    (do_statement) @complexity
    (switch_section) @complexity
    (conditional_expression) @complexity
    (try_statement) @complexity
    (catch_clause) @complexity
    (finally_clause) @complexity
  `,
);

export class CSharpMetricsAnalyzer {
  /**
   * Calculates metrics for a C# symbol.
   * @param node - The AST node to analyze
   * @returns The complexity metrics for the node
   */
  public analyzeNode(node: Parser.SyntaxNode): CSharpComplexityMetrics {
    const complexityCount = this.getComplexityCount(node);
    const linesCount = node.endPosition.row - node.startPosition.row + 1;
    const codeCounts = this.getCodeCounts(node);
    const codeLinesCount = codeCounts.lines;
    const characterCount = node.endIndex - node.startIndex;
    const codeCharacterCount = codeCounts.characters;

    return {
      cyclomaticComplexity: complexityCount,
      linesCount,
      codeLinesCount,
      characterCount,
      codeCharacterCount,
    };
  }

  private getComplexityCount(node: Parser.SyntaxNode): number {
    const complexityMatches = complexityQuery.captures(node);
    return complexityMatches.length;
  }

  private getCodeCounts(node: Parser.SyntaxNode): CodeCounts {
    const lines = node.text.split("\n");
    let codeLinesCount = 0;
    let codeCharacterCount = 0;
    let currentlyInComment = false;

    for (const line of lines) {
      if (line.includes("/*")) {
        currentlyInComment = true;
      }
      if (line.includes("*/")) {
        currentlyInComment = false;
      }
      if (
        !currentlyInComment &&
        line.trim() !== "" &&
        !line.trim().startsWith("//")
      ) {
        codeLinesCount++;
        codeCharacterCount += line.split("//")[0].trim().length;
      }
    }

    return {
      lines: codeLinesCount,
      characters: codeCharacterCount,
    };
  }
}
