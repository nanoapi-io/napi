import { describe, it, expect } from "vitest";
import PythonImportExtractor, { resolveModules } from "./python";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import {
  classEntity,
  ExportMap,
  functionEntity,
  unknownEntity,
} from "../ExportExtractor/types";
import path from "path";
import { pythonFromModule, pythonRegularModule } from "./types";

const parser = new Parser();
parser.setLanguage(Python);
const extractor = new PythonImportExtractor(parser);

describe.only("resolveModules function", () => {
  // Checklist, things to be unit tested
  //
  // Standard import cases
  // - Importing a specific entity from a module
  // e.g., from core.my_module import func1
  // - Wildcard import from an internal module
  // e.g., from core.my_module import *
  // - Wildcard import from an external module (should not resolve entities)
  // e.g., from numpy import *
  // - Importing a module that exists at multiple paths (should pick the closest match)
  // e.g., import models in /project/apps/order/utils.py with modules in multiple directories.
  //
  // Handling internal and External modules
  // - Mark an import as external if it cannot be resolved
  // e.g., from missing_package import something should be isExternal: true.
  // - Module exists but entity does not exist (should return unknownEntity)
  // e.g., from utils import non_existent when utils.py exists but non_existent does not.
  // - Importing from a package that has an __init__.py file
  // e.g., import utils where utils/__init__.py exists.
  // - Importing from a directory without an __init__.py (should be marked external)
  // e.g., import utils when utils/ has no __init__.py.
  //
  // Alias & Wildcard Handling
  // - Aliased entity import
  // e.g., from core.my_module import func1 as my_func.
  // - Aliased module import
  // e.g., import core.my_module as mod.
  // - Aliased entity with a conflicting name in the same file
  // e.g., from core.my_module import func1 as func2, where func2 already exists.
  //
  // Module vs Package Conflicts
  // - Module vs Package resolution (same name exists in both module.py and package/__init__.py)
  // e.g., import utils when both utils.py and utils/__init__.py exist.
  // - Importing a module that is also a package but contains submodules
  // e.g., from utils import helpers, should resolve to utils/helpers.py instead of utils/__init__.py.
  //
  // Complex Import Scenarios
  // - Importing multiple entities in one statement
  // e.g., from core.my_module import func1, ClassA, variableX.
  // - Importing an entity that is itself an alias in the export map
  // e.g., from core.my_module import some_func, but some_func is actually def some_func as other_func.
  // - Importing a module that exists at multiple locations (should resolve to the closest one)
  // e.g., multiple utils.py files exist across directories.
  // - Wildcard import gathering entities from a package's submodules (if explicitly re-exported)
  // e.g., from utils import *, should only import submodules/entities listed in utils/__init__.py.

  it("should resolve an internal module with a specific entity", () => {
    const exportMap: ExportMap = {
      "/project/core/my_module.py": {
        filePath: "/project/core/my_module.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [
          {
            type: "named",
            node: { text: "def func1: pass" } as Parser.SyntaxNode,
            members: [
              {
                node: { text: "def func1: pass" } as Parser.SyntaxNode,
                identifierNode: { text: "func1" } as Parser.SyntaxNode,
                aliasNode: undefined,
                type: "function",
              },
            ],
          },
        ],
      },
    };

    const result = resolveModules(
      "/project/utils.py",
      {
        node: { text: "core.my_module" } as Parser.SyntaxNode,
        identifierNode: { text: "core.my_module" } as Parser.SyntaxNode,
        aliasNode: undefined,
      },
      [
        {
          node: { text: "func1" } as Parser.SyntaxNode,
          identifierNode: { text: "func1" } as Parser.SyntaxNode,
          aliasNode: undefined,
        },
      ],
      exportMap,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("core.my_module");
    expect(result[0].isWildcard).toBe(false);
    expect(result[0].isExternal).toBe(false);
    expect(result[0].resolvedSource).toBe("/project/core/my_module.py");
    expect(result[0].moduleNode.text).toBe("core.my_module");
    expect(result[0].moduleIdentifierNode.text).toBe("core.my_module");
    expect(result[0].moduleAliasNode).toBe(undefined);

    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entityNode.text).toBe("func1");
    expect(result[0].entities[0].entityIdentifierNode.text).toBe("func1");
    expect(result[0].entities[0].entityAliasNode).toBe(undefined);
    expect(result[0].entities[0].type).toBe(functionEntity);
  });

  it("should resolve a wildcard import and include all exported entities", () => {
    const exportMap: ExportMap = {
      "/project/core/my_module.py": {
        filePath: "/project/core/my_module.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [
          {
            type: "named",
            node: { text: "def func1: pass" } as Parser.SyntaxNode,
            members: [
              {
                node: { text: "def func1: pass" } as Parser.SyntaxNode,
                identifierNode: { text: "func1" } as Parser.SyntaxNode,
                aliasNode: undefined,
                type: "function",
              },
              {
                node: { text: "class MyClass: pass" } as Parser.SyntaxNode,
                identifierNode: { text: "MyClass" } as Parser.SyntaxNode,
                aliasNode: undefined,
                type: "class",
              },
            ],
          },
        ],
      },
    };

    const result = resolveModules(
      "/project/utils.py",
      {
        node: { text: "core.my_module" } as Parser.SyntaxNode,
        identifierNode: { text: "core.my_module" } as Parser.SyntaxNode,
      },
      [],
      exportMap,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("core.my_module");
    expect(result[0].isWildcard).toBe(true);
    expect(result[0].isExternal).toBe(false);
    expect(result[0].resolvedSource).toBe("/project/core/my_module.py");
    expect(result[0].moduleNode.text).toBe("core.my_module");
    expect(result[0].moduleIdentifierNode.text).toBe("core.my_module");
    expect(result[0].moduleAliasNode).toBe(undefined);

    expect(result[0].entities).toHaveLength(2);
    expect(result[0].entities[0].entityNode.text).toBe("func1");
    expect(result[0].entities[0].entityIdentifierNode.text).toBe("func1");
    expect(result[0].entities[0].entityAliasNode).toBe(undefined);
    expect(result[0].entities[0].type).toBe(functionEntity);
    expect(result[0].entities[1].entityNode.text).toBe("MyClass");
    expect(result[0].entities[1].entityIdentifierNode.text).toBe("MyClass");
    expect(result[0].entities[1].entityAliasNode).toBe(undefined);
    expect(result[0].entities[1].type).toBe(classEntity);
  });

  it("should mark an import as external if it cannot be resolved", () => {
    const exportMap: ExportMap = {}; // No entries in the export map

    const result = resolveModules(
      "/project/utils.py",
      {
        node: { text: "numpy" } as Parser.SyntaxNode,
        identifierNode: { text: "numpy" } as Parser.SyntaxNode,
        aliasNode: undefined,
      },
      [
        {
          node: { text: "random" } as Parser.SyntaxNode,
          identifierNode: { text: "random" } as Parser.SyntaxNode,
          aliasNode: undefined,
        },
      ],
      exportMap,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("numpy");
    expect(result[0].isWildcard).toBe(false);
    expect(result[0].isExternal).toBe(true);
    expect(result[0].resolvedSource).toBeUndefined();
    expect(result[0].moduleNode.text).toBe("numpy");
    expect(result[0].moduleIdentifierNode.text).toBe("numpy");
    expect(result[0].moduleAliasNode).toBe(undefined);

    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entityNode.text).toBe("random");
    expect(result[0].entities[0].entityIdentifierNode.text).toBe("random");
    expect(result[0].entities[0].entityAliasNode).toBe(undefined);
    expect(result[0].entities[0].type).toBe(unknownEntity);
  });

  it("should resolve a module but mark unknown entities with unknown type", () => {
    const exportMap: ExportMap = {
      "/project/core/my_module.py": {
        filePath: "/project/core/my_module.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [],
      },
    };

    const result = resolveModules(
      "/project/utils.py",
      {
        node: { text: "core.my_module" } as Parser.SyntaxNode,
        identifierNode: { text: "core.my_module" } as Parser.SyntaxNode,
        aliasNode: undefined,
      },
      [
        {
          node: { text: "unknown_func" } as Parser.SyntaxNode,
          identifierNode: { text: "unknown_func" } as Parser.SyntaxNode,
          aliasNode: undefined,
        },
      ],
      exportMap,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("core.my_module");
    expect(result[0].isWildcard).toBe(false);
    expect(result[0].isExternal).toBe(false);
    expect(result[0].resolvedSource).toBe("/project/core/my_module.py");
    expect(result[0].moduleNode.text).toBe("core.my_module");
    expect(result[0].moduleIdentifierNode.text).toBe("core.my_module");
    expect(result[0].moduleAliasNode).toBe(undefined);

    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entityNode.text).toBe("unknown_func");
    expect(result[0].entities[0].entityIdentifierNode.text).toBe(
      "unknown_func",
    );
    expect(result[0].entities[0].entityAliasNode).toBe(undefined);
    expect(result[0].entities[0].type).toBe(unknownEntity);
  });

  it("should correctly resolve an aliased import", () => {
    const exportMap: ExportMap = {
      "/project/core/my_module.py": {
        filePath: "/project/core/my_module.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [
          {
            type: "named",
            node: { text: "def func1: pass" } as Parser.SyntaxNode,
            members: [
              {
                node: { text: "def func1: pass" } as Parser.SyntaxNode,
                identifierNode: { text: "func1" } as Parser.SyntaxNode,
                aliasNode: undefined,
                type: "function",
              },
            ],
          },
        ],
      },
    };

    const result = resolveModules(
      "/project/utils.py",
      {
        node: { text: "core.my_module" } as Parser.SyntaxNode,
        identifierNode: { text: "core.my_module" } as Parser.SyntaxNode,
      },
      [
        {
          node: { text: "func1 as my_func" } as Parser.SyntaxNode,
          identifierNode: { text: "func1" } as Parser.SyntaxNode,
          aliasNode: { text: "my_func" } as Parser.SyntaxNode,
        },
      ],
      exportMap,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("core.my_module");
    expect(result[0].isWildcard).toBe(false);
    expect(result[0].isExternal).toBe(false);
    expect(result[0].resolvedSource).toBe("/project/core/my_module.py");
    expect(result[0].moduleNode.text).toBe("core.my_module");
    expect(result[0].moduleIdentifierNode.text).toBe("core.my_module");
    expect(result[0].moduleAliasNode).toBe(undefined);

    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entityNode.text).toBe("func1 as my_func");
    expect(result[0].entities[0].entityIdentifierNode.text).toBe("func1");
    expect(result[0].entities[0].entityAliasNode?.text).toBe("my_func");
    expect(result[0].entities[0].type).toBe("function");
  });

  it("should resolve a module that exists at multiple path", () => {
    const exportMap: ExportMap = {
      "/project/apps/order/utils.py": {
        filePath: "/project/apps/order/utils.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [
          {
            type: "named",
            node: { text: "def func1: pass" } as Parser.SyntaxNode,
            members: [
              {
                node: { text: "def func1: pass" } as Parser.SyntaxNode,
                identifierNode: { text: "func1" } as Parser.SyntaxNode,
                aliasNode: undefined,
                type: "function",
              },
            ],
          },
        ],
      },
      "/project/apps/inventory/utils.py": {
        filePath: "/project/apps/inventory/utils.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [
          {
            type: "named",
            node: { text: "def func2: pass" } as Parser.SyntaxNode,
            members: [
              {
                node: { text: "def func2: pass" } as Parser.SyntaxNode,
                identifierNode: { text: "func2" } as Parser.SyntaxNode,
                aliasNode: undefined,
                type: "function",
              },
            ],
          },
        ],
      },
    };

    const result = resolveModules(
      "/project/apps/order/utils.py",
      {
        node: { text: "utils" } as Parser.SyntaxNode,
        identifierNode: { text: "utils" } as Parser.SyntaxNode,
        aliasNode: undefined,
      },
      [],
      exportMap,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("utils");
    expect(result[0].isWildcard).toBe(true);
    expect(result[0].isExternal).toBe(false);
    expect(result[0].resolvedSource).toBe("/project/apps/order/utils.py");
    expect(result[0].moduleNode.text).toBe("utils");
    expect(result[0].moduleIdentifierNode.text).toBe("utils");
    expect(result[0].moduleAliasNode).toBe(undefined);

    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entityNode.text).toBe("func1");
    expect(result[0].entities[0].entityIdentifierNode.text).toBe("func1");
    expect(result[0].entities[0].entityAliasNode).toBe(undefined);
    expect(result[0].entities[0].type).toBe(functionEntity);
  });

  it("should resolve a module width wildcard and alias", () => {
    const exportMap: ExportMap = {
      "/project/core/my_module.py": {
        filePath: "/project/core/my_module.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [
          {
            type: "named",
            node: {} as Parser.SyntaxNode,
            members: [
              {
                node: {} as Parser.SyntaxNode,
                identifierNode: { text: "funcA" } as Parser.SyntaxNode,
                aliasNode: undefined,
                type: "function",
              },
            ],
          },
        ],
      },
    };

    const result = resolveModules(
      "/project/utils.py",
      {
        node: { text: "core.my_module" } as Parser.SyntaxNode,
        identifierNode: { text: "core.my_module" } as Parser.SyntaxNode,
        aliasNode: { text: "mod" } as Parser.SyntaxNode,
      },
      [],
      exportMap,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("core.my_module");
    expect(result[0].isWildcard).toBe(true);
    expect(result[0].isExternal).toBe(false);
    expect(result[0].resolvedSource).toBe("/project/core/my_module.py");
    expect(result[0].moduleNode.text).toBe("core.my_module");
    expect(result[0].moduleIdentifierNode.text).toBe("core.my_module");
    expect(result[0].moduleAliasNode?.text).toBe("mod");

    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entityNode.text).toBe("funcA");
    expect(result[0].entities[0].entityIdentifierNode.text).toBe("funcA");
    expect(result[0].entities[0].entityAliasNode).toBe(undefined);
    expect(result[0].entities[0].type).toBe(functionEntity);
  });

  it("should handle importing from a submodule instead of a packahe", () => {
    const exportMap: ExportMap = {
      "/project/utils/__init__.py": {
        filePath: "/project/utils/__init__.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [],
      },
      "/project/utils/helpers.py": {
        filePath: "/project/utils/helpers.py",
        language: "python",
        couldNotProcess: false,
        exportStatements: [
          {
            type: "named",
            node: {} as Parser.SyntaxNode,
            members: [
              {
                node: {} as Parser.SyntaxNode,
                identifierNode: { text: "funcA" } as Parser.SyntaxNode,
                aliasNode: undefined,
                type: "function",
              },
            ],
          },
        ],
      },
    };

    const result = resolveModules(
      "/project/main.py",
      {
        node: { text: "utils.helpers" } as Parser.SyntaxNode,
        identifierNode: { text: "utils.helpers" } as Parser.SyntaxNode,
        aliasNode: undefined,
      },
      [],
      exportMap,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("utils.helpers");
    expect(result[0].isWildcard).toBe(true);
    expect(result[0].isExternal).toBe(false);
    expect(result[0].resolvedSource).toBe("/project/utils/helpers.py");
    expect(result[0].moduleNode.text).toBe("utils.helpers");
    expect(result[0].moduleIdentifierNode.text).toBe("utils.helpers");
    expect(result[0].moduleAliasNode).toBe(undefined);

    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entityNode.text).toBe("funcA");
    expect(result[0].entities[0].entityIdentifierNode.text).toBe("funcA");
    expect(result[0].entities[0].entityAliasNode).toBe(undefined);
    expect(result[0].entities[0].type).toBe(functionEntity);
  });
});

