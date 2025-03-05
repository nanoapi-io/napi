import Parser from "tree-sitter";
import { ExportExtractor, ExportMember, ExportStatement } from "./types";

/**
 * Python-specific implementation of ExportExtractor.
 */
class PythonExportExtractor extends ExportExtractor {
  run(_filePath: string, rootNode: Parser.SyntaxNode): ExportStatement[] {
    const exports: ExportStatement[] = [];

    exports.push(...this.extractFunctions(rootNode));
    exports.push(...this.extractClasses(rootNode));
    exports.push(...this.extractTopLevelAssignments(rootNode));

    return exports;
  }

  /**
   * Extracts function definitions as exported members.
   * @param node - Root syntax node.
   * @returns A list of function export statements.
   */
  private extractFunctions(node: Parser.SyntaxNode): ExportStatement[] {
    const exports: ExportStatement[] = [];

    const functionQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (function_definition
          name: (identifier)
        ) @node
      )
      `,
    );

    const functionCaptures = functionQuery.captures(node);
    functionCaptures.forEach(({ node }) => {
      const identifierNode = node.childForFieldName("name");
      if (!identifierNode) {
        console.error("No identifier node found for function definition");
        return;
      }
      exports.push({
        type: "named",
        node,
        members: [
          {
            type: "function",
            node,
            identifierNode,
          },
        ],
      });
    });

    const decoratedFunctionQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
      (module
        (decorated_definition
          definition: (function_definition
            name: (identifier)
          )
        ) @node
      )
      `,
    );

    const decoratedFunctionCaptures = decoratedFunctionQuery.captures(node);
    decoratedFunctionCaptures.forEach(({ node }) => {
      const functionNode = node.childForFieldName("definition");
      const identifierNode = functionNode?.childForFieldName("name");
      if (!identifierNode) {
        console.error(
          "No identifier node found for decorated function definition",
        );
        return;
      }
      exports.push({
        type: "named",
        node,
        members: [
          {
            type: "function",
            node,
            identifierNode,
          },
        ],
      });
    });

    return exports;
  }

  /**
   * Extracts class definitions as exported members.
   * @param node - Root syntax node.
   * @returns A list of class export statements.
   */
  private extractClasses(node: Parser.SyntaxNode): ExportStatement[] {
    const exports: ExportStatement[] = [];

    // Query for regular class definitions
    const classQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
    (module
      (class_definition
        name: (identifier)
      ) @node
    )
    `,
    );

    const classCaptures = classQuery.captures(node);
    classCaptures.forEach(({ node }) => {
      const identifierNode = node.childForFieldName("name");
      if (!identifierNode) {
        console.error("No identifier node found for class definition");
        return;
      }
      exports.push({
        type: "named",
        node,
        members: [
          {
            type: "class",
            node,
            identifierNode,
          },
        ],
      });
    });

    // Query for decorated class definitions
    const decoratedClassQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
    (module
      (decorated_definition
        definition: (class_definition
          name: (identifier)
        )
      ) @node
    )
    `,
    );

    const decoratedClassCaptures = decoratedClassQuery.captures(node);
    decoratedClassCaptures.forEach(({ node }) => {
      const classNode = node.childForFieldName("definition");
      const identifierNode = classNode?.childForFieldName("name");
      if (!identifierNode) {
        console.error(
          "No identifier node found for decorated class definition",
        );
        return;
      }
      exports.push({
        type: "named",
        node,
        members: [
          {
            type: "class",
            node,
            identifierNode,
          },
        ],
      });
    });

    return exports;
  }

  /**
   * Extracts top-level variable assignments as exported members.
   * @param node - Root syntax node.
   * @returns A list of assignment export statements.
   */
  private extractTopLevelAssignments(
    node: Parser.SyntaxNode,
  ): ExportStatement[] {
    const exports: ExportStatement[] = [];

    // Query to find top-level variable assignments
    const assignmentQuery = new Parser.Query(
      this.parser.getLanguage(),
      `
    (module
      (expression_statement
        (assignment
          left: (_)
          right: (_)?
        )
      ) @node
    )
    `,
    );

    const assignmentCaptures = assignmentQuery.captures(node);
    assignmentCaptures.forEach(({ node }) => {
      const assignmentNode = node.children.find(
        (child) => child.type === "assignment",
      );
      const identifierNode = assignmentNode?.childForFieldName("left");
      if (!identifierNode) {
        console.error("No identifier node found for assignment");
        return;
      }

      const members: ExportMember[] = [];

      if (identifierNode.type === "pattern_list") {
        identifierNode.children.forEach((child) => {
          if (child.type === "identifier") {
            members.push({
              type: "variable",
              node,
              identifierNode: child,
            });
          }
        });
      } else {
        members.push({
          type: "variable",
          node,
          identifierNode,
        });
      }

      exports.push({
        type: "named",
        node,
        members,
      });
    });

    return exports;
  }
}

export default PythonExportExtractor;
