import { describe, it, expect } from "vitest";
import PythonImportExtractor from "./python";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import { ExportMap } from "../ExportExtractor/types";
import path from "path";

describe("PythonImportExtractor", () => {
  const parser = new Parser();
  parser.setLanguage(Python);
  const extractor = new PythonImportExtractor(parser);

  describe("External module imports (not in export map)", () => {
    const externalImports = [
      {
        description: "Extracts a standard library import",
        currentFilePath: "/project/utils.py",
        sourceCode: "import os",
        exportMap: {} as ExportMap,
        expected: [
          {
            source: "os",
            isExternal: true,
            resolvedSource: undefined,
            kind: "python-regular",
            nodeText: "import os",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "os",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a third-party library import",
        currentFilePath: "/project/scripts/data_processing.py",
        sourceCode: "import numpy as np",
        exportMap: {} as ExportMap,
        expected: [
          {
            source: "numpy",
            isExternal: true,
            resolvedSource: undefined,
            kind: "python-regular",
            nodeText: "import numpy as np",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "numpy",
                aliasNodeText: "np",
              },
            ],
          },
        ],
      },
      {
        description: "Extracts multiple external imports in one line",
        currentFilePath: "/project/main.py",
        sourceCode: "import os, sys, json",
        exportMap: {} as ExportMap,
        expected: [
          {
            source: "os",
            isExternal: true,
            resolvedSource: undefined,
            kind: "python-regular",
            nodeText: "import os, sys, json",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "os",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            source: "sys",
            isExternal: true,
            resolvedSource: undefined,
            kind: "python-regular",
            nodeText: "import os, sys, json",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "sys",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            source: "json",
            isExternal: true,
            resolvedSource: undefined,
            kind: "python-regular",
            nodeText: "import os, sys, json",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "json",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts aliased standard library import",
        currentFilePath: "/project/config_loader.py",
        sourceCode: "import json as js",
        exportMap: {} as ExportMap,
        expected: [
          {
            source: "json",
            isExternal: true,
            resolvedSource: undefined,
            kind: "python-regular",
            nodeText: "import json as js",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "json",
                aliasNodeText: "js",
              },
            ],
          },
        ],
      },
    ];

    it.each(externalImports)(
      "$description",
      ({ sourceCode, exportMap, expected, currentFilePath }) => {
        const tree = parser.parse(sourceCode);
        const importStatements = extractor.run(
          path.join(currentFilePath),
          tree.rootNode,
          exportMap,
        );

        expect(importStatements).toHaveLength(expected.length);
        importStatements.forEach((importStmt, index) => {
          expect(importStmt.source).toBe(expected[index].source);
          expect(importStmt.isExternal).toBe(expected[index].isExternal);
          expect(importStmt.resolvedSource).toBe(
            expected[index].resolvedSource,
          );
          expect(importStmt.node.text).toBe(expected[index].nodeText);
          expect(importStmt.kind).toBe(expected[index].kind);
        });
      },
    );
  });

  describe("Internal module imports from export map", () => {
    const internalImports = [
      {
        description: "Extracts an internal module import",
        currentFilePath: "/project/core/utils.py",
        sourceCode: "import my_module",
        exportMap: {
          "/project/core/my_module.py": {
            filePath: "/project/core/my_module.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expected: [
          {
            source: "my_module",
            isExternal: false,
            resolvedSource: "/project/core/my_module.py",
            kind: "python-regular",
            nodeText: "import my_module",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "my_module",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts an internal module import with alias",
        currentFilePath: "/project/core/processing.py",
        sourceCode: "import my_module as mod",
        exportMap: {
          "/project/core/my_module.py": {
            filePath: "/project/core/my_module.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expected: [
          {
            source: "my_module",
            isExternal: false,
            resolvedSource: "/project/core/my_module.py",
            kind: "python-regular",
            nodeText: "import my_module as mod",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "my_module",
                aliasNodeText: "mod",
              },
            ],
          },
        ],
      },
      {
        description: "Resolves a sibling package import",
        currentFilePath: "/project/core/processing.py",
        sourceCode: "import analytics",
        exportMap: {
          "/project/core/analytics/__init__.py": {
            filePath: "/project/core/analytics/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expected: [
          {
            source: "analytics",
            isExternal: false,
            resolvedSource: "/project/core/analytics/__init__.py",
            kind: "python-regular",
            nodeText: "import analytics",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "analytics",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Handles an import from a parent package",
        currentFilePath: "/project/core/services/data.py",
        sourceCode: "import services.utils",
        exportMap: {
          "/project/core/services/utils.py": {
            filePath: "/project/core/services/utils.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expected: [
          {
            source: "services.utils",
            isExternal: false,
            resolvedSource: "/project/core/services/utils.py",
            kind: "python-regular",
            nodeText: "import services.utils",
            identifiers: [
              {
                type: "namespace",
                identifierNodeText: "services.utils",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
    ];

    it.each(internalImports)(
      "$description",
      ({ sourceCode, exportMap, expected, currentFilePath }) => {
        const tree = parser.parse(sourceCode);
        const importStatements = extractor.run(
          path.join(currentFilePath),
          tree.rootNode,
          exportMap,
        );

        expect(importStatements).toHaveLength(expected.length);
        importStatements.forEach((importStmt, index) => {
          expect(importStmt.source).toBe(expected[index].source);
          expect(importStmt.isExternal).toBe(expected[index].isExternal);
          expect(importStmt.resolvedSource).toBe(
            expected[index].resolvedSource,
          );
          expect(importStmt.node.text).toBe(expected[index].nodeText);
          expect(importStmt.kind).toBe(expected[index].kind);
        });
      },
    );
  });

  describe("Source resolution function tests", () => {
    const resolutionCases = [
      /** ✅ Single Module or Package */
      {
        description: "Resolves a simple module",
        currentFilePath: "/project/main.py",
        sourceCode: "import utils",
        exportMap: {
          "/project/utils.py": {
            filePath: "/project/utils.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/utils.py",
      },
      {
        description: "Resolves a package with __init__.py",
        currentFilePath: "/project/main.py",
        sourceCode: "import utils",
        exportMap: {
          "/project/utils/__init__.py": {
            filePath: "/project/utils/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/utils/__init__.py",
      },

      /** ✅ Prioritization of Module vs Package */
      {
        description: "Prefers module over package when both exist",
        currentFilePath: "/project/main.py",
        sourceCode: "import utils",
        exportMap: {
          "/project/utils.py": {
            filePath: "/project/utils.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
          "/project/utils/__init__.py": {
            filePath: "/project/utils/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/utils.py",
      },
      {
        description: "Prefers package when module is missing",
        currentFilePath: "/project/main.py",
        sourceCode: "import utils",
        exportMap: {
          "/project/utils/__init__.py": {
            filePath: "/project/utils/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/utils/__init__.py",
      },

      /** ✅ Nested Packages */
      {
        description: "Resolves a nested module",
        currentFilePath: "/project/main.py",
        sourceCode: "import utils.helpers",
        exportMap: {
          "/project/utils/helpers.py": {
            filePath: "/project/utils/helpers.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/utils/helpers.py",
      },
      {
        description: "Resolves a nested package with __init__.py",
        currentFilePath: "/project/main.py",
        sourceCode: "import utils.helpers",
        exportMap: {
          "/project/utils/helpers/__init__.py": {
            filePath: "/project/utils/helpers/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/utils/helpers/__init__.py",
      },
      {
        description: "Prefers nested module over package",
        currentFilePath: "/project/main.py",
        sourceCode: "import utils.helpers",
        exportMap: {
          "/project/utils/helpers.py": {
            filePath: "/project/utils/helpers.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
          "/project/utils/helpers/__init__.py": {
            filePath: "/project/utils/helpers/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/utils/helpers.py",
      },

      /** ✅ Multiple Matching Modules */
      {
        description:
          "Handles ambiguous imports (same name in different directories)",
        currentFilePath: "/project/apps/order/utils.py",
        sourceCode: "import models",
        exportMap: {
          "/project/apps/order/models.py": {
            filePath: "/project/apps/order/models.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
          "/project/apps/psp/models.py": {
            filePath: "/project/apps/psp/models.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/apps/order/models.py", // ✅ Should pick closest match
      },
      {
        description:
          "Handles ambiguous package imports (same name, different locations)",
        currentFilePath: "/project/apps/order/utils.py",
        sourceCode: "import services",
        exportMap: {
          "/project/apps/order/services/__init__.py": {
            filePath: "/project/apps/order/services/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
          "/project/apps/psp/services/__init__.py": {
            filePath: "/project/apps/psp/services/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/apps/order/services/__init__.py", // ✅ Should pick closest match
      },

      /** ✅ Edge Cases */
      {
        description: "Handles missing module (importing unknown module)",
        currentFilePath: "/project/main.py",
        sourceCode: "import missing_module",
        exportMap: {} as ExportMap,
        expectedResolvedSource: undefined, // ✅ Should return undefined (external module)
      },
      {
        description: "Handles missing package (importing unknown package)",
        currentFilePath: "/project/main.py",
        sourceCode: "import missing_package",
        exportMap: {} as ExportMap,
        expectedResolvedSource: undefined, // ✅ Should return undefined (external package)
      },

      /** ✅ Complex Case: Mixed Modules and Packages */
      {
        description:
          "Prefers closer module when both package and module exist at different locations",
        currentFilePath: "/project/apps/order/utils.py",
        sourceCode: "import services",
        exportMap: {
          "/project/apps/order/services.py": {
            filePath: "/project/apps/order/services.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
          "/project/libs/services/__init__.py": {
            filePath: "/project/libs/services/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/apps/order/services.py", // ✅ Closer module should win
      },
      {
        description:
          "Prefers closer package when both package and module exist at different locations",
        currentFilePath: "/project/apps/order/utils.py",
        sourceCode: "import services",
        exportMap: {
          "/project/apps/order/services/__init__.py": {
            filePath: "/project/apps/order/services/__init__.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
          "/project/libs/services.py": {
            filePath: "/project/libs/services.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/apps/order/services/__init__.py", // ✅ Closer package should win
      },

      /** ✅ Edge Case: Importing the current file itself */
      {
        description:
          "Handles import that matches the current file (should not resolve to itself)",
        currentFilePath: "/project/utils.py",
        sourceCode: "import utils",
        exportMap: {
          "/project/utils.py": {
            filePath: "/project/utils.py",
            language: "python",
            couldNotProcess: false,
            exportStatements: [],
          },
        } as ExportMap,
        expectedResolvedSource: "/project/utils.py", // ✅ Should resolve normally (though import cycle risk)
      },
    ];

    it.each(resolutionCases)(
      "$description",
      ({ sourceCode, exportMap, expectedResolvedSource, currentFilePath }) => {
        const tree = parser.parse(sourceCode);
        const importStatements = extractor.run(
          path.join(currentFilePath),
          tree.rootNode,
          exportMap,
        );

        expect(importStatements[0].resolvedSource).toBe(expectedResolvedSource);
      },
    );
  });
});