// describe("PythonImportExtractor regular imports", () => {
//   describe("External module imports (not in export map)", () => {
//     const externalImports = [
//       {
//         description: "Extracts a third-party library import",
//         currentFilePath: "/project/utils.py",
//         sourceCode: "import numpy",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonRegularModule,
//             statementNodeText: "import numpy",
//             modules: [
//               {
//                 source: "numpy",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "numpy",
//                 moduleAliasNodeText: undefined,
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description: "Extracts a sub module from third-party library import",
//         currentFilePath: "/project/utils.py",
//         sourceCode: "import numpy.random",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonRegularModule,
//             statementNodeText: "import numpy.random",
//             modules: [
//               {
//                 source: "numpy.random",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "numpy.random",
//                 moduleAliasNodeText: undefined,
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description: "Extracts an aliased third-party library import",
//         currentFilePath: "/project/scripts/data_processing.py",
//         sourceCode: "import numpy.random as np",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonRegularModule,
//             statementNodeText: "import numpy.random as np",
//             modules: [
//               {
//                 source: "numpy.random",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "numpy.random",
//                 moduleAliasNodeText: "np",
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description: "Extracts multiple external imports in one line",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import os, sys, json",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonRegularModule,
//             statementNodeText: "import os, sys, json",
//             modules: [
//               {
//                 source: "os",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "os",
//                 moduleAliasNodeText: undefined,
//                 entities: [],
//               },
//               {
//                 source: "sys",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "sys",
//                 moduleAliasNodeText: undefined,
//                 entities: [],
//               },
//               {
//                 source: "json",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "json",
//                 moduleAliasNodeText: undefined,
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description: "Extracts multiple aliased external imports in one line",
//         currentFilePath: "/project/config_loader.py",
//         sourceCode: "import os as o, sys as s, json as j",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonRegularModule,
//             statementNodeText: "import os as o, sys as s, json as j",
//             modules: [
//               {
//                 source: "os",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "os",
//                 moduleAliasNodeText: "o",
//                 entities: [],
//               },
//               {
//                 source: "sys",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "sys",
//                 moduleAliasNodeText: "s",
//                 entities: [],
//               },
//               {
//                 source: "json",
//                 isWildcard: true,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "json",
//                 moduleAliasNodeText: "j",
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//     ];

