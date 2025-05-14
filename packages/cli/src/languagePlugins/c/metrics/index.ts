import { C_COMPLEXITY_QUERY, C_COMMENT_QUERY } from "./queries.js";
import { CComplexityMetrics, CommentSpan, CodeCounts } from "./types.js";
import Parser from "tree-sitter";

export class CMetricsAnalyzer {
  /**
   * Calculates metrics for a C symbol.
   * @param node - The syntax node to analyze.
   * @returns An object containing the complexity metrics.
   */
  public analyzeNode(node: Parser.SyntaxNode): CComplexityMetrics {
    if (node.type === "preproc_function_def") {
      node = node.childForFieldName("value");
    }
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
    const complexityMatches = C_COMPLEXITY_QUERY.captures(node);
    return complexityMatches.length;
  }

  /**
   * Finds comments in the given node and returns their spans.
   * @param node - The AST node to analyze
   * @returns An object containing pure comment lines and comment spans
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

    const commentCaptures = C_COMMENT_QUERY.captures(node);

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

  private getCodeCounts(node: Parser.SyntaxNode): CodeCounts {
    const lines = node.text.split(/\r?\n/);
    const linesCount = lines.length;
    // Find comments and their spans
    const { pureCommentLines, commentSpans } = this.findComments(node, lines);

    // Find empty lines
    const emptyLines = this.findEmptyLines(node, lines);

    // Calculate code lines
    const nonCodeLines = new Set([...pureCommentLines, ...emptyLines]);
    const codeLinesCount = linesCount - nonCodeLines.size;

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

    return {
      lines: codeLinesCount,
      characters: codeCharCount,
    };
  }
}
