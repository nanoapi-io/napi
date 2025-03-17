import Parser from "tree-sitter";
import { ExportedSymbol, PythonExportResolver } from "../exportResolver";
import { sep } from "path";

/**
 * Represents a module (or package) in the Python project.
 * Each node contains its name, full (dot-separated) name, the file path (if applicable),
 * the symbols exported from the module, any child modules, and a pointer to its parent.
 */
export interface ModuleNode {
  // Short name of the module (e.g., "utils")
  name: string;
  // Full module name (e.g., "project.utils")
  fullName: string;
  // File path for this module (if it represents a file or package)
  filePath?: string;
  // Exported symbols from this module (classes, functions, variables, etc.)
  symbols: ExportedSymbol[];
  // A map of child modules keyed by their short name.
  children: Map<string, ModuleNode>;
  // A pointer to the parent module node (undefined for the root)
  parent?: ModuleNode;
}

/**
 * ModuleMapper is responsible for building a hierarchical map of modules in a Python project.
 *
 * It uses:
 * - A file map containing file paths and their corresponding Tree-sitter root nodes.
 * - A PythonExportResolver to extract the exported symbols from each file.
 *
 * The resulting map is a tree of ModuleNode objects representing the project structure.
 */
export class PythonModuleMapper {
  // Map of file information: file path and its Tree-sitter root node.
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  // The export resolver used to extract exported symbols from files.
  private exportResolver: PythonExportResolver;
  public moduleMap: ModuleNode;

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
    exportResolver: PythonExportResolver,
  ) {
    this.files = files;
    this.exportResolver = exportResolver;
    this.moduleMap = this.buildModuleMap();
  }

  /**
   * Builds and returns the module map (a hierarchical tree of modules).
   *
   * For each file in the project:
   * - Splits the file path into parts based on the OS-specific separator.
   * - Adjusts the parts for __init__.py files (treating them as packages) or for regular .py modules.
   * - Inserts the module into the tree, constructing the full module name.
   * - Assigns the file path, exported symbols, and parent pointers to the corresponding module node.
   *
   * @returns The root ModuleNode containing all modules as its children.
   */
  private buildModuleMap(): ModuleNode {
    // Create the root module node (empty name/fullName) with no parent.
    const root: ModuleNode = {
      name: "",
      fullName: "",
      symbols: [],
      children: new Map(),
      parent: undefined,
    };

    // Iterate over each file in the project.
    this.files.forEach(({ path }) => {
      // Split the file path into its components (directories and file name).
      const parts = path.split(sep);

      // Check if the file is an __init__.py (indicating a package).
      if (parts[parts.length - 1] === "__init__.py") {
        // Remove the "__init__.py" segment so that the package is represented by its folder.
        parts.pop();
      } else {
        // Otherwise, remove the .py extension from the file name.
        const fileName = parts.pop();
        if (!fileName) {
          // If fileName is undefined for some reason, skip processing this file.
          return;
        }
        // Replace the file name with its name without the .py extension.
        parts.push(fileName.replace(/\.py$/, ""));
      }

      // Insert the module into the tree.
      let current: ModuleNode = root;
      // This variable accumulates the full module name as we go deeper.
      let currentFullName = "";
      for (const part of parts) {
        // Append dot if necessary, building up the full name.
        currentFullName = currentFullName ? `${currentFullName}.${part}` : part;

        // Try to get an existing child node with the current part name.
        let child = current.children.get(part);
        if (!child) {
          // If no child exists, create a new module node and set its parent pointer.
          child = {
            name: part,
            fullName: currentFullName,
            symbols: [],
            children: new Map<string, ModuleNode>(),
            parent: current,
          };
          // Add the newly created node as a child of the current node.
          current.children.set(part, child);
        }
        // Move into the child node for the next iteration.
        current = child;
      }

      // At this point, 'current' is the node corresponding to the file/module.
      // Assign the file path to this module node.
      current.filePath = path;

      // Use the export resolver to get the symbols exported from the file.
      const symbols = this.exportResolver.getSymbols(path);
      // Assign the exported symbols to the module node.
      current.symbols = symbols;
    });

    // Return the root node containing the full module map.
    return root;
  }

  public getNodeFromFile(filePath: string): ModuleNode | undefined {
    // If the file path ends with "__init__.py", treat it as the package's directory.
    if (filePath.endsWith(`${sep}__init__.py`)) {
      filePath = filePath.slice(0, -"__init__.py".length);
      // Remove trailing separator if present.
      if (filePath.endsWith(sep)) {
        filePath = filePath.slice(0, -sep.length);
      }
    } else if (filePath.endsWith(".py")) {
      filePath = filePath.slice(0, -3);
    }
    let currentNode = this.moduleMap;
    for (const part of filePath.split(sep)) {
      if (part === "") continue; // skip empty parts
      const candidateNode = currentNode.children.get(part);
      if (!candidateNode) {
        return undefined;
      }
      currentNode = candidateNode;
    }
    return currentNode;
  }

  public resolveImport(
    currentFile: string,
    source: string,
  ): ModuleNode | undefined {
    if (!source) return undefined;
    // Dispatch based on whether the source is relative (starts with ".") or absolute.
    return source.startsWith(".")
      ? this.resolveRelativeImport(currentFile, source)
      : this.resolveAbsoluteImport(currentFile, source);
  }

  /**
   * Handles relative imports.
   * For example:
   *   - ".helper" means "import helper from the current package"
   *   - "..module" means "go up one package, then import module"
   *
   * @param currentFile - The file path of the current module.
   * @param source - The relative import string (e.g. ".helper" or "..module.sub").
   * @returns The resolved ModuleNode or undefined if not found.
   */
  private resolveRelativeImport(
    currentFile: string,
    source: string,
  ): ModuleNode | undefined {
    // Count the number of leading dots to determine how many levels to go up.
    let level = 0;
    while (source[level] === ".") {
      level++;
    }
    const remainder = source.slice(level);

    // Get the ModuleNode for the current file.
    const currentModule = this.getNodeFromFile(currentFile);
    if (!currentModule) return undefined;

    // If the current module is a file module (not a package), use its parent as the starting package.
    let baseModule = currentModule;
    if (
      currentModule.filePath &&
      !currentModule.filePath.endsWith("__init__.py")
    ) {
      if (currentModule.parent) {
        baseModule = currentModule.parent;
      }
    }

    // For a relative import, a single dot means current package,
    // two dots means one level up, and so on.
    for (let i = 1; i < level; i++) {
      if (!baseModule.parent) return undefined;
      baseModule = baseModule.parent;
    }

    // If there is no remainder, the import resolves to the base package.
    if (!remainder) return baseModule;

    // Otherwise, traverse down the remaining dotted path.
    const parts = remainder.split(".");
    let resolved: ModuleNode | undefined = baseModule;
    for (const part of parts) {
      resolved = resolved?.children.get(part);
      if (!resolved) return undefined;
    }
    return resolved;
  }

  /**
   * Handles absolute imports.
   * In this approach, we always start with the current file’s package context (or its parent if the current file is not a package)
   * and then iterate upward through ancestors until we find a candidate that resolves the absolute import.
   *
   * For example:
   *   - "module.sub" could be resolved relative to the current package or one of its ancestors.
   *
   * @param currentFile - The file path of the current module.
   * @param source - The absolute import string (e.g. "module.sub" or "project.utils.helper").
   * @returns The resolved ModuleNode or undefined if not found.
   */
  private resolveAbsoluteImport(
    currentFile: string,
    source: string,
  ): ModuleNode | undefined {
    const parts = source.split(".");

    // Start from the current module's package context.
    let currentModule = this.getNodeFromFile(currentFile);
    if (!currentModule) return undefined;
    if (
      currentModule.filePath &&
      !currentModule.filePath.endsWith("__init__.py")
    ) {
      if (currentModule.parent) {
        currentModule = currentModule.parent;
      }
    }

    // Walk upward from the current module, attempting to resolve the import relative to each ancestor.
    let ancestor: ModuleNode | undefined = currentModule;
    while (ancestor) {
      let candidate: ModuleNode | undefined = ancestor;
      for (const part of parts) {
        candidate = candidate.children.get(part);
        if (!candidate) break;
      }
      if (candidate) {
        return candidate;
      }
      ancestor = ancestor.parent;
    }
    return undefined;
  }
}