//     it.each(externalImports)(
//       "$description",
//       ({ sourceCode, exportMap, expected, currentFilePath }) => {
//         const tree = parser.parse(sourceCode);
//         const importStatements = extractor.run(
//           path.join(currentFilePath),
//           tree.rootNode,
//           exportMap,
//         );

//         expect(importStatements).toHaveLength(expected.length);
//         importStatements.forEach((importStmt, index) => {
//           expect(importStmt.type).toBe(expected[index].type);
//           expect(importStmt.statementNode.text).toBe(
//             expected[index].statementNodeText,
//           );
//           expect(importStmt.modules).toHaveLength(
//             expected[index].modules.length,
//           );
//           importStmt.modules.forEach((importedModule, moduleIndex) => {
//             const expectedModule = expected[index].modules[moduleIndex];

//             expect(importedModule.source).toBe(expectedModule.source);
//             expect(importedModule.isWildcard).toBe(expectedModule.isWildcard);
//             expect(importedModule.isExternal).toBe(expectedModule.isExternal);
//             expect(importedModule.resolvedSource).toBe(
//               expectedModule.resolvedSource,
//             );
//             expect(importedModule.moduleIdentifierNode.text).toBe(
//               expectedModule.moduleIdentifierNodeText,
//             );
//             expect(importedModule.moduleAliasNode?.text).toBe(
//               expectedModule.moduleAliasNodeText,
//             );
//             expect(importedModule.entities).toEqual(expectedModule.entities);
//           });
//         });
//       },
//     );
//   });
//   describe("Internal module imports from export map", () => {
//     const internalImports = [
//       {
//         description: "Extracts an internal module import",
//         currentFilePath: "/project/core/utils.py",
//         sourceCode: "import my_module",
//         exportMap: {
//           "/project/core/my_module.py": {
//             filePath: "/project/core/my_module.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expected: [
//           {
//             type: pythonRegularModule,
//             statementNodeText: "import my_module",
//             modules: [
//               {
//                 source: "my_module",
//                 isWildcard: true,
//                 isExternal: false,
//                 resolvedSource: "/project/core/my_module.py",
//                 moduleIdentifierNodeText: "my_module",
//                 moduleAliasNodeText: undefined,
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description: "Extracts an internal sub module import",
//         currentFilePath: "/project/core/utils.py",
//         sourceCode: "import core.my_module",
//         exportMap: {
//           "/project/core/my_module.py": {
//             filePath: "/project/core/my_module.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expected: [
//           {
//             type: pythonRegularModule,
//             statementNodeText: "import core.my_module",
//             modules: [
//               {
//                 source: "core.my_module",
//                 isWildcard: true,
//                 isExternal: false,
//                 resolvedSource: "/project/core/my_module.py",
//                 moduleIdentifierNodeText: "core.my_module",
//                 moduleAliasNodeText: undefined,
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description: "Extracts an internal module import with alias",
//         currentFilePath: "/project/core/processing.py",
//         sourceCode: "import my_module as mod",
//         exportMap: {
//           "/project/core/my_module.py": {
//             filePath: "/project/core/my_module.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expected: [
//           {
//             type: pythonRegularModule,
//             statementNodeText: "import my_module as mod",
//             modules: [
//               {
//                 source: "my_module",
//                 isWildcard: true,
//                 isExternal: false,
//                 resolvedSource: "/project/core/my_module.py",
//                 moduleIdentifierNodeText: "my_module",
//                 moduleAliasNodeText: "mod",
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//     ];

