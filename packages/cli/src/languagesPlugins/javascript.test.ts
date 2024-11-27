import { describe, it, expect, beforeAll, afterAll } from "vitest";
import JavascriptPlugin from "./javascript";
import { DepExport } from "./types";
import os from "os";
import fs from "fs";
import path from "path";

describe("Should get imports properly", () => {
  const entryPointPath = "src/index.js";
  const javascriptPlugin = new JavascriptPlugin(entryPointPath, false);
  const typescriptPlugin = new JavascriptPlugin(entryPointPath, true);

  it.each([
    {
      sourceCode: `
      import foo from "module";
      `,
      plugin: javascriptPlugin,
      node: `import foo from "module";`,
      identifierNode: "foo",
    },
    {
      sourceCode: `
      import type Foo from "module";
      `,
      plugin: typescriptPlugin,
      node: `import type Foo from "module";`,
      identifierNode: "Foo",
    },
  ])(
    "Should parse default import",
    ({ sourceCode, plugin, node, identifierNode }) => {
      const tree = plugin.parser.parse(sourceCode);
      const imports = plugin.getImports(entryPointPath, tree.rootNode);

      expect(imports.length).toBe(1);
      expect(imports[0].source).toBe("");
      expect(imports[0].node.text).toBe(node);
      expect(imports[0].isExternal).toBe(true);
      expect(imports[0].identifiers.length).toBe(1);
      expect(imports[0].identifiers[0].type).toBe("default");
      expect(imports[0].identifiers[0].node.text).toBe(identifierNode);
      expect(imports[0].identifiers[0].identifierNode.text).toBe(
        identifierNode,
      );
      expect(imports[0].identifiers[0].aliasNode).toBeUndefined();
    },
  );

  it.each([
    {
      sourceCode: `
      import { a, b as c } from "module";
      `,
      plugin: javascriptPlugin,
      node: `import { a, b as c } from "module";`,
      identifiers: [
        {
          node: "a",
          identifierNode: "a",
          aliasNode: undefined,
        },
        {
          node: "b as c",
          identifierNode: "b",
          aliasNode: "c",
        },
      ],
    },
    {
      sourceCode: `
      import { type A, type B as C } from "module";
      `,
      plugin: typescriptPlugin,
      node: `import { type A, type B as C } from "module";`,
      identifiers: [
        {
          node: "type A",
          identifierNode: "A",
          aliasNode: undefined,
        },
        {
          node: "type B as C",
          identifierNode: "B",
          aliasNode: "C",
        },
      ],
    },
  ])(
    "Should parse named import",
    ({ sourceCode, plugin, node, identifiers }) => {
      const tree = plugin.parser.parse(sourceCode);
      const imports = plugin.getImports(entryPointPath, tree.rootNode);

      expect(imports.length).toBe(1);
      expect(imports[0].source).toBe("");
      expect(imports[0].isExternal).toBe(true);
      expect(imports[0].node.text).toBe(node);
      expect(imports[0].identifiers.length).toBe(identifiers.length);

      for (let i = 0; i < identifiers.length; i++) {
        expect(imports[0].identifiers[i].type).toBe("named");
        expect(imports[0].identifiers[i].node.text).toBe(identifiers[i].node);
        expect(imports[0].identifiers[i].identifierNode.text).toBe(
          identifiers[i].identifierNode,
        );
        expect(imports[0].identifiers[i].aliasNode?.text).toBe(
          identifiers[i].aliasNode,
        );
      }
    },
  );

  it.each([{ plugin: javascriptPlugin }, { plugin: typescriptPlugin }])(
    "Should parse namespace import",
    ({ plugin }) => {
      const sourceCode = `
    import * as ns from "module";
    `;

      const tree = plugin.parser.parse(sourceCode);
      const imports = plugin.getImports(entryPointPath, tree.rootNode);

      expect(imports.length).toBe(1);
      expect(imports[0].source).toBe("");
      expect(imports[0].isExternal).toBe(true);
      expect(imports[0].node.text).toBe(`import * as ns from "module";`);
      expect(imports[0].identifiers.length).toBe(1);
      expect(imports[0].identifiers[0].type).toBe("namespace");
      expect(imports[0].identifiers[0].node.text).toBe("* as ns");
      expect(imports[0].identifiers[0].identifierNode.text).toBe("ns");
      expect(imports[0].identifiers[0].aliasNode).toBeUndefined();
    },
  );

  it.each([
    {
      sourceCode: `
      import foo, { a, b as c } from "module";
      `,
      plugin: javascriptPlugin,
      node: `import foo, { a, b as c } from "module";`,
      identifiers: [
        {
          type: "named",
          node: "a",
          identifierNode: "a",
          aliasNode: undefined,
        },
        {
          type: "named",
          node: "b as c",
          identifierNode: "b",
          aliasNode: "c",
        },
        {
          type: "default",
          node: "foo",
          identifierNode: "foo",
          aliasNode: undefined,
        },
      ],
    },
    {
      sourceCode: `
      import type Foo, { type A, type B as C } from "module";
      `,
      plugin: typescriptPlugin,
      node: `import type Foo, { type A, type B as C } from "module";`,
      identifiers: [
        {
          type: "named",
          node: "type A",
          identifierNode: "A",
          aliasNode: undefined,
        },
        {
          type: "named",
          node: "type B as C",
          identifierNode: "B",
          aliasNode: "C",
        },
        {
          type: "default",
          // TODO there is a bug in the tree-sitter-typescript library.
          // the node here should be "type Foo" not "Foo"
          node: "Foo",
          identifierNode: "Foo",
          aliasNode: undefined,
        },
      ],
    },
  ])(
    "Should parse mixed default and named import",
    ({ sourceCode, plugin, node, identifiers }) => {
      const tree = plugin.parser.parse(sourceCode);
      const imports = plugin.getImports(entryPointPath, tree.rootNode);

      expect(imports.length).toBe(1);
      expect(imports[0].source).toBe("");
      expect(imports[0].isExternal).toBe(true);
      expect(imports[0].node.text).toBe(node);
      expect(imports[0].identifiers.length).toBe(identifiers.length);

      for (let i = 0; i < identifiers.length; i++) {
        expect(imports[0].identifiers[i].type).toBe(identifiers[i].type);
        expect(imports[0].identifiers[i].node.text).toBe(identifiers[i].node);
        expect(imports[0].identifiers[i].identifierNode.text).toBe(
          identifiers[i].identifierNode,
        );
        expect(imports[0].identifiers[i].aliasNode?.text).toBe(
          identifiers[i].aliasNode,
        );
      }
    },
  );

  it.each([{ plugin: javascriptPlugin }, { plugin: typescriptPlugin }])(
    "Should parse side effect import",
    ({ plugin }) => {
      const sourceCode = `
    import "module";
    `;

      const tree = plugin.parser.parse(sourceCode);
      const imports = plugin.getImports(entryPointPath, tree.rootNode);

      expect(imports.length).toBe(1);
      expect(imports[0].source).toBe("");
      expect(imports[0].node.text).toBe(`import "module";`);
      expect(imports[0].isExternal).toBe(true);
      expect(imports[0].identifiers.length).toBe(0);
    },
  );

  it.each([{ plugin: javascriptPlugin }, { plugin: typescriptPlugin }])(
    "Should parse no import",
    ({ plugin }) => {
      const sourceCode = `
    const foo = "bar";
    `;

      const tree = plugin.parser.parse(sourceCode);
      const imports = plugin.getImports(entryPointPath, tree.rootNode);

      expect(imports.length).toBe(0);
    },
  );
});

