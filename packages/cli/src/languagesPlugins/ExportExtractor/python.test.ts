import { describe, it, expect } from "vitest";
import PythonExportExtractor from "./python";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import path from "path";

describe("PythonExportExtractor", () => {
  const parser = new Parser();
  parser.setLanguage(Python);
  const extractor = new PythonExportExtractor(parser);

  describe("should extract function exports", () => {
    const testCases = [
      {
        description: "Extracts a simple function export",
        sourceCode: "def my_function(): pass",
        expected: [
          {
            type: "named",
            nodeText: "def my_function(): pass",
            members: [
              {
                type: "function",
                nodeText: "def my_function(): pass",
                identifierNodeText: "my_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function with parameters",
        sourceCode: "def greet(name): return f'Hello {name}'",
        expected: [
          {
            type: "named",
            nodeText: "def greet(name): return f'Hello {name}'",
            members: [
              {
                type: "function",
                nodeText: "def greet(name): return f'Hello {name}'",
                identifierNodeText: "greet",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a multi-line function definition",
        sourceCode: `
def complex_function(
    param1,
    param2,
    param3
):
    return param1 + param2 + param3
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def complex_function(
    param1,
    param2,
    param3
):
    return param1 + param2 + param3
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def complex_function(
    param1,
    param2,
    param3
):
    return param1 + param2 + param3
    `.trim(),
                identifierNodeText: "complex_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function with type hints",
        sourceCode: "def add(x: int, y: int) -> int: return x + y",
        expected: [
          {
            type: "named",
            nodeText: "def add(x: int, y: int) -> int: return x + y",
            members: [
              {
                type: "function",
                nodeText: "def add(x: int, y: int) -> int: return x + y",
                identifierNodeText: "add",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts an async function",
        sourceCode: "async def fetch_data(): pass",
        expected: [
          {
            type: "named",
            nodeText: "async def fetch_data(): pass",
            members: [
              {
                type: "function",
                nodeText: "async def fetch_data(): pass",
                identifierNodeText: "fetch_data",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function with keyword-only arguments",
        sourceCode: `
def keyword_only(*, param1, param2):
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def keyword_only(*, param1, param2):
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def keyword_only(*, param1, param2):
    pass
`.trim(),
                identifierNodeText: "keyword_only",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function with *args and **kwargs",
        sourceCode: `
def flexible_function(*args, **kwargs):
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def flexible_function(*args, **kwargs):
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def flexible_function(*args, **kwargs):
    pass
`.trim(),
                identifierNodeText: "flexible_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function with default argument values",
        sourceCode: `
def default_values(param1="default", param2=42):
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def default_values(param1="default", param2=42):
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def default_values(param1="default", param2=42):
    pass
`.trim(),
                identifierNodeText: "default_values",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function with a docstring",
        sourceCode: `
def documented_function():
    """This function does something important."""
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def documented_function():
    """This function does something important."""
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def documented_function():
    """This function does something important."""
    pass
`.trim(),
                identifierNodeText: "documented_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },

      {
        description: "Extracts an outer function but ignores inner functions",
        sourceCode: `
def outer():
    def inner():
        pass
    `.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def outer():
    def inner():
        pass
    `.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def outer():
    def inner():
        pass
    `.trim(),
                identifierNodeText: "outer",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function with a decorator",
        sourceCode: `
@decorator
def decorated_function():
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
@decorator
def decorated_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
@decorator
def decorated_function():
    pass
`.trim(),
                identifierNodeText: "decorated_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function with multiple decorators",
        sourceCode: `
@decorator1
@decorator2
def multi_decorated():
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
@decorator1
@decorator2
def multi_decorated():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
@decorator1
@decorator2
def multi_decorated():
    pass
`.trim(),
                identifierNodeText: "multi_decorated",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts multiple function exports",
        sourceCode: `
def first_function():
    pass

def second_function():
    pass

def third_function():
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def first_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def first_function():
    pass
`.trim(),
                identifierNodeText: "first_function",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
def second_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def second_function():
    pass
`.trim(),
                identifierNodeText: "second_function",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
def third_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def third_function():
    pass
`.trim(),
                identifierNodeText: "third_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts multiple decorated functions",
        sourceCode: `
@decorator1
def first_function():
    pass

@decorator2
def second_function():
    pass

@decorator3
def third_function():
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
@decorator1
def first_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
@decorator1
def first_function():
    pass
`.trim(),
                identifierNodeText: "first_function",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
@decorator2
def second_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
@decorator2
def second_function():
    pass
`.trim(),
                identifierNodeText: "second_function",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
@decorator3
def third_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
@decorator3
def third_function():
    pass
`.trim(),
                identifierNodeText: "third_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a mix of decorated and non-decorated functions",
        sourceCode: `
@decorator
def decorated_function():
    pass

def normal_function():
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def normal_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def normal_function():
    pass
`.trim(),
                identifierNodeText: "normal_function",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
@decorator
def decorated_function():
    pass
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
@decorator
def decorated_function():
    pass
`.trim(),
                identifierNodeText: "decorated_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description:
          "Extracts a function inside an if __name__ == '__main__' block",
        sourceCode: `
if __name__ == "__main__":
    def foo: pass
`.trim(),
        expected: [],
      },
    ];

    it.each(testCases)("$description", (testCases) => {
      const tree = parser.parse(testCases.sourceCode);
      const exportStatements = extractor.run(
        path.join("project", "file.py"),
        tree.rootNode,
      );

      // check correct number of ExportStatement
      expect(exportStatements.length).toBe(testCases.expected.length);

      exportStatements.forEach((exportStatement, index) => {
        const expected = testCases.expected[index];
        // check correct type
        expect(exportStatement.type).toBe(expected.type);
        // check correct node content
        expect(exportStatement.node.text).toBe(expected.nodeText);

        exportStatement.members.forEach((member, index) => {
          const expectedMember = expected.members[index];
          // check correct type
          expect(member.type).toBe(expectedMember.type);
          // check correct node content
          expect(member.node.text).toBe(expectedMember.nodeText);
          // check correct identifier node content
          expect(member.identifierNode.text).toBe(
            expectedMember.identifierNodeText,
          );
          // check correct alias node content
          expect(member.aliasNode?.text).toBe(expectedMember.aliasNodeText);
        });
      });
    });
  });

  describe("should extract class exports", () => {
    const testCases = [
      {
        description: "Extracts a simple class export",
        sourceCode: "class MyClass: pass",
        expected: [
          {
            type: "named",
            nodeText: "class MyClass: pass",
            members: [
              {
                type: "class",
                nodeText: "class MyClass: pass",
                identifierNodeText: "MyClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with a docstring",
        sourceCode: `
class MyClass:
    """This is a class docstring."""
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class MyClass:
    """This is a class docstring."""
    pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class MyClass:
    """This is a class docstring."""
    pass
`.trim(),
                identifierNodeText: "MyClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with a constructor",
        sourceCode: `
class MyClass:
    def __init__(self, name):
        self.name = name
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class MyClass:
    def __init__(self, name):
        self.name = name
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class MyClass:
    def __init__(self, name):
        self.name = name
`.trim(),
                identifierNodeText: "MyClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with methods",
        sourceCode: `
class MyClass:
    def method1(self): pass
    def method2(self): pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class MyClass:
    def method1(self): pass
    def method2(self): pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class MyClass:
    def method1(self): pass
    def method2(self): pass
`.trim(),
                identifierNodeText: "MyClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with a base class (inheritance)",
        sourceCode: `
class ChildClass(ParentClass):
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
  class ChildClass(ParentClass):
    pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class ChildClass(ParentClass):
    pass
`.trim(),
                identifierNodeText: "ChildClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with multiple inheritance",
        sourceCode: `
class MultiParent(Parent1, Parent2):
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class MultiParent(Parent1, Parent2):
    pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class MultiParent(Parent1, Parent2):
    pass
`.trim(),
                identifierNodeText: "MultiParent",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with class-level variables",
        sourceCode: `
class MyClass:
    class_var = "some value"
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class MyClass:
    class_var = "some value"
    pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class MyClass:
    class_var = "some value"
    pass
`.trim(),
                identifierNodeText: "MyClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a decorated class",
        sourceCode: `
@decorator
class DecoratedClass:
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
@decorator
class DecoratedClass:
    pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
@decorator
class DecoratedClass:
    pass
`.trim(),
                identifierNodeText: "DecoratedClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with multiple decorators",
        sourceCode: `
@decorator1
@decorator2
class MultiDecorated:
    pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
@decorator1
@decorator2
class MultiDecorated:
    pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
@decorator1
@decorator2
class MultiDecorated:
    pass
`.trim(),
                identifierNodeText: "MultiDecorated",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts multiple class exports",
        sourceCode: `
class FirstClass: pass
class SecondClass: pass
class ThirdClass: pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class FirstClass: pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class FirstClass: pass
`.trim(),
                identifierNodeText: "FirstClass",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
class SecondClass: pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class SecondClass: pass
`.trim(),
                identifierNodeText: "SecondClass",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
class ThirdClass: pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class ThirdClass: pass
`.trim(),
                identifierNodeText: "ThirdClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts only top-level class, ignoring inner class",
        sourceCode: `
class OuterClass:
    class InnerClass:
        pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class OuterClass:
    class InnerClass:
        pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class OuterClass:
    class InnerClass:
        pass
`.trim(),
                identifierNodeText: "OuterClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with a metaclass",
        sourceCode: `
class Meta(type): pass

class CustomClass(metaclass=Meta): pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: "class Meta(type): pass",
            members: [
              {
                type: "class",
                nodeText: "class Meta(type): pass",
                identifierNodeText: "Meta",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: "class CustomClass(metaclass=Meta): pass",
            members: [
              {
                type: "class",
                nodeText: "class CustomClass(metaclass=Meta): pass",
                identifierNodeText: "CustomClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class with @classmethod and @staticmethod",
        sourceCode: `
class MyClass:
    @classmethod
    def class_method(cls): pass

    @staticmethod
    def static_method(): pass
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class MyClass:
    @classmethod
    def class_method(cls): pass

    @staticmethod
    def static_method(): pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class MyClass:
    @classmethod
    def class_method(cls): pass

    @staticmethod
    def static_method(): pass
`.trim(),
                identifierNodeText: "MyClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description:
          "Extracts a class inside an if __name__ == '__main__' block",
        sourceCode: `
if __name__ == "__main__":
    class MainClass: pass
`.trim(),
        expected: [],
      },
    ];

    it.each(testCases)("$description", (testCases) => {
      const tree = parser.parse(testCases.sourceCode);
      const exportStatements = extractor.run(
        path.join("project", "file.py"),
        tree.rootNode,
      );

      // check correct number of ExportStatement
      expect(exportStatements.length).toBe(testCases.expected.length);

      exportStatements.forEach((exportStatement, index) => {
        const expected = testCases.expected[index];
        // check correct type
        expect(exportStatement.type).toBe(expected.type);
        // check correct node content
        expect(exportStatement.node.text).toBe(expected.nodeText);

        exportStatement.members.forEach((member, index) => {
          const expectedMember = expected.members[index];
          // check correct type
          expect(member.type).toBe(expectedMember.type);
          // check correct node content
          expect(member.node.text).toBe(expectedMember.nodeText);
          // check correct identifier node content
          expect(member.identifierNode.text).toBe(
            expectedMember.identifierNodeText,
          );
          // check correct alias node content
          expect(member.aliasNode?.text).toBe(expectedMember.aliasNodeText);
        });
      });
    });
  });

  describe("should extract top-level assignment exports", () => {
    const testCases = [
      {
        description: "Extracts a simple variable assignment",
        sourceCode: "my_variable = 42",
        expected: [
          {
            type: "named",
            nodeText: "my_variable = 42",
            members: [
              {
                type: "variable",
                nodeText: "my_variable = 42",
                identifierNodeText: "my_variable",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a string assignment",
        sourceCode: 'greeting = "Hello, world!"',
        expected: [
          {
            type: "named",
            nodeText: 'greeting = "Hello, world!"',
            members: [
              {
                type: "variable",
                nodeText: 'greeting = "Hello, world!"',
                identifierNodeText: "greeting",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a constant-like assignment",
        sourceCode: "PI = 3.14159",
        expected: [
          {
            type: "named",
            nodeText: "PI = 3.14159",
            members: [
              {
                type: "variable",
                nodeText: "PI = 3.14159",
                identifierNodeText: "PI",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a list assignment",
        sourceCode: "numbers = [1, 2, 3, 4, 5]",
        expected: [
          {
            type: "named",
            nodeText: "numbers = [1, 2, 3, 4, 5]",
            members: [
              {
                type: "variable",
                nodeText: "numbers = [1, 2, 3, 4, 5]",
                identifierNodeText: "numbers",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a dictionary assignment",
        sourceCode: 'config = {"key": "value", "timeout": 300}',
        expected: [
          {
            type: "named",
            nodeText: 'config = {"key": "value", "timeout": 300}',
            members: [
              {
                type: "variable",
                nodeText: 'config = {"key": "value", "timeout": 300}',
                identifierNodeText: "config",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a tuple assignment",
        sourceCode: "coordinates = (10, 20)",
        expected: [
          {
            type: "named",
            nodeText: "coordinates = (10, 20)",
            members: [
              {
                type: "variable",
                nodeText: "coordinates = (10, 20)",
                identifierNodeText: "coordinates",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a function call assignment",
        sourceCode: "result = compute_value()",
        expected: [
          {
            type: "named",
            nodeText: "result = compute_value()",
            members: [
              {
                type: "variable",
                nodeText: "result = compute_value()",
                identifierNodeText: "result",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts an assignment with a lambda function",
        sourceCode: "double = lambda x: x * 2",
        expected: [
          {
            type: "named",
            nodeText: "double = lambda x: x * 2",
            members: [
              {
                type: "variable",
                nodeText: "double = lambda x: x * 2",
                identifierNodeText: "double",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a class instance assignment",
        sourceCode: "obj = MyClass()",
        expected: [
          {
            type: "named",
            nodeText: "obj = MyClass()",
            members: [
              {
                type: "variable",
                nodeText: "obj = MyClass()",
                identifierNodeText: "obj",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a module-level import assignment",
        sourceCode: "logger = logging.getLogger(__name__)",
        expected: [
          {
            type: "named",
            nodeText: "logger = logging.getLogger(__name__)",
            members: [
              {
                type: "variable",
                nodeText: "logger = logging.getLogger(__name__)",
                identifierNodeText: "logger",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a variable assignment using a ternary operator",
        sourceCode: "is_active = True if status == 'active' else False",
        expected: [
          {
            type: "named",
            nodeText: "is_active = True if status == 'active' else False",
            members: [
              {
                type: "variable",
                nodeText: "is_active = True if status == 'active' else False",
                identifierNodeText: "is_active",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Ignores an assignment inside a function",
        sourceCode: `
def my_function():
    local_var = 100
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def my_function():
    local_var = 100
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def my_function():
    local_var = 100
`.trim(),
                identifierNodeText: "my_function",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Ignores an assignment inside a class",
        sourceCode: `
class MyClass:
    class_var = "Hello"
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class MyClass:
    class_var = "Hello"
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class MyClass:
    class_var = "Hello"
`.trim(),
                identifierNodeText: "MyClass",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a variable assignment with unpacking",
        sourceCode: "a, b = 1, 2",
        expected: [
          {
            type: "named",
            nodeText: "a, b = 1, 2",
            members: [
              {
                type: "variable",
                nodeText: "a, b = 1, 2",
                identifierNodeText: "a",
                aliasNodeText: undefined,
              },
              {
                type: "variable",
                nodeText: "a, b = 1, 2",
                identifierNodeText: "b",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
    ];

    it.each(testCases)("$description", (testCases) => {
      const tree = parser.parse(testCases.sourceCode);
      const exportStatements = extractor.run(
        path.join("project", "file.py"),
        tree.rootNode,
      );

      // check correct number of ExportStatement
      expect(exportStatements.length).toBe(testCases.expected.length);

      exportStatements.forEach((exportStatement, index) => {
        const expected = testCases.expected[index];
        // check correct type
        expect(exportStatement.type).toBe(expected.type);
        // check correct node content
        expect(exportStatement.node.text).toBe(expected.nodeText);

        exportStatement.members.forEach((member, index) => {
          const expectedMember = expected.members[index];
          // check correct type
          expect(member.type).toBe(expectedMember.type);
          // check correct node content
          expect(member.node.text).toBe(expectedMember.nodeText);
          // check correct identifier node content
          expect(member.identifierNode.text).toBe(
            expectedMember.identifierNodeText,
          );
          // check correct alias node content
          expect(member.aliasNode?.text).toBe(expectedMember.aliasNodeText);
        });
      });
    });
  });

  describe("should extract mixed type exports", () => {
    const testCases = [
      {
        description: "Extracts a mix of function, class, and variable exports",
        sourceCode: `
PI = 3.14159

def calculate_area(radius):
    return PI * radius * radius

class Circle:
    def __init__(self, radius):
        self.radius = radius
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def calculate_area(radius):
    return PI * radius * radius
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def calculate_area(radius):
    return PI * radius * radius
`.trim(),
                identifierNodeText: "calculate_area",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
class Circle:
    def __init__(self, radius):
        self.radius = radius
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class Circle:
    def __init__(self, radius):
        self.radius = radius
`.trim(),
                identifierNodeText: "Circle",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: "PI = 3.14159",
            members: [
              {
                type: "variable",
                nodeText: "PI = 3.14159",
                identifierNodeText: "PI",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description:
          "Extracts multiple classes, functions, and variables together",
        sourceCode: `
VERSION = "1.0.0"

class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

def area(rect):
    return rect.width * rect.height

class Square(Rectangle):
    pass

def perimeter(rect):
    return 2 * (rect.width + rect.height)
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def area(rect):
    return rect.width * rect.height
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def area(rect):
    return rect.width * rect.height
`.trim(),
                identifierNodeText: "area",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
def perimeter(rect):
    return 2 * (rect.width + rect.height)
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def perimeter(rect):
    return 2 * (rect.width + rect.height)
`.trim(),
                identifierNodeText: "perimeter",
                aliasNodeText: undefined,
              },
            ],
          },

          {
            type: "named",
            nodeText: `
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height
`.trim(),
                identifierNodeText: "Rectangle",
                aliasNodeText: undefined,
              },
            ],
          },

          {
            type: "named",
            nodeText: `
class Square(Rectangle):
    pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class Square(Rectangle):
    pass
`.trim(),
                identifierNodeText: "Square",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: 'VERSION = "1.0.0"',
            members: [
              {
                type: "variable",
                nodeText: 'VERSION = "1.0.0"',
                identifierNodeText: "VERSION",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts a decorated function, a class, and a constant",
        sourceCode: `
@log_execution
def run():
    print("Running")

class Logger:
    level = "INFO"

TIMEOUT = 30
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
@log_execution
def run():
    print("Running")
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
@log_execution
def run():
    print("Running")
`.trim(),
                identifierNodeText: "run",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
class Logger:
    level = "INFO"
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class Logger:
    level = "INFO"
`.trim(),
                identifierNodeText: "Logger",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: "TIMEOUT = 30",
            members: [
              {
                type: "variable",
                nodeText: "TIMEOUT = 30",
                identifierNodeText: "TIMEOUT",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description:
          "Extracts a mix of decorated classes, functions, and assignments",
        sourceCode: `
@singleton
class Database:
    connection = None

    def connect(self):
        pass

def get_data():
    return {}

CACHE_LIMIT = 100
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
def get_data():
    return {}
`.trim(),
            members: [
              {
                type: "function",
                nodeText: `
def get_data():
    return {}
`.trim(),
                identifierNodeText: "get_data",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: `
@singleton
class Database:
    connection = None

    def connect(self):
        pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
@singleton
class Database:
    connection = None

    def connect(self):
        pass
`.trim(),
                identifierNodeText: "Database",
                aliasNodeText: undefined,
              },
            ],
          },

          {
            type: "named",
            nodeText: "CACHE_LIMIT = 100",
            members: [
              {
                type: "variable",
                nodeText: "CACHE_LIMIT = 100",
                identifierNodeText: "CACHE_LIMIT",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
      {
        description: "Extracts only top-level exports, ignoring inner elements",
        sourceCode: `
class Outer:
    def outer_method(self):
        class Inner:
            pass

API_KEY = "secret"
`.trim(),
        expected: [
          {
            type: "named",
            nodeText: `
class Outer:
    def outer_method(self):
        class Inner:
            pass
`.trim(),
            members: [
              {
                type: "class",
                nodeText: `
class Outer:
    def outer_method(self):
        class Inner:
            pass
`.trim(),
                identifierNodeText: "Outer",
                aliasNodeText: undefined,
              },
            ],
          },
          {
            type: "named",
            nodeText: 'API_KEY = "secret"',
            members: [
              {
                type: "variable",
                nodeText: 'API_KEY = "secret"',
                identifierNodeText: "API_KEY",
                aliasNodeText: undefined,
              },
            ],
          },
        ],
      },
    ];

    it.each(testCases)("$description", (testCases) => {
      const tree = parser.parse(testCases.sourceCode);
      const exportStatements = extractor.run(
        path.join("project", "file.py"),
        tree.rootNode,
      );

      // check correct number of ExportStatement
      expect(exportStatements.length).toBe(testCases.expected.length);

      exportStatements.forEach((exportStatement, index) => {
        const expected = testCases.expected[index];
        // check correct type
        expect(exportStatement.type).toBe(expected.type);
        // check correct node content
        expect(exportStatement.node.text).toBe(expected.nodeText);

        exportStatement.members.forEach((member, index) => {
          const expectedMember = expected.members[index];
          // check correct type
          expect(member.type).toBe(expectedMember.type);
          // check correct node content
          expect(member.node.text).toBe(expectedMember.nodeText);
          // check correct identifier node content
          expect(member.identifierNode.text).toBe(
            expectedMember.identifierNodeText,
          );
          // check correct alias node content
          expect(member.aliasNode?.text).toBe(expectedMember.aliasNodeText);
        });
      });
    });
  });
});