//     it.each(internalImports)(
//       "$description",
//       ({ sourceCode, exportMap, expected, currentFilePath }) => {
//         const tree = parser.parse(sourceCode);
//         const importStatements = extractor.run(
//           path.join(currentFilePath),
//           tree.rootNode,
//           exportMap,
//         );

//         expect(importStatements).toHaveLength(expected.length);
//         importStatements.forEach((importStmt, index) => {
//           expect(importStmt.type).toBe(expected[index].type);
//           expect(importStmt.statementNode.text).toBe(
//             expected[index].statementNodeText,
//           );
//           expect(importStmt.modules).toHaveLength(
//             expected[index].modules.length,
//           );

//           importStmt.modules.forEach((importedModule, moduleIndex) => {
//             const expectedModule = expected[index].modules[moduleIndex];

//             expect(importedModule.source).toBe(expectedModule.source);
//             expect(importedModule.isWildcard).toBe(expectedModule.isWildcard);
//             expect(importedModule.isExternal).toBe(expectedModule.isExternal);
//             expect(importedModule.resolvedSource).toBe(
//               expectedModule.resolvedSource,
//             );
//             expect(importedModule.moduleIdentifierNode.text).toBe(
//               expectedModule.moduleIdentifierNodeText,
//             );
//             expect(importedModule.moduleAliasNode?.text).toBe(
//               expectedModule.moduleAliasNodeText,
//             );
//             expect(importedModule.entities).toEqual(expectedModule.entities);
//           });
//         });
//       },
//     );
//   });

