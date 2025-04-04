import Parser from "tree-sitter";
import { sep } from "path";

export const PYTHON_MODULE_TYPE = "module";
export const PYTHON_PACKAGE_MODULE_TYPE = "package";
export const PYTHON_NAMESPACE_MODULE_TYPE = "namespace";

export type PythonModuleType =
  | typeof PYTHON_MODULE_TYPE
  | typeof PYTHON_PACKAGE_MODULE_TYPE
  | typeof PYTHON_NAMESPACE_MODULE_TYPE;

/**
 * Represents a Python module or package within a project's module tree.
 *
 * Each module has a simple name, a full dotted path name (fullName),
 * a file system path, a type (regular module, package, or namespace),
 * a collection of child modules (if any), and an optional reference to its parent module.
 */
export interface PythonModule {
  name: string;
  fullName: string;
  path: string;
  type: PythonModuleType;
  children: Map<string, PythonModule>;
  parent?: PythonModule;
}

/**
 * PythonModuleResolver builds a hierarchical tree structure representing
 * the modules of a Python project based on its file structure.
 *
 * It processes a set of files (each with a file path and a parsed syntax tree)
 * to create a tree where:
 * - Directories become namespace modules.
 * - __init__.py files are interpreted as packages (using the parent folder as the package name).
 * - Other .py files become regular modules.
 *
 * The class also provides methods to resolve internal module import statements,
 * handling both relative and absolute imports within the project.
 * (Note: Imports to external libraries are not resolved.)
 */
export class PythonModuleResolver {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  public pythonModule: PythonModule;

