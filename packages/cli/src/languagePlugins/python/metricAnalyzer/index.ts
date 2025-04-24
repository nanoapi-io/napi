import Parser from "tree-sitter";
import { PythonComplexityMetrics } from "./types.js";

/**
 * Interface for representing comment spans in the code
 */
interface CommentSpan {
  start: { row: number; column: number };
  end: { row: number; column: number };
}

/**
 * PythonMetricsAnalyzer calculates complexity metrics for Python symbols.
 *
 * This class performs the following:
 * - Calculates cyclomatic complexity for Python symbols using Tree-sitter
 * - Analyzes code structure to count decision points (if, elif, while, for, and, or, etc.)
 * - Provides detailed metrics for each symbol including line counts and character counts
 *
 * Note: This implementation uses a simplified approach to calculating cyclomatic complexity
 * by counting basic control flow structures and boolean operators.
 */
export class PythonMetricsAnalyzer {
  private parser: Parser;
  private complexityQuery: Parser.Query;
  private commentQuery: Parser.Query;

  constructor(parser: Parser) {
    this.parser = parser;

    // This query captures all nodes that contribute to cyclomatic complexity
    // Each capture increases the complexity by 1
    this.complexityQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        ; Basic control flow structures
        (if_statement) @dec
        (elif_clause) @dec
        (while_statement) @dec
        (for_statement) @dec
        (with_statement) @dec
        (try_statement) @dec
        (except_clause) @dec
        (conditional_expression) @dec
        (boolean_operator) @dec
        (if_clause) @dec
      `,
    );

    // Query to find comments
    this.commentQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
        (comment) @comment
      `,
    );
  }

  /**
   * Analyzes a list of AST nodes and calculates its complexity metrics
   *
   * @param nodes The AST nodes to analyze
   * @returns Complexity metrics for the nodes
   */
  public analyzeNodes(nodes: Parser.SyntaxNode[]) {
    // Base complexity starts at 1
    let cyclomaticComplexity = 1;
    let codeLinesCount = 0;
    let linesCount = 0;
    let characterCount = 0;
    let codeCharacterCount = 0;

    // Process each node of the symbol to count metrics
    for (const node of nodes) {
      const nodeMetrics = this.analyzeNode(node);

      // Accumulate metrics from this node
      linesCount += nodeMetrics.linesCount;
      codeLinesCount += nodeMetrics.codeLinesCount;
      characterCount += nodeMetrics.characterCount;
      codeCharacterCount += nodeMetrics.codeCharacterCount;
      cyclomaticComplexity += nodeMetrics.complexityCount;
    }

    const metrics: PythonComplexityMetrics = {
      cyclomaticComplexity,
      codeLinesCount,
      linesCount,
      codeCharacterCount,
      characterCount,
    };

    return metrics;
  }

  /**
   * Analyzes a single syntax node and calculates its metrics
   *
   * @param node The syntax node to analyze
   * @returns Metrics for the node
   */
  private analyzeNode(node: Parser.SyntaxNode) {
    // Count total lines and characters
    const linesCount = node.endPosition.row - node.startPosition.row + 1;
    const characterCount = node.text.length;

    // Split the node text into lines for processing
    const lines = node.text.split("\n");

    // Find comments and their spans
    const { pureCommentLines, commentSpans } = this.findComments(node, lines);

    // Find empty lines
    const emptyLines = this.findEmptyLines(node, lines);

    // Calculate code lines
    const nonCodeLines = new Set([...pureCommentLines, ...emptyLines]);
    const codeLinesCount = linesCount - nonCodeLines.size;

    // Calculate code characters
    const codeCharacterCount = this.calculateCodeCharacters(
      node,
      lines,
      pureCommentLines,
      emptyLines,
      commentSpans,
    );

    // Calculate cyclomatic complexity
    const complexityCount = this.calculateComplexity(node);

    return {
      linesCount,
      codeLinesCount,
      characterCount,
      codeCharacterCount,
      complexityCount,
    };
  }

  /**
   * Finds all comments in a node and categorizes them
   *
   * @param node The syntax node to analyze
   * @param lines The lines of text in the node
   * @returns Object containing pure comment lines and comment spans
   */
  private findComments(
    node: Parser.SyntaxNode,
    lines: string[],
  ): {
    pureCommentLines: Set<number>;
    commentSpans: CommentSpan[];
  } {
    const pureCommentLines = new Set<number>();
    const commentSpans: CommentSpan[] = [];

    const commentCaptures = this.commentQuery.captures(node);

    for (const capture of commentCaptures) {
      const commentNode = capture.node;

      // Record the comment span for character counting
      commentSpans.push({
        start: {
          row: commentNode.startPosition.row,
          column: commentNode.startPosition.column,
        },
        end: {
          row: commentNode.endPosition.row,
          column: commentNode.endPosition.column,
        },
      });

      // Check if the comment starts at the beginning of the line (ignoring whitespace)
      const lineIdx = commentNode.startPosition.row - node.startPosition.row;
      if (lineIdx >= 0 && lineIdx < lines.length) {
        const lineText = lines[lineIdx];
        const textBeforeComment = lineText.substring(
          0,
          commentNode.startPosition.column,
        );

        // If there's only whitespace before the comment, it's a pure comment line
        if (textBeforeComment.trim().length === 0) {
          for (
            let line = commentNode.startPosition.row;
            line <= commentNode.endPosition.row;
            line++
          ) {
            pureCommentLines.add(line);
          }
        }
      }
    }

    return { pureCommentLines, commentSpans };
  }

  /**
   * Finds all empty lines in a node
   *
   * @param node The syntax node to analyze
   * @param lines The lines of text in the node
   * @returns Set of line numbers that are empty
   */
  private findEmptyLines(
    node: Parser.SyntaxNode,
    lines: string[],
  ): Set<number> {
    const emptyLines = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      const lineIndex = node.startPosition.row + i;
      if (lines[i].trim().length === 0) {
        emptyLines.add(lineIndex);
      }
    }

    return emptyLines;
  }

  /**
   * Calculates the number of characters that are actual code
   *
   * @param node The syntax node to analyze
   * @param lines The lines of text in the node
   * @param pureCommentLines Set of line numbers that are pure comments
   * @param emptyLines Set of line numbers that are empty
   * @param commentSpans Array of comment spans to exclude
   * @returns Number of code characters
   */
  private calculateCodeCharacters(
    node: Parser.SyntaxNode,
    lines: string[],
    pureCommentLines: Set<number>,
    emptyLines: Set<number>,
    commentSpans: CommentSpan[],
  ): number {
    let codeCharCount = 0;

    // Process each line individually
    for (let i = 0; i < lines.length; i++) {
      const lineIndex = node.startPosition.row + i;
      const line = lines[i];

      // Skip empty lines and pure comment lines
      if (emptyLines.has(lineIndex) || pureCommentLines.has(lineIndex)) {
        continue;
      }

      // Process line for code characters
      let lineText = line;

      // Remove comment content from the line if present
      for (const span of commentSpans) {
        if (span.start.row === lineIndex) {
          // Comment starts on this line
          lineText = lineText.substring(0, span.start.column);
        }
      }

      // Count normalized code characters (trim excessive whitespace)
      const normalizedText = lineText.trim().replace(/\s+/g, " ");
      codeCharCount += normalizedText.length;
    }

    return codeCharCount;
  }

  /**
   * Calculates the cyclomatic complexity of a node
   *
   * @param node The syntax node to analyze
   * @returns Number of decision points that contribute to complexity
   */
  private calculateComplexity(node: Parser.SyntaxNode): number {
    const captures = this.complexityQuery.captures(node);
    return captures.length;
  }
}