//   describe("Source resolution function tests", () => {
//     const resolutionCases = [
//       /** ✅ Single Module or Package */
//       {
//         description: "Resolves a simple module",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import utils",
//         exportMap: {
//           "/project/utils.py": {
//             filePath: "/project/utils.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/utils.py",
//       },
//       {
//         description: "Resolves a package with __init__.py",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import utils",
//         exportMap: {
//           "/project/utils/__init__.py": {
//             filePath: "/project/utils/__init__.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/utils/__init__.py",
//       },

//       /** ✅ Prioritization of Module vs Package */
//       {
//         description: "Prefers module over package when both exist",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import utils",
//         exportMap: {
//           "/project/utils.py": {
//             filePath: "/project/utils.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//           "/project/utils/__init__.py": {
//             filePath: "/project/utils/__init__.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/utils.py",
//       },

//       /** ✅ Nested Packages */
//       {
//         description: "Resolves a nested module",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import utils.helpers",
//         exportMap: {
//           "/project/utils/helpers.py": {
//             filePath: "/project/utils/helpers.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/utils/helpers.py",
//       },
//       {
//         description: "Resolves a nested package with __init__.py",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import utils.helpers",
//         exportMap: {
//           "/project/utils/helpers/__init__.py": {
//             filePath: "/project/utils/helpers/__init__.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/utils/helpers/__init__.py",
//       },
//       {
//         description: "Prefers nested module over package",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import utils.helpers",
//         exportMap: {
//           "/project/utils/helpers.py": {
//             filePath: "/project/utils/helpers.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//           "/project/utils/helpers/__init__.py": {
//             filePath: "/project/utils/helpers/__init__.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/utils/helpers.py",
//       },

