import { sep } from "path";
import pythonStdLib from "../../../scripts/generate_python_stdlib_list/output.json" with { type: "json" };
import {
  PYTHON_MODULE_TYPE,
  PYTHON_NAMESPACE_MODULE_TYPE,
  PYTHON_PACKAGE_MODULE_TYPE,
  PythonModule,
  PythonModuleType,
} from "./types.js";

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
 *
 * For performance optimization, this class implements caching for module path resolution
 * to avoid redundant lookups when the same file path is repeatedly requested.
 */
export class PythonModuleResolver {
  /**
   * The root PythonModule representing the top-level namespace of the project.
   * This module serves as the entry point for traversing the module tree.
   *
   * All project modules will be children or descendants of this root module.
   */
  public pythonModule: PythonModule;

  /**
   * The version of Python being used (only major).
   */
  public pythonVersion: string;

  /**
   * Set containing standard library module names for faster lookups.
   *
   * Used to quickly identify imports from the Python standard library versus
   * project modules or third-party dependencies.
   */
  private stdModuleSet: Set<string>;

  /**
   * Cache that maps file paths to their corresponding resolved PythonModule objects.
   * This improves performance by avoiding redundant resolution for frequently accessed modules.
   *
   * Key: filesystem path of the module
   * Value: resolved PythonModule object
   */
  private modulePathCache: Map<string, PythonModule>;

  /**
   * Cache that maps import strings to their resolved module within a specific context.
   * Format: `${currentModule.fullName}:${importString}` → resolvedModule
   *
   * This caches the results of import resolution to avoid redundant lookups,
   * taking into account both the module being imported and the context from which
   * it's being imported (for handling relative imports correctly).
   */
  private importResolutionCache: Map<string, PythonModule | undefined>;

  /**
   * Constructs a PythonModuleResolver.
   *
   * @param files - A mapping where each entry represents a file in the project,
   *                containing its file system path and its parsed syntax tree.
   * @param pythonVersion - The version of Python being used (only major).
   */
  constructor(filePaths: Set<string>, pythonVersion: string) {
    this.pythonModule = this.buildModuleMap(filePaths);
    this.pythonVersion = pythonVersion;
    this.stdModuleSet = this.getPythonStdModules(pythonVersion);
    // Initialize empty caches
    this.modulePathCache = new Map();
    this.importResolutionCache = new Map();
  }

  private getPythonStdModules(version: string) {
    // Extract major.minor version
    const versionMatch = version.match(/^(\d+)(?:\.(\d+))?/);
    if (!versionMatch) {
      throw new Error(`Invalid Python version format: ${version}`);
    }

    const major = versionMatch[1];
    const minor = versionMatch[2] || "0";
    const pythonMajorVersion = `${major}.${minor}`;

    const stdLib = pythonStdLib as Record<string, string[]>;

    const stdModuleList = stdLib[pythonMajorVersion];

    if (!stdModuleList) {
      console.warn(
        `No standard library modules found for Python version ${pythonMajorVersion}. Using standard library for Python 3.9 as a fallback`,
      );
      const fallbackStdLib = pythonStdLib["3.9"];
      if (!fallbackStdLib) {
        throw new Error(
          `No standard library modules found for Python version 3.9.`,
        );
      }
      return new Set(fallbackStdLib);
    }

    return new Set(stdModuleList);
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
   * @returns The root PythonModule representing the project's top-level namespace.
   */
  private buildModuleMap(filePaths: Set<string>): PythonModule {
    const root: PythonModule = {
      name: "",
      fullName: "",
      path: "",
      type: PYTHON_NAMESPACE_MODULE_TYPE,
      children: new Map(),
      parent: undefined,
    };

    filePaths.forEach((filePath) => {
      // Split the file path into directories and file name.
      const parts = filePath.split(sep);

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
      currentModule.path = filePath;
    });

    return root;
  }

  /**
   * Retrieves the PythonModule associated with a given file path.
   *
   * This method uses a caching mechanism to improve performance when the same
   * file path is requested multiple times. On the first request for a path,
   * the module is resolved and cached; subsequent requests for the same path
   * return the cached result without re-resolving.
   *
   * For file paths ending in __init__.py, the package directory is returned
   * (by stripping off the __init__.py segment). For other .py files,
   * the .py extension is removed before traversal.
   *
   * @param filePath - The file system path to resolve.
   * @returns The matching PythonModule if found.
   * @throws Error if the module could not be found in the project.
   */
  public getModuleFromFilePath(filePath: string): PythonModule {
    // Check if this path has already been resolved and return from cache if available
    if (this.modulePathCache.has(filePath)) {
      return this.modulePathCache.get(filePath) as PythonModule;
    }

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
        throw new Error(
          `Module not found for path: ${filePath}. Check if the module is part of the project.`,
        );
      }
      currentNode = candidateNode;
    }

