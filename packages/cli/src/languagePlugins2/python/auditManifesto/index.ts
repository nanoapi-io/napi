import Parser from "tree-sitter";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { readFileSync } from "fs";
import { join } from "path";
import { PythonExportResolver } from "../exportResolver";
import { PythonImportResolver } from "../importResolver";
import { PythonModuleResolver } from "../moduleResolver";
import {
  FileDependencies,
  PythonDependencyResolver,
} from "../dependencyResolver";

export interface FileManifesto {
  id: string;
  filePath: string;
  dependencies: {
    source: string;
    isExternal: boolean;
    isUsed: boolean;
    symbols: { id: string; isUsed: boolean }[];
  }[];
  auditResults: [];
  symbols: {
    id: string;
    type: string;
    dependencies: {
      source: string;
      isExternal: boolean;
      symbolIds: string[];
    }[];
    dependents: {
      id: string;
      filepath: string;
      symbolIds: string[];
    }[];
    auditResults: [];
  }[];
}

export class PythonAuditManifesto {
  private files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>;
  private parser = pythonParser;
  private exportResolver: PythonExportResolver;
  private moduleResolver: PythonModuleResolver;
  private importResolver: PythonImportResolver;

  constructor(workDir: string, filePaths: string[]) {
    const files = this.parseFiles(workDir, filePaths);

    this.files = files;

    const fileSet = new Set(files.keys());
    this.exportResolver = new PythonExportResolver(this.parser, this.files);
    this.moduleResolver = new PythonModuleResolver(
      fileSet,
      this.exportResolver,
    );
    this.importResolver = new PythonImportResolver(
      this.parser,
      this.files,
      this.moduleResolver,
      this.exportResolver,
    );
  }

  private parseFiles(workDir: string, filePaths: string[]) {
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();

    filePaths.forEach((path) => {
      if (!path.endsWith(".py")) {
        console.warn(`File: ${path} is not a python file, skipping it.`);
        return;
      }

      let content = "";
      try {
        const fullPath = join(workDir, path);
        content = readFileSync(fullPath, "utf-8");
      } catch (e) {
        console.error(`Error reading file: ${path}, skipping it.`);
        console.error(e);
        return;
      }

      let tree: Parser.Tree;
      try {
        tree = this.parser.parse(content, undefined, {
          bufferSize: content.length + 1,
        });
      } catch (e) {
        console.error(`Error parsing file: ${path}, skipping it.`);
        console.error(e);
        return;
      }

      files.set(path, { path, rootNode: tree.rootNode });
    });

    return files;
  }

  public run() {
    console.log(this.files.size, " files to process");

    console.log(
      this.importResolver.getImportedModules("api/wizards/services.py"),
    );
    console.log(this.exportResolver.getSymbols("api/data/hobbits.py"));

    // eslint-disable-next-line no-constant-condition
    if (2 === 1 + 1) return [];

    const filesDependencies = new Map<string, FileDependencies>();

    // 1) Collect all dependencies for each file.
    this.files.forEach((file) => {
      const pythonDependencyResolver = new PythonDependencyResolver(
        file,
        this.parser,
        this.moduleResolver,
        this.exportResolver,
        this.importResolver,
      );

      const fileDependencies = pythonDependencyResolver.getDependencies();

      filesDependencies.set(file.path, fileDependencies);

      console.log("✅ Processed dependencies for file: ", file.path);
    });

    // 2) build the manifesto without dependents
    const manifesto = new Map<string, FileManifesto>();

    filesDependencies.forEach((fileDependencies, filePath) => {
      const fileManifesto: FileManifesto = {
        id: filePath,
        filePath,
        dependencies: [],
        auditResults: [],
        symbols: [],
      };

      fileDependencies.dependencies.forEach((dependency) => {
        fileManifesto.dependencies.push({
          source: dependency.source,
          isExternal: dependency.isExternal,
          isUsed: dependency.isUsed,
          symbols: dependency.symbols.map((symbol) => ({
            id: symbol.id,
            isUsed: symbol.isUsed,
          })),
        });
      });

      fileDependencies.symbols.forEach((symbol) => {
        const symbolManifesto: FileManifesto["symbols"][0] = {
          id: symbol.id,
          type: symbol.type,
          dependencies: [],
          dependents: [],
          auditResults: [],
        };

        symbol.dependencies.forEach((dependency) => {
          symbolManifesto.dependencies.push({
            source: dependency.source,
            isExternal: dependency.isExternal,
            symbolIds: dependency.symbolIds,
          });
        });

        fileManifesto.symbols.push(symbolManifesto);
      });

      manifesto.set(filePath, fileManifesto);
    });

    // 3) Build a lookup table: (filePath + symbolId) -> symbolManifesto
    //    so we can quickly find each symbol’s manifesto.
    const symbolLookup = new Map<
      string,
      {
        fileManifesto: FileManifesto;
        symbolManifesto: FileManifesto["symbols"][0];
      }
    >();

    manifesto.forEach((fileManifesto, filePath) => {
      fileManifesto.symbols.forEach((symbolManifesto) => {
        // For example, use "filePath::symbolId" as a map key:
        const key = `${filePath}::${symbolManifesto.id}`;
        symbolLookup.set(key, { fileManifesto, symbolManifesto });
      });
    });

    // 4) Populate dependents for each symbol:
    //    For every symbol, look at its dependencies. Each dependency
    //    references symbol(s) by { source, symbolIds }. If source is
    //    not external, we find the matching symbol(s) in `symbolLookup`
    //    and add a “dependent” record to them.
    manifesto.forEach((fileManifesto) => {
      fileManifesto.symbols.forEach((symbolManifesto) => {
        symbolManifesto.dependencies.forEach((dependency) => {
          if (dependency.isExternal) {
            // Skip external references if you only want internal references.
            return;
          }

          // For each referenced symbol ID in the dependency
          dependency.symbolIds.forEach((depSymbolId) => {
            // We assume dependency.source is exactly the other file path
            // that exported depSymbolId. If `source` is not the direct path,
            // you may need to map it to the actual file path first (e.g. by
            // using your PythonModuleResolver).
            const lookupKey = `${dependency.source}::${depSymbolId}`;
            const target = symbolLookup.get(lookupKey);

            if (target) {
              // The target symbol is “depended on” by our current symbol
              target.symbolManifesto.dependents.push({
                id: symbolManifesto.id,
                filepath: fileManifesto.filePath,
                // You can store which of the current symbol’s IDs or
                // other info if relevant. Usually the symbol ID is enough:
                symbolIds: [symbolManifesto.id],
              });
            }
          });
        });
      });
    });

    manifesto.forEach((fileManifesto) => {
      console.log("Manifesto for file: ", fileManifesto.filePath);
      if (
        // fileManifesto.filePath === "api/wizards/views.py" ||
        fileManifesto.filePath === "api/wizards/services.py"
      ) {
        console.log(JSON.stringify(fileManifesto, null, 2));
      }
    });

    return manifesto;
  }
}