//       /** ✅ Multiple Matching Modules */
//       {
//         description:
//           "Handles ambiguous imports (same name in different directories)",
//         currentFilePath: "/project/apps/order/utils.py",
//         sourceCode: "import models",
//         exportMap: {
//           "/project/apps/order/models.py": {
//             filePath: "/project/apps/order/models.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//           "/project/apps/psp/models.py": {
//             filePath: "/project/apps/psp/models.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/apps/order/models.py",
//       },
//       {
//         description:
//           "Handles ambiguous package imports (same name, different locations)",
//         currentFilePath: "/project/apps/order/utils.py",
//         sourceCode: "import services",
//         exportMap: {
//           "/project/apps/order/services/__init__.py": {
//             filePath: "/project/apps/order/services/__init__.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//           "/project/apps/psp/services/__init__.py": {
//             filePath: "/project/apps/psp/services/__init__.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/apps/order/services/__init__.py",
//       },

//       /** ✅ Edge Cases */
//       {
//         description: "Handles missing module (importing unknown module)",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import missing_module",
//         exportMap: {} as ExportMap,
//         expectedResolvedSource: undefined,
//       },
//       {
//         description: "Handles missing package (importing unknown package)",
//         currentFilePath: "/project/main.py",
//         sourceCode: "import missing_package",
//         exportMap: {} as ExportMap,
//         expectedResolvedSource: undefined,
//       },

//       /** ✅ Complex Case: Mixed Modules and Packages */
//       {
//         description:
//           "Prefers closer module when both package and module exist at different locations",
//         currentFilePath: "/project/apps/order/utils.py",
//         sourceCode: "import services",
//         exportMap: {
//           "/project/apps/order/services.py": {
//             filePath: "/project/apps/order/services.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//           "/project/libs/services/__init__.py": {
//             filePath: "/project/libs/services/__init__.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/apps/order/services.py",
//       },
//       {
//         description:
//           "Prefers closer package when both package and module exist at different locations",
//         currentFilePath: "/project/apps/order/utils.py",
//         sourceCode: "import services",
//         exportMap: {
//           "/project/apps/order/services/__init__.py": {
//             filePath: "/project/apps/order/services/__init__.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//           "/project/libs/services.py": {
//             filePath: "/project/libs/services.py",
//             language: "python",
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expectedResolvedSource: "/project/apps/order/services/__init__.py",
//       },
//     ];

//     it.each(resolutionCases)(
//       "$description",
//       ({ sourceCode, exportMap, expectedResolvedSource, currentFilePath }) => {
//         const tree = parser.parse(sourceCode);
//         const importStatements = extractor.run(
//           path.join(currentFilePath),
//           tree.rootNode,
//           exportMap,
//         );

//         expect(importStatements[0].modules[0].resolvedSource).toBe(
//           expectedResolvedSource,
//         );
//       },
//     );
//   });
// });

