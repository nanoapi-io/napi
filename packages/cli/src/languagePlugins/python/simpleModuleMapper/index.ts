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
 * Represents a Python module in the project.
 *
 * A module has a name, a fullName (typically the dotted module path), a file path,
 * a type (module, package, or namespace), a mapping of its child modules,
 * and an optional parent module.
 */
export interface PythonSimpleModule {
  name: string;
  fullName: string;
  path: string;
  type: PythonModuleType;
  children: Map<string, PythonSimpleModule>;
  parent?: PythonSimpleModule;
}

/**
 * PythonModuleMapper is responsible for building a hierarchical module tree
 * from a set of files. It maps internal modules (files provided in the map) and
 * handles packages (i.e. __init__.py) and namespace modules.
 *
 * It also provides methods to resolve internal imports (both relative and absolute)
 * within the project. External modules (e.g. standard libraries or third-party packages)
 * are ignored.
 */
export class PythonSimpleModuleMapper {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  public moduleMap: PythonSimpleModule;

  /**
   * Creates an instance of PythonModuleMapper.
   *
   * @param files - A Map where each key/value pair represents a file in the project,
   *                with its filePath and parsed syntax tree (rootNode).
   */
  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.files = files;
    this.moduleMap = this.buildModuleMap();
  }

  /**
   * Builds the module tree for the project.
   *
   * Iterates through each file in the files map and creates a hierarchical module
   * structure based on the file paths. __init__.py files are treated as packages,
   * .py files as modules, and directories as namespace modules.
   *
   * @returns The root PythonSimpleModule representing the project.
   */
  private buildModuleMap(): PythonSimpleModule {
    const root: PythonSimpleModule = {
      name: "",
      fullName: "",
      path: "",
      type: PYTHON_NAMESPACE_MODULE_TYPE,
      children: new Map(),
      parent: undefined,
    };

    this.files.forEach((file) => {
      // Split the file path into its components (directories and file name).
      const parts = file.path.split(sep);

      let endModuleType: PythonModuleType = PYTHON_MODULE_TYPE;

      if (parts[parts.length - 1] === "__init__.py") {
        endModuleType = PYTHON_PACKAGE_MODULE_TYPE;
        // Remove the "__init__.py" segment so that the package is represented by its folder.
        parts.pop();
      } else {
        // remove the .py extension from the file name.
        parts[parts.length - 1] = parts[parts.length - 1].slice(0, -3);
      }

      let currentFullName = "";
      let currentPath = "";

      let currentModule = root;
      parts.forEach((part) => {
        currentFullName = currentFullName ? `${currentFullName}.${part}` : part;
        currentPath = currentPath ? `${currentPath}${sep}${part}` : part;

        const existingModule = currentModule.children.get(part);
        if (existingModule) {
          currentModule = existingModule;
        } else {
          const newModule: PythonSimpleModule = {
            name: part,
            fullName: currentFullName,
            path: currentPath,
            type: PYTHON_NAMESPACE_MODULE_TYPE,
            children: new Map(),
            parent: currentModule,
          };
          currentModule.children.set(part, newModule);
          currentModule = newModule;
        }
      });

      currentModule.type = endModuleType;
      currentModule.path = file.path;
    });

    return root;
  }

  /**
   * Retrieves the PythonSimpleModule corresponding to a given file path from the module map.
   *
   * For __init__.py files, it returns the package directory (removing the __init__.py suffix).
   * For other .py files, it returns the module without the .py extension.
   *
   * @param filePath - The file path to look up.
   * @returns The corresponding PythonSimpleModule, or undefined if not found.
   */
  private getNodeFromFile(filePath: string): PythonSimpleModule | undefined {
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

  /**
   * Resolves an import statement from a given module.
   *
   * Depending on whether the source string is relative (starts with ".") or absolute,
   * this method dispatches to the appropriate resolver.
   *
   * @param currentFile - The file path of the current module.
   * @param source - The import source string (e.g. ".helper" or "django").
   * @returns The resolved PythonSimpleModule, or undefined if not found.
   */
  public resolveImport(
    currentFile: string,
    source: string,
  ): PythonSimpleModule | undefined {
    if (!source) return undefined;
    return source.startsWith(".")
      ? this.resolveRelativeImport(currentFile, source)
      : this.resolveAbsoluteImport(currentFile, source);
  }

  /**
   * Resolves a relative import.
   *
   * For example:
   *  - ".helper" imports the "helper" module from the current package.
   *  - "..module" goes up one package and imports "module".
   *
   * @param currentFile - The file path of the current module.
   * @param source - The relative import string (e.g. ".helper" or "..module.sub").
   * @returns The resolved PythonSimpleModule, or undefined if not found.
   */
  private resolveRelativeImport(
    currentFile: string,
    source: string,
  ): PythonSimpleModule | undefined {
    // Count the number of leading dots.
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
    if (currentModule.path && !currentModule.path.endsWith("__init__.py")) {
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
    let resolved: PythonSimpleModule | undefined = baseModule;
    for (const part of parts) {
      resolved = resolved?.children.get(part);
      if (!resolved) return undefined;
    }
    return resolved;
  }

  /**
   * Resolves an absolute import.
   *
   * In this approach, we start from the current module's package context (or its parent if needed)
   * and walk upward through ancestors until a candidate module matching the import string is found.
   *
   * For example, "module.sub" is resolved relative to the current package or one of its ancestors.
   *
   * @param currentFile - The file path of the current module.
   * @param source - The absolute import string (e.g. "module.sub" or "project.utils.helper").
   * @returns The resolved PythonSimpleModule, or undefined if not found.
   */
  private resolveAbsoluteImport(
    currentFile: string,
    source: string,
  ): PythonSimpleModule | undefined {
    const parts = source.split(".");

    // Start from the current module's package context.
    let currentModule = this.getNodeFromFile(currentFile);
    if (!currentModule) return undefined;
    if (currentModule.path && !currentModule.path.endsWith("__init__.py")) {
      if (currentModule.parent) {
        currentModule = currentModule.parent;
      }
    }

    // Walk upward from the current module, attempting to resolve the import relative to each ancestor.
    let ancestor: PythonSimpleModule | undefined = currentModule;
    while (ancestor) {
      let candidate: PythonSimpleModule | undefined = ancestor;
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
