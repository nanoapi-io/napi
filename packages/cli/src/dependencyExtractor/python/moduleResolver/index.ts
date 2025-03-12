import path from "path";

/**
 * PythonModuleResolver is responsible for mapping Python files to their module names
 * and resolving module imports to their corresponding file paths.
 */
export class PythonModuleResolver {
  private fileSet: Set<string>; // Set of all Python file paths in the project
  private moduleMap = new Map<string, string>(); // Maps file paths to module names
  private cache = new Map<string, string | undefined>(); // Cache to resolve module paths faster

  constructor(fileSet: Set<string>) {
    this.fileSet = fileSet;
    this.init();
  }

  /**
   * Initializes the module map by assigning a module name to each file.
   */
  private init() {
    this.fileSet.forEach((filePath) => {
      const moduleName = this.getModuleName(filePath);
      if (moduleName) {
        this.moduleMap.set(filePath, moduleName);
      }
    });
  }

  /**
   * Converts a file path into a Python module name.
   */
  public getModuleName(filePath: string): string {
    if (!filePath.endsWith(".py")) return ""; // ✅ Ignore non-Python files

    let relativePath = path.normalize(filePath).replace(/\\/g, "/"); // ✅ Normalize slashes

    // If the file is __init__.py, remove it to get the package name
    if (relativePath.endsWith("/__init__.py")) {
      relativePath = relativePath.replace("/__init__.py", "");
    }

    return relativePath.replace(/\.py$/, "").replace(/\//g, ".");
  }

  /**
   * Resolves the file path of an imported module.
   */
  public getFilePathFromModuleName(
    currentFilePath: string,
    importedModuleName: string,
  ): string | undefined {
    const cacheKey = `${currentFilePath}|${importedModuleName}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let resolvedPath: string | undefined;

    if (importedModuleName.startsWith(".")) {
      resolvedPath = this.resolveRelativeImport(
        currentFilePath,
        importedModuleName,
      );
    } else {
      resolvedPath = this.resolveAbsoluteImport(
        currentFilePath,
        importedModuleName,
      );
    }

    this.cache.set(cacheKey, resolvedPath);
    return resolvedPath;
  }

  /**
   * Resolves relative imports (e.g., `from .utils import helper`)
   */
  private resolveRelativeImport(
    currentFilePath: string,
    importedModuleName: string,
  ): string | undefined {
    const currentDir = path.dirname(currentFilePath);
    const parentDirs = currentDir.split(path.sep);

    const relativeMatch = importedModuleName.match(/^\.+/);
    const relativeLevels =
      relativeMatch && relativeMatch[0].length > 1
        ? relativeMatch[0].length - 1
        : 0;

    // ✅ Prevent moving above the project root
    if (relativeLevels >= parentDirs.length) {
      return undefined;
    }

    const baseModuleName = importedModuleName
      .replace(/^\.*/, "")
      .replace(/\./g, path.sep);
    let searchDir = parentDirs
      .slice(0, parentDirs.length - relativeLevels)
      .join(path.sep);

    while (searchDir) {
      const searchPath = path.join(searchDir, baseModuleName + ".py");
      if (this.fileSet.has(searchPath)) return searchPath;

      const packagePath = path.join(searchDir, baseModuleName, "__init__.py");
      if (this.fileSet.has(packagePath)) return packagePath;

      // ✅ Ensure the directory has an `__init__.py` before going up
      const containingInit = path.join(searchDir, "__init__.py");
      if (!this.fileSet.has(containingInit)) {
        return undefined;
      }

      const nextSearchDir = path.dirname(searchDir);
      if (nextSearchDir === searchDir) break;
      searchDir = nextSearchDir;
    }

    return undefined;
  }

  /**
   * Resolves absolute imports (e.g., `from app.utils import helper`)
   */
  private resolveAbsoluteImport(
    currentFilePath: string,
    importedModuleName: string,
  ): string | undefined {
    const currentDir = path.dirname(currentFilePath);
    const pathParts = currentDir.split(path.sep);

    for (let i = pathParts.length; i > 0; i--) {
      const rootPath = pathParts.slice(0, i).join(path.sep);
      const modulePath = importedModuleName.replace(/\./g, path.sep);

      const possibleFile = path.join(rootPath, modulePath + ".py");
      if (this.fileSet.has(possibleFile)) return possibleFile;

      const possiblePackage = path.join(rootPath, modulePath, "__init__.py");
      if (this.fileSet.has(possiblePackage)) return possiblePackage;

      // ✅ Stop early if the package does not exist
      if (
        this.fileSet.has(
          path.join(rootPath, modulePath.split(path.sep)[0], "__init__.py"),
        )
      ) {
        return undefined;
      }
    }

    return undefined;
  }
}