// describe("PythonImportExtractor from imports", () => {
//   describe("External module imports (not in export map)", () => {
//     const externalImports = [
//       {
//         description: "Extracts a third-party library import",
//         currentFilePath: "/project/utils.py",
//         sourceCode: "from numpy import random",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonFromModule,
//             statementNodeText: "from numpy import random",
//             modules: [
//               {
//                 source: "numpy",
//                 isWildcard: false,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "numpy",
//                 moduleAliasNodeText: undefined,
//                 entities: [
//                   {
//                     type: unknownEntity,
//                     entityNodeText: "random",
//                     entityIdentifierNodeText: "random",
//                     entityAliasNodeText: undefined,
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description:
//           "Extracts a third-party library import with multiple entities",
//         currentFilePath: "/project/utils.py",
//         sourceCode: "from numpy import random, array",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonFromModule,
//             statementNodeText: "from numpy import random, array",
//             modules: [
//               {
//                 source: "numpy",
//                 isWildcard: false,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "numpy",
//                 moduleAliasNodeText: undefined,
//                 entities: [
//                   {
//                     type: unknownEntity,
//                     entityNodeText: "random",
//                     entityIdentifierNodeText: "random",
//                     entityAliasNodeText: undefined,
//                   },
//                   {
//                     type: unknownEntity,
//                     entityNodeText: "array",
//                     entityIdentifierNodeText: "array",
//                     entityAliasNodeText: undefined,
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description: "Extracts a third-party library import with alias",
//         currentFilePath: "/project/scripts/data_processing.py",
//         sourceCode: "from numpy import random as rnd",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonFromModule,
//             statementNodeText: "from numpy import random as rnd",
//             modules: [
//               {
//                 source: "numpy",
//                 isWildcard: false,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "numpy",
//                 moduleAliasNodeText: undefined,
//                 entities: [
//                   {
//                     type: unknownEntity,
//                     entityNodeText: "random as rnd",
//                     entityIdentifierNodeText: "random",
//                     entityAliasNodeText: "rnd",
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       },
//       {
//         description:
//           "Extracts a third party library with multiple aliases entities",
//         currentFilePath: "/project/scripts/data_processing.py",
//         sourceCode: "from numpy import random as rnd, array as arr",
//         exportMap: {} as ExportMap,
//         expected: [
//           {
//             type: pythonFromModule,
//             statementNodeText: "from numpy import random as rnd, array as arr",
//             modules: [
//               {
//                 source: "numpy",
//                 isWildcard: false,
//                 isExternal: true,
//                 resolvedSource: undefined,
//                 moduleIdentifierNodeText: "numpy",
//                 moduleAliasNodeText: undefined,
//                 entities: [
//                   {
//                     type: unknownEntity,
//                     entityNodeText: "random as rnd",
//                     entityIdentifierNodeText: "random",
//                     entityAliasNodeText: "rnd",
//                   },
//                   {
//                     type: unknownEntity,
//                     entityNodeText: "array as arr",
//                     entityIdentifierNodeText: "array",
//                     entityAliasNodeText: "arr",
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       },
//     ];

//     it.each(externalImports)(
//       "$description",
//       ({ sourceCode, exportMap, expected, currentFilePath }) => {
//         const tree = parser.parse(sourceCode);
//         const importStatements = extractor.run(
//           path.join(currentFilePath),
//           tree.rootNode,
//           exportMap,
//         );

//         expect(importStatements).toHaveLength(expected.length);
//         importStatements.forEach((importStmt, index) => {
//           expect(importStmt.type).toBe(expected[index].type);
//           expect(importStmt.statementNode.text).toBe(
//             expected[index].statementNodeText,
//           );
//           expect(importStmt.modules).toHaveLength(
//             expected[index].modules.length,
//           );
//           importStmt.modules.forEach((importedModule, moduleIndex) => {
//             const expectedModule = expected[index].modules[moduleIndex];

//             expect(importedModule.source).toBe(expectedModule.source);
//             expect(importedModule.isWildcard).toBe(expectedModule.isWildcard);
//             expect(importedModule.isExternal).toBe(expectedModule.isExternal);
//             expect(importedModule.resolvedSource).toBe(
//               expectedModule.resolvedSource,
//             );
//             expect(importedModule.moduleIdentifierNode.text).toBe(
//               expectedModule.moduleIdentifierNodeText,
//             );
//             expect(importedModule.moduleAliasNode?.text).toBe(
//               expectedModule.moduleAliasNodeText,
//             );
//             expect(importedModule.entities).toHaveLength(
//               expectedModule.entities.length,
//             );
//             importedModule.entities.forEach((entity, entityIndex) => {
//               const expectedEntity = expectedModule.entities[entityIndex];

//               expect(entity.type).toBe(expectedEntity.type);
//               expect(entity.entityNode.text).toBe(
//                 expectedEntity.entityNodeText,
//               );
//               expect(entity.entityIdentifierNode.text).toBe(
//                 expectedEntity.entityIdentifierNodeText,
//               );
//               expect(entity.entityAliasNode?.text).toBe(
//                 expectedEntity.entityAliasNodeText,
//               );
//             });
//           });
//         });
//       },
//     );
//   });