  /**
   * Constructs a PythonModuleResolver.
   *
   * @param files - A mapping where each entry represents a file in the project,
   *                containing its file system path and its parsed syntax tree.
   */
  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.files = files;
    this.pythonModule = this.buildModuleMap();
  }

  /**
   * Constructs the hierarchical module tree for the project.
   *
   * The method iterates over each file provided and:
   * - Splits the file path into directory and file name components.
   * - Interprets __init__.py files as package indicators by removing the file name.
   * - Strips the .py extension from regular module files.
   * - Builds or reuses intermediate namespace modules corresponding to directories.
   * - Sets the final module's type and full file path.
   *
   * @returns The root PythonModule representing the project’s top-level namespace.
   */
  private buildModuleMap(): PythonModule {
    const root: PythonModule = {
      name: "",
      fullName: "",
      path: "",
      type: PYTHON_NAMESPACE_MODULE_TYPE,
      children: new Map(),
      parent: undefined,
    };

    this.files.forEach((file) => {
      // Split the file path into directories and file name.
      const parts = file.path.split(sep);

      // Default to a normal module unless it is an __init__.py file.
      let endModuleType: PythonModuleType = PYTHON_MODULE_TYPE;

      if (parts[parts.length - 1] === "__init__.py") {
        endModuleType = PYTHON_PACKAGE_MODULE_TYPE;
        // Remove the "__init__.py" segment to represent the package as its directory.
        parts.pop();
      } else {
        // Remove the .py extension from the module name.
        parts[parts.length - 1] = parts[parts.length - 1].slice(0, -3);
      }

      let currentFullName = "";
      let currentPath = "";
      let currentModule = root;

      // Traverse or create the module tree based on each part of the path.
      parts.forEach((part) => {
        currentFullName = currentFullName ? `${currentFullName}.${part}` : part;
        currentPath = currentPath ? `${currentPath}${sep}${part}` : part;

        const existingModule = currentModule.children.get(part);
        if (existingModule) {
          currentModule = existingModule;
        } else {
          const newModule: PythonModule = {
            name: part,
            fullName: currentFullName,
            path: currentPath,
            // Initially mark as a namespace until further refined.
            type: PYTHON_NAMESPACE_MODULE_TYPE,
            children: new Map(),
            parent: currentModule,
          };
          currentModule.children.set(part, newModule);
          currentModule = newModule;
        }
      });

      // Update the final module with the correct type and its original file path.
      currentModule.type = endModuleType;
      currentModule.path = file.path;
    });

    return root;
  }

  /**
   * Retrieves the PythonModule associated with a given file path.
   *
   * For file paths ending in __init__.py, the package directory is returned
   * (by stripping off the __init__.py segment). For other .py files,
   * the .py extension is removed before traversal.
   *
   * @param filePath - The file system path to resolve.
   * @returns The matching PythonModule if found, or undefined otherwise.
   */
  public getModuleFromFilePath(filePath: string): PythonModule | undefined {
    // Treat __init__.py as indicating the package's directory.
    if (filePath.endsWith(`${sep}__init__.py`)) {
      filePath = filePath.slice(0, -"__init__.py".length);
      // Remove trailing separator if it exists.
      if (filePath.endsWith(sep)) {
        filePath = filePath.slice(0, -sep.length);
      }
    } else if (filePath.endsWith(".py")) {
      // Remove the .py extension from module files.
      filePath = filePath.slice(0, -3);
    }
    let currentNode = this.pythonModule;
    for (const part of filePath.split(sep)) {
      if (part === "") continue; // Skip empty segments.
      const candidateNode = currentNode.children.get(part);
      if (!candidateNode) {
        return undefined;
      }
      currentNode = candidateNode;
    }
    return currentNode;
  }

  /**
   * Resolves an internal module import from a module file.
   *
   * This method determines whether the provided import string is relative
   * (i.e. starts with ".") or absolute, and then delegates the resolution
   * to the corresponding helper method. This function exclusively handles
   * imports internal to the project; external libraries are not processed.
   *
   * @param currentFile - The file path of the module where the import occurs.
   * @param moduleName - The import string (e.g. ".helper" or "project.module").
   * @returns The resolved PythonModule if found, or undefined otherwise.
   */
  public resolveModule(
    currentFile: string,
    moduleName: string,
  ): PythonModule | undefined {
    if (!moduleName) return undefined;
    return moduleName.startsWith(".")
      ? this.resolveRelativeModule(currentFile, moduleName)
      : this.resolveAbsoluteImport(currentFile, moduleName);
  }

  /**
   * Resolves a relative import for a given module file.
   *
   * Relative import strings use leading dots to indicate how many levels up
   * in the package hierarchy to traverse before locating the target module.
   * The remaining dotted path is then followed from the base package.
   *
   * Examples:
   *  - ".helper" resolves to a sibling module named "helper".
   *  - "..module" moves up one level and resolves to a module named "module".
   *
   * @param currentFile - The file path of the module performing the import.
   * @param moduleName - The relative import string (e.g. ".helper" or "..module.sub").
   * @returns The corresponding PythonModule if found, or undefined otherwise.
   */
  private resolveRelativeModule(
    currentFile: string,
    moduleName: string,
  ): PythonModule | undefined {
    // Count the number of leading dots to determine the package level.
    let level = 0;
    while (moduleName[level] === ".") {
      level++;
    }
    const remainder = moduleName.slice(level);

    // Find the module node corresponding to the current file.
    const currentModule = this.getModuleFromFilePath(currentFile);
    if (!currentModule) return undefined;

    // If the current module is a regular file (not a package), start from its parent.
    let baseModule = currentModule;
    if (currentModule.path && !currentModule.path.endsWith("__init__.py")) {
      if (currentModule.parent) {
        baseModule = currentModule.parent;
      }
    }

    // Traverse upward in the hierarchy based on the number of dots.
    for (let i = 1; i < level; i++) {
      if (!baseModule.parent) return undefined;
      baseModule = baseModule.parent;
    }

    // If no additional module path is provided, return the base package.
    if (!remainder) return baseModule;

    // Traverse downward using the remaining dotted path.
    const parts = remainder.split(".");
    let resolved: PythonModule | undefined = baseModule;
    for (const part of parts) {
      resolved = resolved?.children.get(part);
      if (!resolved) return undefined;
    }
    return resolved;
  }

  /**
   * Resolves an absolute import starting from the current module's package context.
   *
   * The method splits the import string into its dotted components and then
   * traverses upward from the current module’s package, checking each ancestor's
   * children for a matching module path.
   *
   * For example, an import like "module.sub" will be searched for in the current
   * package and, if not found, in higher-level packages.
   *
   * @param currentFile - The file path of the module performing the import.
   * @param moduleName - The absolute import string (e.g. "module.sub" or "project.utils.helper").
   * @returns The resolved PythonModule if it exists, or undefined otherwise.
   */
  private resolveAbsoluteImport(
    currentFile: string,
    moduleName: string,
  ): PythonModule | undefined {
    const parts = moduleName.split(".");

    // Begin from the package context of the current module.
    let currentModule = this.getModuleFromFilePath(currentFile);
    if (!currentModule) return undefined;
    if (currentModule.path && !currentModule.path.endsWith("__init__.py")) {
      if (currentModule.parent) {
        currentModule = currentModule.parent;
      }
    }

    // Walk upward in the module hierarchy to find a matching candidate.
    let ancestor: PythonModule | undefined = currentModule;
    while (ancestor) {
      let candidate: PythonModule | undefined = ancestor;
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