    // Cache the result before returning
    this.modulePathCache.set(filePath, currentNode);
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
   * Implements caching to avoid redundant resolution of the same imports.
   *
   * @param currentModule - The module where the import occurs.
   * @param moduleName - The import string (e.g. ".helper" or "project.module").
   * @returns The resolved PythonModule if found, or undefined otherwise.
   */
  public resolveModule(
    currentModule: PythonModule,
    moduleName: string,
  ): PythonModule | undefined {
    // Create a cache key using the current module's name and the import string
    const cacheKey = `${currentModule.fullName}:${moduleName}`;

    // Check if we've already resolved this import in this context
    if (this.importResolutionCache.has(cacheKey)) {
      return this.importResolutionCache.get(cacheKey);
    }

    const pythonModule = moduleName.startsWith(".")
      ? this.resolveRelativeModule(currentModule, moduleName)
      : this.resolveAbsoluteImport(currentModule, moduleName);

    // Don't return self-references
    const result = pythonModule === currentModule ? undefined : pythonModule;

    // Cache the result
    this.importResolutionCache.set(cacheKey, result);
    return result;
  }

  /**
   * Resolves a relative import for a given module.
   *
   * Relative import strings use leading dots to indicate how many levels up
   * in the package hierarchy to traverse before locating the target module.
   * The remaining dotted path is then followed from the base package.
   *
   * Examples:
   *  - ".helper" resolves to a sibling module named "helper".
   *  - "..module" moves up one level and resolves to a module named "module".
   *
   * @param currentModule - The module performing the import.
   * @param moduleName - The relative import string (e.g. ".helper" or "..module.sub").
   * @returns The corresponding PythonModule if found, or undefined otherwise.
   */
  private resolveRelativeModule(
    currentModule: PythonModule,
    moduleName: string,
  ): PythonModule | undefined {
    // Count the number of leading dots to determine the package level.
    let level = 0;
    while (moduleName[level] === ".") {
      level++;
    }
    const remainder = moduleName.slice(level);

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
   * traverses upward from the current module's package, checking each ancestor's
   * children for a matching module path.
   *
   * For example, an import like "module.sub" will be searched for in the current
   * package and, if not found, in higher-level packages.
   *
   * Uses intermediate caching to improve performance when resolving deep import paths.
   *
   * @param currentModule - The module performing the import.
   * @param moduleName - The absolute import string (e.g. "module.sub" or "project.utils.helper").
   * @returns The resolved PythonModule if it exists, or undefined otherwise.
   */
  private resolveAbsoluteImport(
    currentModule: PythonModule,
    moduleName: string,
  ): PythonModule | undefined {
    // Check if it's a standard library module using the Set for faster lookup
    if (this.stdModuleSet.has(moduleName)) {
      return undefined;
    }

    // Split import into segments
    const parts = moduleName.split(".");

    // Cache for intermediate resolution results during this method call
    // Maps partial paths to their resolved modules to avoid redundant lookups
    const partialResolutionCache = new Map<string, PythonModule | undefined>();

    if (currentModule.path && !currentModule.path.endsWith("__init__.py")) {
      if (currentModule.parent) {
        currentModule = currentModule.parent;
      }
    }

    // Walk upward in the module hierarchy to find a matching candidate
    let ancestor: PythonModule | undefined = currentModule;
    while (ancestor) {
      let candidate: PythonModule | undefined = ancestor;
      let partialName = "";

      // Try to resolve each part of the import path
      for (const part of parts) {
        // Build the partial import path as we go
        partialName = partialName ? `${partialName}.${part}` : part;

        // Check if we already resolved this partial path from the current ancestor
        const cacheKey = `${ancestor.fullName}:${partialName}`;
        if (partialResolutionCache.has(cacheKey)) {
          candidate = partialResolutionCache.get(cacheKey);
          continue;
        }

        // If not in cache, resolve the next part
        const nextCandidate = candidate?.children.get(part);
        candidate = nextCandidate;

        // Cache this partial resolution result
        partialResolutionCache.set(cacheKey, candidate);

        if (!candidate) {
          // Cache negative result to avoid redundant lookups
          partialResolutionCache.set(cacheKey, undefined);
          break;
        }
      }

      if (candidate) {
        return candidate;
      }

      ancestor = ancestor.parent;
    }

    return undefined;
  }
}