describe("Should get exports properly", () => {
  const entryPointPath = "src/index.js";

  const javascriptPlugin = new JavascriptPlugin(entryPointPath, false);
  const typescriptPlugin = new JavascriptPlugin(entryPointPath, true);

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      export default function foo() {}
      `,
      node: `export default function foo() {}`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      export default function() {};
      `,
      node: `export default function() {};`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      export default class Foo{}
      `,
      node: `export default class Foo{}`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      export default { a, b, c };
      `,
      node: `export default { a, b, c };`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
      export default type A = "a";
      `,
      node: `export default type A = "a";`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
      export default type A = { a: string, b: number };
      `,
      node: `export default type A = { a: string, b: number };`,
    },
  ])("Should parse default export", ({ plugins, sourceCode, node }) => {
    plugins.forEach((plugin) => {
      const tree = plugin.parser.parse(sourceCode);
      const exports = plugin.getExports(tree.rootNode);

      expect(exports.length).toBe(1);
      expect(exports[0].type).toBe("default");
      expect(exports[0].node.text).toBe(node);
      expect(exports[0].identifiers.length).toBe(0);
    });
  });

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      const foo = 'bar';
      export default foo;
      `,
      node: `export default foo;`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      let bar = 42;
      export default bar;
      `,
      node: `export default bar;`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      const obj = { a: 1, b: 2 };
      export default obj;
      `,
      node: `export default obj;`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
      type MyType = { a: string };
      export default MyType;
      `,
      node: `export default MyType;`,
    },
  ])(
    "Should parse default export from a variable",
    ({ plugins, sourceCode, node }) => {
      plugins.forEach((plugin) => {
        const tree = plugin.parser.parse(sourceCode);
        const exports = plugin.getExports(tree.rootNode);

        expect(exports.length).toBe(1);
        expect(exports[0].type).toBe("default");
        expect(exports[0].node.text).toBe(node);
        expect(exports[0].identifiers.length).toBe(0);
      });
    },
  );

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
        export { a, b as c };
      `,
      node: `export { a, b as c };`,
      identifiers: [
        { node: "a", alias: undefined },
        { node: "b as c", alias: "c" },
      ],
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
        export { x, y as z, m };
      `,
      node: `export { x, y as z, m };`,
      identifiers: [
        { node: "x", alias: undefined },
        { node: "y as z", alias: "z" },
        { node: "m", alias: undefined },
      ],
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
        export { type X, type Y as Z, type M };
      `,
      node: `export { type X, type Y as Z, type M };`,
      identifiers: [
        { node: "type X", alias: undefined },
        { node: "type Y as Z", alias: "Z" },
        { node: "type M", alias: undefined },
      ],
    },
  ])(
    "Should parse named export",
    ({ plugins, sourceCode, node, identifiers }) => {
      plugins.forEach((plugin) => {
        const tree = plugin.parser.parse(sourceCode);
        const exports = plugin.getExports(tree.rootNode);

        expect(exports.length).toBe(1);
        expect(exports[0].type).toBe("named");
        expect(exports[0].node.text).toBe(node);
        expect(exports[0].identifiers.length).toBe(identifiers.length);

        for (let i = 0; i < identifiers.length; i++) {
          expect(exports[0].identifiers[i].node.text).toBe(identifiers[i].node);
          expect(exports[0].identifiers[i].aliasNode?.text).toBe(
            identifiers[i].alias,
          );
        }
      });
    },
  );

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: "export var foo = 42;",
      expectedNode: "export var foo = 42;",
      identifier: "foo",
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: "export let foo = 42;",
      expectedNode: "export let foo = 42;",
      identifier: "foo",
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: "export const foo = 42;",
      expectedNode: "export const foo = 42;",
      identifier: "foo",
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: "export function foo() {}",
      expectedNode: "export function foo() {}",
      identifier: "foo",
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: "export class foo {}",
      expectedNode: "export class foo {}",
      identifier: "foo",
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: "export type A = { a: string, b: number };",
      expectedNode: "export type A = { a: string, b: number };",
      identifier: "A",
    },
  ])(
    "Should parse inline export",
    ({ plugins, sourceCode, expectedNode, identifier }) => {
      plugins.forEach((plugin) => {
        const tree = plugin.parser.parse(sourceCode);
        const exports = plugin.getExports(tree.rootNode);

        expect(exports.length).toBe(1);
        expect(exports[0].type).toBe("named");
        expect(exports[0].node.text).toBe(expectedNode);
        expect(exports[0].identifiers.length).toBe(1);
        expect(exports[0].identifiers[0].node.text).toBe(identifier);
        expect(exports[0].identifiers[0].aliasNode).toBeUndefined();
      });
    },
  );

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      export default function foo() {};
      export { a, b as c };
      `,
      expectedExports: [
        {
          type: "default",
          nodeText: "export default function foo() {}",
          identifiers: [],
        },
        {
          type: "named",
          nodeText: "export { a, b as c };",
          identifiers: [
            { node: "a", alias: undefined },
            { node: "b as c", alias: "c" },
          ],
        },
      ],
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      export default class Foo {};
      export { x, y as z };
      `,
      expectedExports: [
        {
          type: "default",
          nodeText: "export default class Foo {}",
          identifiers: [],
        },
        {
          type: "named",
          nodeText: "export { x, y as z };",
          identifiers: [
            { node: "x", alias: undefined },
            { node: "y as z", alias: "z" },
          ],
        },
      ],
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
      export default type A = { a: string, b: number };
      export { type X, type Y as Z };
      `,
      expectedExports: [
        {
          type: "default",
          nodeText: "export default type A = { a: string, b: number };",
          identifiers: [],
        },
        {
          type: "named",
          nodeText: "export { type X, type Y as Z };",
          identifiers: [
            { node: "type X", alias: undefined },
            { node: "type Y as Z", alias: "Z" },
          ],
        },
      ],
    },
  ])(
    "Should parse mixed default and named export",
    ({ plugins, sourceCode, expectedExports }) => {
      plugins.forEach((plugin) => {
        const tree = plugin.parser.parse(sourceCode);
        const exports = plugin.getExports(tree.rootNode);

        expect(exports.length).toBe(expectedExports.length);

        expectedExports.forEach((expectedExport, index) => {
          expect(exports[index].type).toBe(expectedExport.type);
          expect(exports[index].node.text.trim()).toBe(
            expectedExport.nodeText.trim(),
          );

          // Validate identifiers
          expect(exports[index].identifiers.length).toBe(
            expectedExport.identifiers.length,
          );

          for (let i = 0; i < expectedExport.identifiers.length; i++) {
            expect(exports[index].identifiers[i].node.text).toBe(
              expectedExport.identifiers[i].node,
            );
            expect(exports[index].identifiers[i].aliasNode?.text).toBe(
              expectedExport.identifiers[i].alias,
            );
          }
        });
      });
    },
  );

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      const foo = "bar";
      `,
      expectedExportCount: 0,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
      let bar = 42;
      `,
      expectedExportCount: 0,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
      type MyType = { a: string };
      `,
      expectedExportCount: 0,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
      enum MyEnum { A, B, C }
      `,
      expectedExportCount: 0,
    },
  ])(
    "Should parse no export",
    ({ plugins, sourceCode, expectedExportCount }) => {
      plugins.forEach((plugin) => {
        const tree = plugin.parser.parse(sourceCode);
        const exports = plugin.getExports(tree.rootNode);

        expect(exports.length).toBe(expectedExportCount);
      });
    },
  );
});

