import Parser from "tree-sitter";

/**
 * Represents an explicitly imported item within an import statement.
 * This item can be a class, function, module, or any valid Python identifier.
 */
export interface ImportItem {
  /** The syntax node corresponding to the entire imported item (including alias, if present). */
  node: Parser.SyntaxNode;

  /** The syntax node for the item's original identifier (e.g., "path" in "from os import path as p"). */
  identifierNode: Parser.SyntaxNode;

  /** The syntax node for the item's alias, if one is provided (e.g., "p" in "from os import path as p"). */
  aliasNode: Parser.SyntaxNode | undefined;
}

/**
 * Represents a member imported from a module. A member corresponds to either:
 * - A module imported entirely (`import module` or `import module as alias`).
 * - A module or symbol imported from another module (`from module import X` or `from module import *`).
 */
export interface ImportMember {
  /** The syntax node corresponding to the imported member (module or item). */
  node: Parser.SyntaxNode;

  /** The syntax node corresponding to the member's identifier. */
  identifierNode: Parser.SyntaxNode;

  /** The syntax node for the member's alias, if provided (e.g., "alias" in "import module as alias"). */
  aliasNode: Parser.SyntaxNode | undefined;

  /** Indicates if this is a wildcard import (`from module import *`). */
  isWildcardImport: boolean;

  /**
   * The list of explicitly imported items from this member.
   * - Undefined if the import is a wildcard import (`from module import *`).
   * - Undefined if the import is a standard import statement (`import module`).
   */
  items?: ImportItem[];
}

export const NORMAL_IMPORT_STATEMENT_TYPE = "normal";
export const FROM_IMPORT_STATEMENT_TYPE = "from";

export type PythonImportStatementType =
  | typeof NORMAL_IMPORT_STATEMENT_TYPE
  | typeof FROM_IMPORT_STATEMENT_TYPE;

/**
 * Represents a fully resolved import statement from a Python source file.
 * It abstracts both normal (`import module`) and from-import (`from module import X`) statements.
 */
export interface ImportStatement {
  /** The syntax node representing the entire import statement. */
  node: Parser.SyntaxNode;

  /** The type of import statement: either "normal" or "from". */
  type: PythonImportStatementType;

  /**
   * The syntax node representing the source module in a from-import statement (`from module import ...`).
   * - Undefined for standard import statements (`import module`).
   */
  sourceNode: Parser.SyntaxNode | undefined;

  /** The list of imported members or modules. */
  members: ImportMember[];
}
