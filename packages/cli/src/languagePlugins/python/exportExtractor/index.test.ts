import { describe, test } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type Parser from "tree-sitter";
import { PythonExportExtractor } from "./index.ts";
import {
  PYTHON_CLASS_TYPE,
  PYTHON_FUNCTION_TYPE,
  PYTHON_VARIABLE_TYPE,
} from "./types.ts";
import { pythonParser } from "../../../helpers/treeSitter/parsers.ts";

describe("PythonExportExtractor", () => {
  const parser = pythonParser;

  test("should extract simple class definitions", () => {
    const code = `
    class MyClass:
        pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("class_test.py", {
      path: "class_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("class_test.py");
    const classSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_CLASS_TYPE,
    );

    expect(classSymbols.length).toBeGreaterThanOrEqual(1);
    const myClass = classSymbols.find((s) => s.id === "MyClass");
    expect(myClass).toBeDefined();
    // Optionally, check that the syntax node's text matches expectations.
    expect(myClass?.identifierNode.text).toBe("MyClass");
  });

  test("should extract decorated class definitions", () => {
    const code = `
    @decorator
    class DecoratedClass:
        pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("decorated_class_test.py", {
      path: "decorated_class_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("decorated_class_test.py");
    const classSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_CLASS_TYPE,
    );

    expect(classSymbols.length).toBeGreaterThanOrEqual(1);
    const decClass = classSymbols.find((s) => s.id === "DecoratedClass");
    expect(decClass).toBeDefined();
  });

  test("should extract simple function definitions", () => {
    const code = `
    def my_function():
        pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("function_test.py", {
      path: "function_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("function_test.py");
    const functionSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_FUNCTION_TYPE,
    );

    expect(functionSymbols.length).toBeGreaterThanOrEqual(1);
    const func = functionSymbols.find((s) => s.id === "my_function");
    expect(func).toBeDefined();
  });

  test("should extract decorated function definitions", () => {
    const code = `
    @decorator
    def decorated_function():
        pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("decorated_function_test.py", {
      path: "decorated_function_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("decorated_function_test.py");
    const functionSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_FUNCTION_TYPE,
    );

    expect(functionSymbols.length).toBeGreaterThanOrEqual(1);
    const decFunc = functionSymbols.find((s) => s.id === "decorated_function");
    expect(decFunc).toBeDefined();
  });

  test("should extract variable assignments and not include __all__", () => {
    const code = `
    x = 10
    y, z = 20, 30
    __all__ = ["x", "y", "z"]
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("variable_test.py", {
      path: "variable_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("variable_test.py");
    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );

    // Expect that x, y, z are extracted as variables.
    const varX = variableSymbols.find((s) => s.id === "x");
    const varY = variableSymbols.find((s) => s.id === "y");
    const varZ = variableSymbols.find((s) => s.id === "z");
    expect(varX).toBeDefined();
    expect(varY).toBeDefined();
    expect(varZ).toBeDefined();

    // __all__ should not be among exported symbols.
    const exportedIds = result.symbols.map((s) => s.id);
    expect(exportedIds).not.toContain("__all__");
  });

  test("should extract __all__ elements correctly", () => {
    const code = `
    __all__ = ["a", "b", "c"]
    a = 1
    b = 2
    c = 3
    d = 4
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("all_test.py", { path: "all_test.py", rootNode: tree.rootNode });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("all_test.py");

    // publicSymbols should reflect the __all__ definition.
    expect(result.publicSymbols).toContain("a");
    expect(result.publicSymbols).toContain("b");
    expect(result.publicSymbols).toContain("c");
    // 'd' is not public because it's not in __all__
    expect(result.publicSymbols).not.toContain("d");
  });

  test("should extract multiple function definitions with the same name", () => {
    const code = `
    def my_function():
        pass

    # Some comment in between

    def my_function(a, b):
        return a + b
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("multi_function_test.py", {
      path: "multi_function_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("multi_function_test.py");
    const functionSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_FUNCTION_TYPE,
    );

    // Should find one symbol for my_function with two nodes
    const func = functionSymbols.find((s) => s.id === "my_function");
    expect(func).toBeDefined();
    expect(func?.nodes.length).toBe(2);
  });

  test("should extract multiple class definitions with the same name", () => {
    const code = `
    class MyClass:
        def method1(self):
            pass

    # Some comment in between

    class MyClass:
        def method2(self):
            pass
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("multi_class_test.py", {
      path: "multi_class_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("multi_class_test.py");
    const classSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_CLASS_TYPE,
    );

    // Should find one symbol for MyClass with two nodes
    const myClass = classSymbols.find((s) => s.id === "MyClass");
    expect(myClass).toBeDefined();
    expect(myClass?.nodes.length).toBe(2);
  });

  test("should capture variable modifications", () => {
    const code = `
    counter = 0
    counter += 1
    counter = counter + 10
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("variable_mod_test.py", {
      path: "variable_mod_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("variable_mod_test.py");
    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );

    // There should be only one symbol for counter
    expect(variableSymbols.length).toBe(1);

    // The one symbol should be counter
    const counter = variableSymbols[0];
    expect(counter.id).toBe("counter");

    // After deduplication, we expect 3 nodes: initial assignment + two modifications
    expect(counter.nodes.length).toBe(3);

    // Verify that all the expected nodes are included
    const nodeCaptured = (text: string) =>
      counter.nodes.some((node) => node.text.includes(text));
    expect(nodeCaptured("counter = 0")).toBe(true);
    expect(nodeCaptured("counter += 1")).toBe(true);
    expect(nodeCaptured("counter = counter + 10")).toBe(true);
  });

  test("should not create new symbols for variable modifications", () => {
    const code = `
    # Only modify a variable without initializing it
    existing_var += 5
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("var_mod_only_test.py", {
      path: "var_mod_only_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("var_mod_only_test.py");
    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );

    // Should not find a symbol for existing_var as it's only modified without initialization
    const existingVar = variableSymbols.find((s) => s.id === "existing_var");
    expect(existingVar).toBeUndefined();
  });

  test("should handle mixed symbol types and multiple modifications", () => {
    const code = `
    x = 10

    def func():
        pass

    x += 5

    class MyClass:
        pass

    x = 20

    def func(a):
        return a
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("mixed_symbols_test.py", {
      path: "mixed_symbols_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("mixed_symbols_test.py");

    // Variable x should have 3 nodes
    const x = result.symbols.find(
      (s) => s.id === "x" && s.type === PYTHON_VARIABLE_TYPE,
    );
    expect(x).toBeDefined();
    expect(x?.nodes.length).toBe(3);

    // Function func should have 2 nodes
    const func = result.symbols.find(
      (s) => s.id === "func" && s.type === PYTHON_FUNCTION_TYPE,
    );
    expect(func).toBeDefined();
    expect(func?.nodes.length).toBe(2);

    // Class MyClass should have 1 node
    const myClass = result.symbols.find(
      (s) => s.id === "MyClass" && s.type === PYTHON_CLASS_TYPE,
    );
    expect(myClass).toBeDefined();
    expect(myClass?.nodes.length).toBe(1);
  });

  test("should capture list variable modifications", () => {
    const code = `
    my_list = [1, 2, 3]
    my_list.append(4)
    my_list += [5, 6]
    my_list.extend([7, 8])
    my_list[0] = 0
    my_list = my_list + [9, 10]
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("list_mod_test.py", {
      path: "list_mod_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("list_mod_test.py");
    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );

    // There should be only one symbol for my_list
    const myList = variableSymbols.find((s) => s.id === "my_list");
    expect(myList).toBeDefined();

    // Should have nodes for the initial assignment and += operation
    // Method calls like append and extend are not captured as they're not direct assignments
    // But reassignment (my_list = my_list + [9, 10]) should be captured
    expect(myList?.nodes.length).toBeGreaterThanOrEqual(3);

    // Verify that key operations are included
    const nodeCaptured = (text: string) =>
      myList?.nodes.some((node) => node.text.includes(text));
    expect(nodeCaptured("my_list = [1, 2, 3]")).toBe(true);
    expect(nodeCaptured("my_list += [5, 6]")).toBe(true);
    expect(nodeCaptured("my_list = my_list + [9, 10]")).toBe(true);
  });

  test("should capture dictionary variable modifications", () => {
    const code = `
    my_dict = {"a": 1, "b": 2}
    my_dict["c"] = 3
    my_dict.update({"d": 4})
    my_dict |= {"e": 5}
    del my_dict["a"]
    my_dict = {**my_dict, "f": 6}
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("dict_mod_test.py", {
      path: "dict_mod_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("dict_mod_test.py");
    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );

    // There should be only one symbol for my_dict
    const myDict = variableSymbols.find((s) => s.id === "my_dict");
    expect(myDict).toBeDefined();

    // Should have at least the initial assignment, |= operation, and reassignment
    // Method calls like update and subscript assignments aren't captured as direct assignments
    expect(myDict?.nodes.length).toBeGreaterThanOrEqual(3);

    // Verify that key operations are included
    const nodeCaptured = (text: string) =>
      myDict?.nodes.some((node) => node.text.includes(text));
    expect(nodeCaptured('my_dict = {"a": 1, "b": 2}')).toBe(true);
    expect(nodeCaptured('my_dict |= {"e": 5}')).toBe(true);
    expect(nodeCaptured('my_dict = {**my_dict, "f": 6}')).toBe(true);
  });

  test("should capture object attribute modifications", () => {
    const code = `
    class Person:
        pass

    person = Person()
    person.name = "John"
    person.age = 30
    person = Person()
    person.name = "Jane"
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("object_mod_test.py", {
      path: "object_mod_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("object_mod_test.py");

    // There should be a class and a variable
    const personClass = result.symbols.find(
      (s) => s.id === "Person" && s.type === PYTHON_CLASS_TYPE,
    );
    expect(personClass).toBeDefined();

    const personVar = result.symbols.find(
      (s) => s.id === "person" && s.type === PYTHON_VARIABLE_TYPE,
    );
    expect(personVar).toBeDefined();

    // Should have at least the two assignments to person
    // Attribute assignments (person.name, person.age) aren't captured as direct variable assignments
    expect(personVar?.nodes.length).toBeGreaterThanOrEqual(2);

    // Verify that direct assignments to the person variable are included
    const nodeCaptured = (text: string) =>
      personVar?.nodes.some((node) => node.text.includes(text));
    expect(nodeCaptured("person = Person()")).toBe(true);
  });

  test("should ignore variable modifications inside functions", () => {
    const code = `
    # Module-level variable
    counter = 0

    def increment():
        # Local variable with same name as module-level one
        counter = 0
        counter += 1
        return counter

    # Module-level modification
    counter += 10

    def modify_global():
        global counter
        # This modifies the module-level variable
        counter += 100

    # Another module-level variable
    total = 50
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("function_scope_test.py", {
      path: "function_scope_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("function_scope_test.py");
    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );

    // There should be two variables: counter and total
    expect(variableSymbols.length).toBe(2);

    // The counter variable should have 2 nodes (initial assignment and module-level +=)
    const counter = variableSymbols.find((s) => s.id === "counter");
    expect(counter).toBeDefined();
    expect(counter?.nodes.length).toBe(2);

    // Verify that only module-level operations are included, not the ones inside functions
    const counterNodeTexts = counter?.nodes.map((node) => node.text.trim());
    expect(counterNodeTexts).toContain("counter = 0");
    expect(counterNodeTexts).toContain("counter += 10");
    // The counter += 1 inside increment() should not be captured
    const hasLocalIncrement = counter?.nodes.some(
      (node) =>
        node.text.includes("counter += 1") &&
        node.parent?.parent?.type === "function_definition",
    );
    expect(hasLocalIncrement).toBeFalsy();

    // The counter += 100 inside modify_global() should not be captured
    // even though it modifies the global variable
    const hasGlobalModification = counter?.nodes.some((node) =>
      node.text.includes("counter += 100")
    );
    expect(hasGlobalModification).toBeFalsy();

    // The total variable should have 1 node
    const total = variableSymbols.find((s) => s.id === "total");
    expect(total).toBeDefined();
    expect(total?.nodes.length).toBe(1);
  });

  test("should ignore variable modifications inside classes", () => {
    const code = `
    # Module-level variable
    data = []

    class DataProcessor:
        # Class variable with same name
        data = {}

        def __init__(self):
            # Instance variable
            self.data = []

        def process(self):
            # Local variable
            data = []
            data.append("processed")
            return data

        @classmethod
        def reset(cls):
            # Modifying class variable
            cls.data = {}

    # Module-level modification
    data.append("module")
    data = data + ["level"]

    # Another module-level variable
    config = {}
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("class_scope_test.py", {
      path: "class_scope_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("class_scope_test.py");
    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );

    // There should be two variables: data and config
    expect(variableSymbols.length).toBe(2);

    // The data variable should have 2 nodes (initial assignment and module-level reassignment)
    const data = variableSymbols.find((s) => s.id === "data");
    expect(data).toBeDefined();
    expect(data?.nodes.length).toBeGreaterThanOrEqual(2);

    // Verify that only module-level operations are included, not the ones inside the class
    const dataNodeTexts = data?.nodes.map((node) => node.text.trim());
    expect(dataNodeTexts).toContain("data = []");
    expect(dataNodeTexts).toContain('data = data + ["level"]');

    // Class-level data = {} should not be captured
    const hasClassVariable = data?.nodes.some(
      (node) =>
        node.text.includes("data = {}") &&
        node.parent?.parent?.type === "class_definition",
    );
    expect(hasClassVariable).toBeFalsy();

    // The config variable should have 1 node
    const config = variableSymbols.find((s) => s.id === "config");
    expect(config).toBeDefined();
    expect(config?.nodes.length).toBe(1);
  });

  test("should capture only top-level nodes in a complex nested structure", () => {
    const code = `
    # Module-level variable
    count = 0

    class Counter:
        # Class variable
        count = 0

        def __init__(self, initial=0):
            # Instance variable
            self.count = initial

        def increment(self):
            # Local method operation
            count = 0  # Local variable shadowing
            count += 1
            self.count += 1

        @classmethod
        def increment_class(cls):
            # Class variable operation
            cls.count += 1

        @staticmethod
        def process():
            # Local function operation
            def nested():
                # Nested function variable
                count = 100
                count *= 2
                return count
            return nested()

    # Another module-level function
    def operate():
        # Local variable
        count = 5

        # Nested function
        def nested_modifier():
            nonlocal count
            count += 5

            # Double-nested function
            def deep_nested():
                # Local to deep_nested
                count = 1000
                return count

            return deep_nested()

        nested_modifier()
        return count

    # Module-level modifications
    count += 1
    count *= 2
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("complex_nested_test.py", {
      path: "complex_nested_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("complex_nested_test.py");

    // There should be one class, one function and one variable
    const classSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_CLASS_TYPE,
    );
    expect(classSymbols.length).toBe(1);

    const functionSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_FUNCTION_TYPE,
    );
    expect(functionSymbols.length).toBe(1);

    const variableSymbols = result.symbols.filter(
      (s) => s.type === PYTHON_VARIABLE_TYPE,
    );
    expect(variableSymbols.length).toBe(1);

    // The count variable should have 3 nodes (initial assignment and two module-level modifications)
    const count = variableSymbols[0];
    expect(count.id).toBe("count");
    expect(count.nodes.length).toBe(3);

    // Verify that only module-level operations are included
    const countNodeTexts = count.nodes.map((node) => node.text.trim());
    expect(countNodeTexts).toContain("count = 0");
    expect(countNodeTexts).toContain("count += 1");
    expect(countNodeTexts).toContain("count *= 2");

    // No inner node should be included
    const hasNestedNodes = count.nodes.some((node) => {
      const parentTypes = [];
      let current = node.parent;
      while (current) {
        parentTypes.push(current.type);
        current = current.parent;
      }

      return (
        parentTypes.includes("function_definition") ||
        parentTypes.includes("class_definition")
      );
    });

    expect(hasNestedNodes).toBeFalsy();
  });

  test("should capture method calls and attribute assignments for app configuration", () => {
    const code = `
    import os
    from celery import Celery

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Project.settings")
    app = Celery("Project")
    app.config_from_object("django.conf:settings", namespace="CELERY")
    app.conf.update(app.conf.get("CELERY_CONFIG"))
    app.autodiscover_tasks()

    app.conf.task_queue_max_priority = 10
    app.conf.task_default_priority = 5

    app.conf.beat_schedule = {
        "task1": {
            "task": "module.tasks.task1",
            "schedule": 60,
        },
        "task2": {
            "task": "module.tasks.task2",
            "schedule": 300,
        },
    }
    `;
    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("celery_app_test.py", {
      path: "celery_app_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("celery_app_test.py");
    const appSymbol = result.symbols.find((s) => s.id === "app");

    // Verify app symbol exists and is captured correctly
    expect(appSymbol).toBeDefined();
    expect(appSymbol?.type).toBe(PYTHON_VARIABLE_TYPE);

    // Should have multiple nodes for the app variable
    expect(appSymbol?.nodes.length).toBeGreaterThanOrEqual(6); // Initial definition + 5 modification statements

    // Verify that all app operations are included
    const nodeCaptured = (text: string) =>
      appSymbol?.nodes.some((node) => node.text.includes(text));

    // Initial assignment
    expect(nodeCaptured('app = Celery("Project")')).toBe(true);

    // Method calls
    expect(nodeCaptured("app.config_from_object")).toBe(true);
    expect(nodeCaptured("app.autodiscover_tasks()")).toBe(true);

    // Attribute assignments
    expect(nodeCaptured("app.conf.task_queue_max_priority = 10")).toBe(true);
    expect(nodeCaptured("app.conf.task_default_priority = 5")).toBe(true);
    expect(nodeCaptured("app.conf.beat_schedule = {")).toBe(true);
  });

  test("should capture complex object initialization and modifications", () => {
    const code = `
    from flask import Flask
    from flask_cors import CORS
    from config import Config

    server = Flask(__name__)
    server.config.from_object(Config)
    server.config.update({
        "DEBUG": True,
        "SECRET_KEY": "dev-key",
    })
    server.register_blueprint(api_bp, url_prefix="/api")

    CORS(server)

    server.logger.setLevel("INFO")
    server.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

    server.session_interface = CustomSessionInterface()

    server.route_map = {
        "home": "/",
        "dashboard": "/dashboard",
        "profile": "/profile",
        "settings": {
            "general": "/settings/general",
            "security": "/settings/security",
            "notifications": "/settings/notifications",
        }
    }

    @server.before_request
    def before_request():
        pass

    if __name__ == "__main__":
        server.run(host="0.0.0.0", port=5000)
    `;

    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("flask_app.py", {
      path: "flask_app.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("flask_app.py");
    const serverSymbol = result.symbols.find((s) => s.id === "server");

    // Verify server symbol exists and is a variable
    expect(serverSymbol).toBeDefined();
    expect(serverSymbol?.type).toBe(PYTHON_VARIABLE_TYPE);

    // Should have multiple nodes for the server variable
    expect(serverSymbol?.nodes.length).toBeGreaterThan(5);

    // Check for specific operations
    const nodeCaptured = (text: string) =>
      serverSymbol?.nodes.some((node) => node.text.includes(text));

    // Initial declaration
    expect(nodeCaptured("server = Flask(__name__)")).toBe(true);

    // Method calls
    expect(nodeCaptured("server.config.from_object")).toBe(true);
    expect(nodeCaptured("server.config.update")).toBe(true);
    expect(nodeCaptured("server.register_blueprint")).toBe(true);

    // Attribute assignments
    expect(nodeCaptured("server.logger.setLevel")).toBe(true);

    // Subscript assignments should now be detected
    expect(nodeCaptured('server.config["MAX_CONTENT_LENGTH"]')).toBe(true);

    expect(nodeCaptured("server.session_interface =")).toBe(true);
    expect(nodeCaptured("server.route_map =")).toBe(true);
  });

  test("should capture variable modifications through subscript operations", () => {
    const code = `
    # Direct subscript operations
    data = {}
    data["key1"] = "value1"
    data["key2"] = "value2"

    # Nested subscript operations
    config = {"db": {}}
    config["db"]["host"] = "localhost"
    config["db"]["port"] = 5432

    # Attribute + subscript operations
    class Storage:
        def __init__(self):
            self.items = {}

    storage = Storage()
    storage.items["item1"] = {"name": "Item 1", "price": 10}
    storage.items["item2"] = {"name": "Item 2", "price": 20}

    # Mixed operations
    options = {}
    options["debug"] = True
    options.update({"verbose": True})
    options["logging"] = {"level": "info"}
    `;

    const tree = parser.parse(code);
    const files = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();
    files.set("subscript_test.py", {
      path: "subscript_test.py",
      rootNode: tree.rootNode,
    });

    const resolver = new PythonExportExtractor(parser, files);
    const result = resolver.getSymbols("subscript_test.py");

    // Check data variable
    const dataSymbol = result.symbols.find((s) => s.id === "data");
    expect(dataSymbol).toBeDefined();
    expect(dataSymbol?.type).toBe(PYTHON_VARIABLE_TYPE);
    expect(dataSymbol?.nodes.length).toBeGreaterThan(1);

    // Check config variable
    const configSymbol = result.symbols.find((s) => s.id === "config");
    expect(configSymbol).toBeDefined();
    expect(configSymbol?.nodes.length).toBeGreaterThanOrEqual(1);

    // Check storage variable
    const storageSymbol = result.symbols.find((s) => s.id === "storage");
    expect(storageSymbol).toBeDefined();
    expect(storageSymbol?.nodes.length).toBeGreaterThanOrEqual(1);

    // Check options variable
    const optionsSymbol = result.symbols.find((s) => s.id === "options");
    expect(optionsSymbol).toBeDefined();
    expect(optionsSymbol?.nodes.length).toBeGreaterThan(1);

    // Check specific subscript operations were captured
    const nodeCaptured = (
      symbol: { nodes: Parser.SyntaxNode[] } | undefined,
      text: string,
    ) =>
      symbol?.nodes.some((node: Parser.SyntaxNode) => node.text.includes(text));

    // Verify that subscript-related nodes were captured
    expect(nodeCaptured(dataSymbol, "data[")).toBe(true);
    expect(nodeCaptured(storageSymbol, "storage.items")).toBe(true);
    expect(nodeCaptured(optionsSymbol, "options[")).toBe(true);
  });
});