describe("Should cleanup invalid imports", () => {
  let tempDir: string;

  const exportFiles = [
    {
      isTypescript: false,
      name: "export1.js",
      sourceCode: `
      export default function foo() {};
      export { a, b as c };
      `,
      exports: [] as DepExport[],
    },
    {
      isTypescript: false,
      name: "export2.js",
      sourceCode: `
      export default function bar() {};
      export { d, e as f };
      `,
      exports: [] as DepExport[],
    },
    {
      isTypescript: false,
      name: "export3.js",
      sourceCode: `
      export { g, h as i };
      `,
      exports: [] as DepExport[],
    },
    {
      isTypescript: false,
      name: "export4.js",
      sourceCode: ``,
      exports: [] as DepExport[],
    },
    {
      isTypescript: true,
      name: "export1.ts",
      sourceCode: `
      export default type Foo = { a: string, b: number };
      export { type A, type B as C };
      `,
      exports: [] as DepExport[],
    },
    {
      isTypescript: true,
      name: "export2.ts",
      sourceCode: `
      export default type Bar = { a: string, b: number };
      export { type D, type E as F };
      `,
      exports: [] as DepExport[],
    },
    {
      isTypescript: true,
      name: "export3.ts",
      sourceCode: `
      export { type G, type H as I };
      `,
      exports: [] as DepExport[],
    },
    {
      isTypescript: true,
      name: "export4.ts",
      sourceCode: ``,
      exports: [] as DepExport[],
    },
  ];

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));
    fs.mkdirSync(path.join(tempDir, "src-js"));
    fs.mkdirSync(path.join(tempDir, "src-ts"));

    exportFiles.forEach((exportFile) => {
      const exportPath = path.join(
        tempDir,
        exportFile.isTypescript ? "src-ts" : "src-js",
        exportFile.name,
      );
      fs.writeFileSync(exportPath, exportFile.sourceCode);

      const tree = new JavascriptPlugin(
        exportPath,
        exportFile.isTypescript,
      ).parser.parse(exportFile.sourceCode);
      const exports = new JavascriptPlugin(
        exportPath,
        exportFile.isTypescript,
      ).getExports(tree.rootNode);
      exportFile.exports = exports;
    });
  });

  afterAll(() => {
    // Cleanup the temporary directory after each test
    fs.rmSync(tempDir, { recursive: true });
  });

  it.each([
    {
      isTypescript: false,
      sourceCode: `
import foo, { a, c as c_n, z } from "./export1";
import barbar from "./export2";
import foofoo from "./export3";
import foobar from "./export4";

foo();
a();
c_n();
z();
barbar();
foofoo();
foobar();
`,
      expectedSourceCode: `
import foo, { a, c as c_n,  } from "./export1";
import barbar from "./export2";



foo();
a();
c_n();
;
barbar();
;
;
`,
    },
    {
      isTypescript: true,
      sourceCode: `
import Foo, { A, C as C_N, Z } from "./export1";
import BarBar from "./export2";
import FooFoo from "./export3";
import FooBar from "./export4";

let foo: Foo;
let a: A;
let c_n: C_N;
let z: Z;
let barbar: BarBar;
let foofoo: FooFoo;
let foobar: FooBar;
`,
      expectedSourceCode: `
import Foo, { A, C as C_N,  } from "./export1";
import BarBar from "./export2";



let foo: Foo;
let a: A;
let c_n: C_N;
let z: ;
let barbar: BarBar;
let foofoo: ;
let foobar: ;
`,
    },
  ])(
    "Should cleanup invalid imports for javascript",
    ({ isTypescript, sourceCode, expectedSourceCode }) => {
      const exportMap = new Map<string, DepExport[]>();
      const filteredExportFiles = exportFiles.filter(
        (exportFile) => exportFile.isTypescript === isTypescript,
      );

      const srcExt = isTypescript ? "ts" : "js";

      filteredExportFiles.forEach((exportFile) => {
        const exportFilePath = path.join(
          tempDir,
          `src-${srcExt}`,
          exportFile.name,
        );
        exportMap.set(exportFilePath, exportFile.exports);
      });

      const entryPointPath = path.join(
        tempDir,
        `src-${srcExt}`,
        `index.${srcExt}`,
      );

      const javascriptPlugin = new JavascriptPlugin(entryPointPath, false);

      const newSourceCode = javascriptPlugin.cleanupInvalidImports(
        entryPointPath,
        sourceCode,
        exportMap,
      );

      expect(newSourceCode).toBe(expectedSourceCode);
    },
  );
});

