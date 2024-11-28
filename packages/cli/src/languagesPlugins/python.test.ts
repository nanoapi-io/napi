import { describe, it, expect } from "vitest";
import PythonPlugin from "./python";

describe("Should get imports properly", () => {
  const entryPointPath = "api/index.py";
  const plugin = new PythonPlugin(entryPointPath);

  it.each([
    {
      sourceCode: `
      from module import foo
      `,
      node: `from module import foo`,
      identifiers: [
        {
          node: "foo",
          identifierNode: "foo",
          aliasNode: undefined,
        },
      ],
    },
    {
      sourceCode: `
      from module import foo, bar
      `,
      node: `from module import foo, bar`,
      identifiers: [
        {
          node: "foo",
          identifierNode: "foo",
          aliasNode: undefined,
        },
        {
          node: "bar",
          identifierNode: "bar",
          aliasNode: undefined,
        },
      ],
    },
    {
      sourceCode: `
      from module import foo as f
      `,
      node: `from module import foo as f`,
      identifiers: [
        {
          node: "foo as f",
          identifierNode: "foo",
          aliasNode: "f",
        },
      ],
    },
    {
      sourceCode: `
      from module import foo as f, bar as b
      `,
      node: `from module import foo as f, bar as b`,
      identifiers: [
        {
          node: "foo as f",
          identifierNode: "foo",
          aliasNode: "f",
        },
        {
          node: "bar as b",
          identifierNode: "bar",
          aliasNode: "b",
        },
      ],
    },
    {
      sourceCode: `
      from module import foo as f, bar
      `,
      node: `from module import foo as f, bar`,
      identifiers: [
        {
          node: "foo as f",
          identifierNode: "foo",
          aliasNode: "f",
        },
        {
          node: "bar",
          identifierNode: "bar",
          aliasNode: undefined,
        },
      ],
    },
  ])("Should parse import", ({ sourceCode, node, identifiers }) => {
    const tree = plugin.parser.parse(sourceCode);
    const imports = plugin.getImports(entryPointPath, tree.rootNode);

    expect(imports.length).toBe(1);
    expect(imports[0].source).toBe("");
    expect(imports[0].node.text).toBe(node);
    expect(imports[0].isExternal).toBe(true);

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
  });

  it("Should parse no import", () => {
    const sourceCode = `
    foo = "bar"
    `;

    const tree = plugin.parser.parse(sourceCode);
    const imports = plugin.getImports(entryPointPath, tree.rootNode);

    expect(imports.length).toBe(0);
  });
});

