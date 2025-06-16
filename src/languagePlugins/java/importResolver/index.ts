import type { JavaPackageMapper } from "../packageMapper/index.ts";
import type { JavaFile } from "../packageResolver/types.ts";
import type { JavaImports } from "./types.ts";

/**
 * Resolves and organizes Java imports for a given set of files.
 */
export class JavaImportResolver {
  mapper: JavaPackageMapper;
  imports: Map<string, JavaImports>;

  /**
   * Creates an instance of JavaImportResolver.
   * @param {JavaPackageMapper} mapper - The package mapper containing file and tree information.
   */
  constructor(mapper: JavaPackageMapper) {
    this.mapper = mapper;
    this.imports = new Map();
    for (const [key, f] of this.mapper.files) {
      this.imports.set(key, this.getImports(f));
    }
  }

  /**
   * Retrieves and categorizes imports for a given Java file.
   * @param {JavaFile} file - The Java file for which imports need to be resolved.
   * @returns {JavaImports} An object containing resolved and unresolved imports.
   */
  getImports(file: JavaFile): JavaImports {
    const imports: JavaImports = {
      resolved: new Map(),
      unresolved: [],
    };
    const importstrings = file.imports;
    for (const impstr of importstrings) {
      const foundimport = this.mapper.tree.getImport(impstr);
      if (!foundimport) {
        imports.unresolved.push(impstr);
      } else {
        for (const [key, dep] of foundimport) {
          imports.resolved.set(key, dep);
        }
      }
    }
    const currentPackageImports = this.mapper.tree.getImport(
      file.package + ".*",
    );
    if (currentPackageImports) {
      for (const [key, dep] of currentPackageImports) {
        imports.resolved.set(key, dep);
      }
    }
    return imports;
  }
}