describe("Should cleanup unused imports", () => {
  const javascriptPlugin = new JavascriptPlugin("src/index.js", false);
  const typescriptPlugin = new JavascriptPlugin("src/index.js", true);

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `import { foo, bar } from "./moduleA";`,
      expectedSourceCode: ``,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `import foo from "./moduleB";`,
      expectedSourceCode: ``,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `import { foo, bar }, foobar from "./moduleB";`,
      expectedSourceCode: ``,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `import { foo, bar } from "./moduleA";
import foobar from "./moduleB";
`,
      expectedSourceCode: `

`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `import { type Foo, type Bar } from "./moduleA";`,
      expectedSourceCode: ``,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `import type Foo from "./moduleB";`,
      expectedSourceCode: ``,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `import { type Foo, type Bar }, type FooBar from "./moduleB";`,
      expectedSourceCode: ``,
    },
  ])(
    "Should remove completely unused imports",
    ({ plugins, sourceCode, expectedSourceCode }) => {
      plugins.forEach((plugin) => {
        const updatedSourceCode = plugin.cleanupUnusedImports(
          "src/index.js",
          sourceCode,
        );

        expect(updatedSourceCode).toBe(expectedSourceCode);
      });
    },
  );

  it.each([javascriptPlugin, typescriptPlugin])(
    "Should retain side-effect imports",
    (plugin) => {
      const sourceCode = `
import "side-effect-only";
`;

      const updatedSourceCode = plugin.cleanupUnusedImports(
        "src/index.js",
        sourceCode,
      );

      expect(updatedSourceCode).toBe(sourceCode);
    },
  );

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
import { foo, bar } from "./moduleA";
foo();
`,
      expectedSourceCode: `