describe("Should get exports properly", () => {
  const entryPointPath = "api/index.py";

  const plugin = new PythonPlugin(entryPointPath);

  it.each([
    {
      sourceCode: `a = "a"`,
      node: `a = "a"`,
      identifiers: [
        {
          node: `a = "a"`,
          identifierNode: `a`,
        },
      ],
    },
    {
      sourceCode: `
a = {
  "a": 1,
  "b": 2,
}
`,
      node: `a = {
  "a": 1,
  "b": 2,
}`,
      identifiers: [
        {
          node: `a = {
  "a": 1,
  "b": 2,
}`,
          identifierNode: `a`,
        },
      ],
    },
    {
      sourceCode: `a = [1, 2, 3]`,
      node: `a = [1, 2, 3]`,
      identifiers: [
        {
          node: `a = [1, 2, 3]`,
          identifierNode: `a`,
        },
      ],
    },
    {
      sourceCode: `a = test()`,
      node: `a = test()`,
      identifiers: [
        {
          node: `a = test()`,
          identifierNode: `a`,
        },
      ],
    },
    {
      sourceCode: `a = Test().test()`,
      node: `a = Test().test()`,
      identifiers: [
        {
          node: `a = Test().test()`,
          identifierNode: `a`,
        },
      ],
    },
  ])(
    "Should parse expression assignement as export",
    ({ sourceCode, node, identifiers }) => {
      const tree = plugin.parser.parse(sourceCode);
      const exports = plugin.getExports(tree.rootNode);

      expect(exports.length).toBe(1);
      expect(exports[0].type).toBe("export");
      expect(exports[0].node.text).toBe(node);
      expect(exports[0].identifiers.length).toBe(identifiers.length);

      for (let i = 0; i < identifiers.length; i++) {
        expect(exports[0].identifiers[i].node.text).toBe(identifiers[i].node);
        expect(exports[0].identifiers[i].identifierNode.text).toBe(
          identifiers[i].identifierNode,
        );
        expect(exports[0].identifiers[i].aliasNode).toBeUndefined();
      }
    },
  );

  it("Should parse multiple expression assignement as exports", () => {
    const sourceCode = `
a = "a"
b = "b"
`;

    const tree = plugin.parser.parse(sourceCode);
    const exports = plugin.getExports(tree.rootNode);

    expect(exports.length).toBe(2);
    expect(exports[0].type).toBe("export");
    expect(exports[0].node.text).toBe(`a = "a"`);
    expect(exports[0].identifiers.length).toBe(1);
    expect(exports[0].identifiers[0].node.text).toBe(`a = "a"`);
    expect(exports[0].identifiers[0].identifierNode.text).toBe(`a`);

    expect(exports[1].type).toBe("export");
    expect(exports[1].node.text).toBe(`b = "b"`);
    expect(exports[1].identifiers.length).toBe(1);
    expect(exports[1].identifiers[0].node.text).toBe(`b = "b"`);
    expect(exports[1].identifiers[0].identifierNode.text).toBe(`b`);
  });

  it.each([
    {
      sourceCode: `
class Foo:
  pass
`,
      node: `class Foo:
  pass`,
      identifiers: [
        {
          node: `class Foo:
  pass`,
          identifierNode: `Foo`,
          alias: undefined,
        },
      ],
    },
    {
      sourceCode: `
class Foo(Bar):
  pass
`,
      node: `class Foo(Bar):
  pass`,
      identifiers: [
        {
          node: `class Foo(Bar):
  pass`,
          identifierNode: `Foo`,
          alias: undefined,
        },
      ],
    },
    {
      sourceCode: `
class Foo:
  a = "a"
  def test(self, a):
    return a
`,
      node: `class Foo:
  a = "a"
  def test(self, a):
    return a`,
      identifiers: [
        {
          node: `class Foo:
  a = "a"
  def test(self, a):
    return a`,
          identifierNode: `Foo`,
          alias: undefined,
        },
      ],
    },
  ])(
    "Should parse class definition as export",
    ({ sourceCode, node, identifiers }) => {
      const tree = plugin.parser.parse(sourceCode);
      const exports = plugin.getExports(tree.rootNode);

      expect(exports.length).toBe(1);
      expect(exports[0].type).toBe("export");
      expect(exports[0].node.text).toBe(node);
      expect(exports[0].identifiers.length).toBe(identifiers.length);

      for (let i = 0; i < identifiers.length; i++) {
        expect(exports[0].identifiers[i].node.text).toBe(identifiers[i].node);
        expect(exports[0].identifiers[i].identifierNode.text).toBe(
          identifiers[i].identifierNode,
        );
        expect(exports[0].identifiers[i].aliasNode).toBeUndefined();
      }
    },
  );

  it("Should parse multiple class definitions as exports", () => {
    const sourceCode = `
class Foo:
  pass

class Bar:
  pass
`;

    const tree = plugin.parser.parse(sourceCode);
    const exports = plugin.getExports(tree.rootNode);

    expect(exports.length).toBe(2);
    expect(exports[0].type).toBe("export");
    expect(exports[0].node.text).toBe(`class Foo:
  pass`);
    expect(exports[0].identifiers.length).toBe(1);
    expect(exports[0].identifiers[0].node.text).toBe(`class Foo:
  pass`);
    expect(exports[0].identifiers[0].identifierNode.text).toBe(`Foo`);

    expect(exports[1].type).toBe("export");
    expect(exports[1].node.text).toBe(`class Bar:
  pass`);
    expect(exports[1].identifiers.length).toBe(1);
    expect(exports[1].identifiers[0].node.text).toBe(`class Bar:
  pass`);
    expect(exports[1].identifiers[0].identifierNode.text).toBe(`Bar`);
  });

  it.each([
    {
      sourceCode: `
def foo():
  pass
`,
      node: `def foo():
  pass`,
      identifiers: [
        {
          node: `def foo():
  pass`,
          identifierNode: `foo`,
          alias: undefined,
        },
      ],
    },
    {
      sourceCode: `
def foo(bar):
  pass
`,
      node: `def foo(bar):
  pass`,
      identifiers: [
        {
          node: `def foo(bar):
  pass`,
          identifierNode: `foo`,
          alias: undefined,
        },
      ],
    },
  ])(
    "Should parse func definition as export",
    ({ sourceCode, node, identifiers }) => {
      const tree = plugin.parser.parse(sourceCode);
      const exports = plugin.getExports(tree.rootNode);

      expect(exports.length).toBe(1);
      expect(exports[0].type).toBe("export");
      expect(exports[0].node.text).toBe(node);
      expect(exports[0].identifiers.length).toBe(identifiers.length);

      for (let i = 0; i < identifiers.length; i++) {
        expect(exports[0].identifiers[i].node.text).toBe(identifiers[i].node);
        expect(exports[0].identifiers[i].identifierNode.text).toBe(
          identifiers[i].identifierNode,
        );
        expect(exports[0].identifiers[i].aliasNode).toBeUndefined();
      }
    },
  );

  it("Should parse multiple func definitions as exports", () => {
    const sourceCode = `
def foo(f):
  pass

def bar(b):
  pass
`;

    const tree = plugin.parser.parse(sourceCode);
    const exports = plugin.getExports(tree.rootNode);

    expect(exports.length).toBe(2);
    expect(exports[0].type).toBe("export");
    expect(exports[0].node.text).toBe(`def foo(f):
  pass`);
    expect(exports[0].identifiers.length).toBe(1);
    expect(exports[0].identifiers[0].node.text).toBe(`def foo(f):
  pass`);
    expect(exports[0].identifiers[0].identifierNode.text).toBe(`foo`);

    expect(exports[1].type).toBe("export");
    expect(exports[1].node.text).toBe(`def bar(b):
  pass`);
    expect(exports[1].identifiers.length).toBe(1);
    expect(exports[1].identifiers[0].node.text).toBe(`def bar(b):
  pass`);
    expect(exports[1].identifiers[0].identifierNode.text).toBe(`bar`);
  });
});
