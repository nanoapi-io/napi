import type { JavaPackageMapper } from "../packageMapper/index.ts";
import type { JavaFile } from "../packageResolver/types.ts";
import type { JavaImports } from "./types.ts";

export class JavaImportResolver {
  mapper: JavaPackageMapper;
  imports: Map<string, JavaImports>;

  constructor(mapper: JavaPackageMapper) {
    this.mapper = mapper;
    this.imports = new Map();
    for (const [key, f] of this.mapper.files) {
      this.imports.set(key, this.getImports(f));
    }
  }

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
    return imports;
  }
}