import { foo,  } from "./moduleA";
foo();
`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
import { foo, bar } from "./moduleA";
bar();
`,
      expectedSourceCode: `
import { , bar } from "./moduleA";
bar();
`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
import { type Foo, type Bar } from "./moduleA";
let a: Foo;
`,
      expectedSourceCode: `
import { type Foo,  } from "./moduleA";
let a: Foo;
`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
import { type Foo, type Bar } from "./moduleA";
let a: Bar;
`,
      expectedSourceCode: `
import { , type Bar } from "./moduleA";
let a: Bar;
`,
    },
  ])(
    "Should handle partially unused named imports",
    ({ plugins, sourceCode, expectedSourceCode }) => {
      plugins.forEach((plugin) => {
        const updatedSourceCode = plugin.cleanupUnusedImports(
          "src/index.js",
          sourceCode,
        );
        expect(updatedSourceCode).toBe(expectedSourceCode);
      });
    },
  );

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
import defaultExport from "./moduleA";
import { foo } from "./moduleB";
foo();
`,
      expectedSourceCode: `
import { foo } from "./moduleB";
foo();
`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
import type DefaultExport from "./moduleA";
import { foo } from "./moduleB";
foo();
    `,
      expectedSourceCode: `
import { foo } from "./moduleB";
foo();
`,
    },
  ])(
    "Should handle unused default imports",
    ({ plugins, sourceCode, expectedSourceCode }) => {
      plugins.forEach((plugin) => {
        const updatedSourceCode = plugin.cleanupUnusedImports(
          "src/index.js",
          sourceCode,
        );

        expect(updatedSourceCode.trim()).toBe(expectedSourceCode.trim());
      });
    },
  );

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
import { foo as f, bar } from "./moduleA";
f();
`,
      expectedSourceCode: `
