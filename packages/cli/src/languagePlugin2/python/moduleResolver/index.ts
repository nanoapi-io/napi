import * as path from "path";

export const RESOLVED_FILE_MODULE = "file";
export const RESOLVED_PACKAGE_MODULE = "package";
export const RESOLVED_NAMESPACE_PACKAGE_MODULE = "namespace";
export const UNRESOLVED_MODULE = "unresolved";

export type ResolvedModuleType =
  | typeof RESOLVED_FILE_MODULE
  | typeof RESOLVED_PACKAGE_MODULE
  | typeof RESOLVED_NAMESPACE_PACKAGE_MODULE
  | typeof UNRESOLVED_MODULE;

export interface ResolvedModule {
  type: ResolvedModuleType;
  resolvedPath: string;
}

export class PythonModuleResolver {
  private fileSet: Set<string>;
  private cache = new Map<string, ResolvedModule>();

  constructor(fileSet: Set<string>) {
    this.fileSet = fileSet;
  }

  public getResolvedModule(
    currentFilePath: string,
    source: string,
  ): ResolvedModule {
    const cacheKey = `${currentFilePath}|${source}`;
    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    if (source === "") {
      const resolved: ResolvedModule = {
        type: UNRESOLVED_MODULE,
        resolvedPath: "",
      };
      this.cache.set(cacheKey, resolved);
      return resolved;
    }

    let moduleParts: string[] = [];
    let sysPathCandidates: string[] = [];

    if (source.startsWith(".")) {
      // Relative import logic:
      // In Python a single dot means "current package" (remove 0 components),
      // two dots mean "parent package" (remove 1 component), etc.
      let level = 0;
      while (source[level] === ".") {
        level++;
      }
      const relativeRemainder = source.slice(level); // may be empty

      // Compute the top-level package directory.
      const packageRoot = this.getPackageRoot(currentFilePath);
      // For relative imports, sys.path should be the parent directory of the top-level package.
      const relativeSysPath = path.dirname(packageRoot);
      sysPathCandidates = [relativeSysPath];

      // Compute the current package name by getting the relative path from the sys.path candidate to the directory of the current file.
      const currentDir = path.dirname(currentFilePath);
      const pkgRelative = path.relative(relativeSysPath, currentDir);
      const packageParts = pkgRelative ? pkgRelative.split(path.sep) : [];

      // Remove level-1 components from the end (so a single dot removes 0 components).
      const removeCount = level - 1;
      if (packageParts.length < removeCount) {
        const resolved: ResolvedModule = {
          type: UNRESOLVED_MODULE,
          resolvedPath: "",
        };
        this.cache.set(cacheKey, resolved);
        return resolved;
      }
      const targetPackageParts = packageParts.slice(
        0,
        packageParts.length - removeCount,
      );
      const remainderParts = relativeRemainder
        ? relativeRemainder.split(".")
        : [];
      // Effective module parts = current package (adjusted) plus any remainder.
      moduleParts = [...targetPackageParts, ...remainderParts];
      // (If moduleParts is empty, it means the import was just "." or "..", which we’ll resolve via __init__.py.)
    } else {
      // Absolute import: simply split the source.
      moduleParts = source.split(".");
      sysPathCandidates = this.getSysPathCandidates(currentFilePath);
    }

    let resolved: ResolvedModule = {
      type: UNRESOLVED_MODULE,
      resolvedPath: "",
    };

    for (const base of sysPathCandidates) {
      const variants: string[] = [];
      const parentCandidate = path.dirname(base);
      if (parentCandidate !== base) {
        variants.push(parentCandidate);
      }
      variants.push(base);

      for (const candidate of variants) {
        const effectiveParts =
          path.basename(candidate) === moduleParts[0]
            ? moduleParts.slice(1)
            : moduleParts;

        const fileCandidate = path.join(candidate, ...effectiveParts) + ".py";
        if (this.fileSet.has(fileCandidate)) {
          resolved = {
            type: RESOLVED_FILE_MODULE,
            resolvedPath: fileCandidate,
          };
          break;
        }
        const packageCandidate = path.join(
          candidate,
          ...effectiveParts,
          "__init__.py",
        );
        if (this.fileSet.has(packageCandidate)) {
          resolved = {
            type: RESOLVED_PACKAGE_MODULE,
            resolvedPath: packageCandidate,
          };
          break;
        }
        const namespaceCandidate = path.join(candidate, ...effectiveParts);
        if (this.directoryExists(namespaceCandidate)) {
          resolved = {
            type: RESOLVED_NAMESPACE_PACKAGE_MODULE,
            resolvedPath: namespaceCandidate,
          };
          break;
        }
      }
      if (resolved.type !== UNRESOLVED_MODULE) break;
    }

    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  private getSysPathCandidates(currentFilePath: string): string[] {
    const candidates: string[] = [];
    const currentDir = path.dirname(currentFilePath);
    const sysPathBase = this.getSysPathBase(currentFilePath);
    if (sysPathBase !== currentDir) {
      candidates.push(sysPathBase);
    }
    candidates.push(currentDir);
    return candidates;
  }

  // For absolute import resolution, getSysPathBase returns the directory containing the top-level package.
  private getSysPathBase(currentFilePath: string): string {
    // Get the top-level package directory and return its parent.
    const pkgRoot = this.getPackageRoot(currentFilePath);
    return path.dirname(pkgRoot);
  }

  // getPackageRoot returns the top-level package directory.
  private getPackageRoot(currentFilePath: string): string {
    let base = path.dirname(currentFilePath);
    while (true) {
      const parent = path.dirname(base);
      if (
        parent === base ||
        !this.fileSet.has(path.join(parent, "__init__.py"))
      ) {
        break;
      }
      base = parent;
    }
    return base;
  }

  private directoryExists(dirPath: string): boolean {
    const dirWithSep = dirPath + path.sep;
    for (const file of this.fileSet) {
      if (file.startsWith(dirWithSep)) {
        return true;
      }
    }
    return false;
  }
}