//   describe("Internal module imports from export map", () => {
//     const internalImports = [
//       // {
//       //   description: "Extracts an internal module import",
//       //   currentFilePath: "/project/core/utils.py",
//       //   sourceCode: "from my_module import my_function",
//       //   exportMap: {
//       //     "/project/core/my_module.py": {
//       //       filePath: "/project/core/my_module.py",
//       //       language: Python.name,
//       //       couldNotProcess: false,
//       //       exportStatements: [],
//       //     },
//       //   } as ExportMap,
//       //   expected: [
//       //     {
//       //       type: pythonFromModule,
//       //       statementNodeText: "from my_module import my_function",
//       //       modules: [
//       //         {
//       //           source: "my_module",
//       //           isWildcard: false,
//       //           isExternal: false,
//       //           resolvedSource: "/project/core/my_module.py",
//       //           moduleIdentifierNodeText: "my_module",
//       //           moduleAliasNodeText: undefined,
//       //           entities: [
//       //             {
//       //               type: unknownEntity,
//       //               entityNodeText: "my_function",
//       //               entityIdentifierNodeText: "my_function",
//       //               entityAliasNodeText: undefined,
//       //             },
//       //           ],
//       //         },
//       //       ],
//       //     },
//       //   ],
//       // },
//       // {
//       //   description: "Extracts an internal aliased module import",
//       //   currentFilePath: "/project/core/utils.py",
//       //   sourceCode: "from my_module import my_function as mfc",
//       //   exportMap: {
//       //     "/project/core/my_module.py": {
//       //       filePath: "/project/core/my_module.py",
//       //       language: Python.name,
//       //       couldNotProcess: false,
//       //       exportStatements: [],
//       //     },
//       //   } as ExportMap,
//       //   expected: [
//       //     {
//       //       type: pythonFromModule,
//       //       statementNodeText: "from my_module import my_function as mfc",
//       //       modules: [
//       //         {
//       //           source: "my_module",
//       //           isWildcard: false,
//       //           isExternal: false,
//       //           resolvedSource: "/project/core/my_module.py",
//       //           moduleIdentifierNodeText: "my_module",
//       //           moduleAliasNodeText: undefined,
//       //           entities: [
//       //             {
//       //               type: unknownEntity,
//       //               entityNodeText: "my_function as mfc",
//       //               entityIdentifierNodeText: "my_function",
//       //               entityAliasNodeText: "mfc",
//       //             },
//       //           ],
//       //         },
//       //       ],
//       //     },
//       //   ],
//       // },
//       {
//         description: "Extracts a a sub internal module import",
//         currentFilePath: "/project/core/utils.py",
//         sourceCode: "from core import my_module",
//         exportMap: {
//           "/project/core/my_module.py": {
//             filePath: "/project/core/my_module.py",
//             language: Python.name,
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//           "/project/core.py": {
//             filePath: "/project/core/__init__.py",
//             language: Python.name,
//             couldNotProcess: false,
//             exportStatements: [],
//           },
//         } as ExportMap,
//         expected: [
//           {
//             type: pythonFromModule,
//             statementNodeText: "from core import my_module",
//             modules: [
//               {
//                 source: "core",
//                 isWildcard: true,
//                 isExternal: false,
//                 resolvedSource: "/project/core/my_module.py",
//                 moduleIdentifierNodeText: "my_module",
//                 moduleAliasNodeText: undefined,
//                 entities: [],
//               },
//             ],
//           },
//         ],
//       },
//     ];

//     it.each(internalImports)(
//       "$description",
//       ({ sourceCode, exportMap, expected, currentFilePath }) => {
//         const tree = parser.parse(sourceCode);
//         const importStatements = extractor.run(
//           path.join(currentFilePath),
//           tree.rootNode,
//           exportMap,
//         );

//         expect(importStatements).toHaveLength(expected.length);
//         importStatements.forEach((importStmt, index) => {
//           expect(importStmt.type).toBe(expected[index].type);
//           expect(importStmt.statementNode.text).toBe(
//             expected[index].statementNodeText,
//           );
//           expect(importStmt.modules).toHaveLength(
//             expected[index].modules.length,
//           );

//           importStmt.modules.forEach((importedModule, moduleIndex) => {
//             const expectedModule = expected[index].modules[moduleIndex];

//             expect(importedModule.source).toBe(expectedModule.source);
//             expect(importedModule.isWildcard).toBe(expectedModule.isWildcard);
//             expect(importedModule.isExternal).toBe(expectedModule.isExternal);
//             expect(importedModule.resolvedSource).toBe(
//               expectedModule.resolvedSource,
//             );
//             expect(importedModule.moduleIdentifierNode.text).toBe(
//               expectedModule.moduleIdentifierNodeText,
//             );
//             expect(importedModule.moduleAliasNode?.text).toBe(
//               expectedModule.moduleAliasNodeText,
//             );
//             expect(importedModule.entities).toHaveLength(
//               expectedModule.entities.length,
//             );
//             importedModule.entities.forEach((entity, entityIndex) => {
//               const expectedEntity = expectedModule.entities[entityIndex];

//               expect(entity.type).toBe(expectedEntity.type);
//               expect(entity.entityNode.text).toBe(
//                 expectedEntity.entityNodeText,
//               );
//               expect(entity.entityIdentifierNode.text).toBe(
//                 expectedEntity.entityIdentifierNodeText,
//               );
//               expect(entity.entityAliasNode?.text).toBe(
//                 expectedEntity.entityAliasNodeText,
//               );
//             });
//           });
//         });
//       },
//     );
//   });
// });