import { foo as f,  } from "./moduleA";
f();
`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
import { foo as f, bar } from "./moduleA";
bar();
`,
      expectedSourceCode: `
import { , bar } from "./moduleA";
bar();
`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
import { type Foo as F, type Bar } from "./moduleA";
let a: F;
`,
      expectedSourceCode: `
import { type Foo as F,  } from "./moduleA";
let a: F;
`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
import { type Foo as F, type Bar } from "./moduleA";
let a: Bar;
`,
      expectedSourceCode: `
import { , type Bar } from "./moduleA";
let a: Bar;
`,
    },
  ])(
    "Should handle alias imports",
    ({ plugins, sourceCode, expectedSourceCode }) => {
      plugins.forEach((plugin) => {
        const updatedSourceCode = plugin.cleanupUnusedImports(
          "src/index.js",
          sourceCode,
        );

        expect(updatedSourceCode).toBe(expectedSourceCode);
      });
    },
  );

  it.each([
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
import { foo, bar } from "./moduleA";
import defaultExport from "./moduleB";
import "side-effect-only";
foo();
`,
      expectedSourceCode: `
import { foo,  } from "./moduleA";

import "side-effect-only";
foo();
`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
import { foo, bar } from "./moduleA";
import defaultExport from "./moduleB";
import "side-effect-only";
bar();
`,
      expectedSourceCode: `
import { , bar } from "./moduleA";

import "side-effect-only";
bar();
`,
    },
    {
      plugins: [javascriptPlugin, typescriptPlugin],
      sourceCode: `
import { foo, bar } from "./moduleA";
import defaultExport from "./moduleB";
import "side-effect-only";
defaultExport();
`,
      expectedSourceCode: `

import defaultExport from "./moduleB";
import "side-effect-only";
defaultExport();
`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
import { type Foo, type Bar } from "./moduleA";
import type FefaultExport from "./moduleB";
import "side-effect-only";
let a: Foo;
`,
      expectedSourceCode: `
import { type Foo,  } from "./moduleA";

import "side-effect-only";
let a: Foo;
`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
import { type Foo, type Bar } from "./moduleA";
import type DefaultExport from "./moduleB";
import "side-effect-only";
let a: Bar;
`,
      expectedSourceCode: `
import { , type Bar } from "./moduleA";

import "side-effect-only";
let a: Bar;
`,
    },
    {
      plugins: [typescriptPlugin],
      sourceCode: `
import { type Foo, type Bar } from "./moduleA";
import type DefaultExport from "./moduleB";
import "side-effect-only";
let a: DefaultExport;
`,
      expectedSourceCode: `

import type DefaultExport from "./moduleB";
import "side-effect-only";
let a: DefaultExport;
`,
    },
  ])(
    "Should cleanup unused imports",
    ({ plugins, sourceCode, expectedSourceCode }) => {
      plugins.forEach((plugin) => {
        const updatedSourceCode = plugin.cleanupUnusedImports(
          "src/index.js",
          sourceCode,
        );

        expect(updatedSourceCode).toBe(expectedSourceCode);
      });
    },
  );
});
