import { describe, expect, test } from "vitest";
import Parser from "tree-sitter";
import { PythonSymbolExtractor } from "./index";
import { PythonExportExtractor } from "../exportExtractor";
import { PythonModuleResolver } from "../moduleResolver";
import { PythonItemResolver } from "../itemResolver";
import { PythonImportExtractor } from "../importExtractor";
import { PythonUsageResolver } from "../usageResolver";
import { DependencyManifest } from "../../../manifest/dependencyManifest/types";
import { pythonParser } from "../../../helpers/treeSitter/parsers";
import { localConfigSchema } from "../../../config/localConfig";
import z from "zod";
import { generatePythonDependencyManifest } from "../../../manifest/dependencyManifest/python";

describe("PythonSymbolExtractor", () => {
  // Helper to create a map of parsed files
  function createParsedFiles(
    files: Map<string, { path: string; content: string }>,
  ) {
    const parsedFiles = new Map<
      string,
      { path: string; rootNode: Parser.SyntaxNode }
    >();

    for (const { path, content } of files.values()) {
      const rootNode = pythonParser.parse(content, undefined, {
        bufferSize: content.length + 10,
      }).rootNode;
      parsedFiles.set(path, { path, rootNode });
    }

    return parsedFiles;
  }

  // Helper to create a dependency manifest for testing
  function createDependencyManifest(
    files: Map<string, { path: string; content: string }>,
  ): DependencyManifest {
    const dependencyManifest = generatePythonDependencyManifest(files, {
      audit: {
        language: "python",
        pythonVersion: "3.10",
        include: [],
        exclude: [],
      },
    } as z.infer<typeof localConfigSchema>);

    return dependencyManifest;
  }

  function createSymbolExtractor(
    files: Map<string, { path: string; content: string }>,
  ) {
    const parsedFiles = createParsedFiles(files);
    const dependencyManifest = createDependencyManifest(files);

    const exportExtractor = new PythonExportExtractor(
      pythonParser,
      parsedFiles,
    );
    const importExtractor = new PythonImportExtractor(
      pythonParser,
      parsedFiles,
    );
    const moduleResolver = new PythonModuleResolver(
      new Set(parsedFiles.keys()),
      "3.10",
    );
    const itemResolver = new PythonItemResolver(
      exportExtractor,
      importExtractor,
      moduleResolver,
    );
    const usageResolver = new PythonUsageResolver(
      pythonParser,
      exportExtractor,
    );

    const symbolExtractor = new PythonSymbolExtractor(
      pythonParser,
      parsedFiles,
      exportExtractor,
      importExtractor,
      moduleResolver,
      itemResolver,
      usageResolver,
      dependencyManifest,
    );

    return symbolExtractor;
  }

  // Basic test setup
  test("should extract a class and its dependencies", () => {
    // Create test files with a class and its dependencies
    const files = new Map<string, { path: string; content: string }>([
      [
        "main.py",
        {
          path: "main.py",
          content: `
from utils import Helper

class MyClass:
    def __init__(self):
        self.helper = Helper()
    
    def do_something(self):
        return self.helper.help()

def foo():
    return "foo"
`.trim(),
        },
      ],
      [
        "utils.py",
        {
          path: "utils.py",
          content: `
class Helper:
    def help(self):
        return "Helping..."
`.trim(),
        },
      ],
    ]);

    const symbolExtractor = createSymbolExtractor(files);

    const symbolsToExtract = new Map([
      [
        "main.py",
        {
          filePath: "main.py",
          symbols: new Set(["MyClass"]),
        },
      ],
    ]);

    const result = symbolExtractor.extractSymbol(symbolsToExtract);

    expect(result).toBeDefined();
    expect(result.size).toBe(2);
    expect(result.get("main.py")).toBeDefined();
    expect(result.get("main.py")?.content.trim()).toEqual(
      `
from utils import Helper

class MyClass:
    def __init__(self):
        self.helper = Helper()
    
    def do_something(self):
        return self.helper.help()
`.trim(),
    );
    expect(result.get("utils.py")).toBeDefined();
    expect(result.get("utils.py")?.content.trim()).toEqual(
      `
class Helper:
    def help(self):
        return "Helping..."
`.trim(),
    );
  });

  test("should extract multiple symbols with nested dependencies", () => {
    const files = new Map([
      [
        "app.py",
        {
          path: "app.py",
          content: `
from services.user_service import UserService
from services.auth_service import AuthService
from models.user import User

class Application:
    def __init__(self):
        self.user_service = UserService()
        self.auth_service = AuthService()

    def register_user(self, username, password):
        user = User(username)
        self.auth_service.set_password(user, password)
        return self.user_service.save_user(user)

    def authenticate(self, username, password):
        return self.auth_service.verify(username, password)

def foo():
    return "foo"
`.trim(),
        },
      ],
      [
        "services/user_service.py",
        {
          path: "services/user_service.py",
          content: `
from models.user import User
from database.repository import Repository

class UserService:
    def __init__(self):
        self.repository = Repository("users")

    def save_user(self, user):
        return self.repository.save(user)

    def get_user(self, username):
        return self.repository.find_one({"username": username})

def bar():
    return "bar"
`.trim(),
        },
      ],
      [
        "services/auth_service.py",
        {
          path: "services/auth_service.py",
          content: `
from models.user import User
from services.user_service import UserService
import hashlib

class AuthService:
    def __init__(self):
        self.user_service = UserService()

    def set_password(self, user, password):
        user.password_hash = hashlib.sha256(password.encode()).hexdigest()

    def verify(self, username, password):
        user = self.user_service.get_user(username)
        if not user:
            return False
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return user.password_hash == password_hash
`.trim(),
        },
      ],
      [
        "models/user.py",
        {
          path: "models/user.py",
          content: `
class User:
    def __init__(self, username):
        self.username = username
        self.password_hash = None
        self.is_active = True

    def deactivate(self):
        self.is_active = False

    def __str__(self):
        return f"User({self.username})"
`.trim(),
        },
      ],
      [
        "database/repository.py",
        {
          path: "database/repository.py",
          content: `
class Repository:
    def __init__(self, collection_name):
        self.collection_name = collection_name
        self.data = {}

    def save(self, entity):
        key = getattr(entity, "username", id(entity))
        self.data[key] = entity
        return entity

    def find_one(self, query):
        username = query.get("username")
        if username in self.data:
            return self.data[username]
        return None
`.trim(),
        },
      ],
    ]);

    const symbolExtractor = createSymbolExtractor(files);

    const symbolsToExtract = new Map([
      [
        "app.py",
        {
          filePath: "app.py",
          symbols: new Set(["Application"]),
        },
      ],
    ]);

    const result = symbolExtractor.extractSymbol(symbolsToExtract);

    expect(result).toBeDefined();
    expect(result.size).toBe(5);

    expect(result.get("app.py")).toBeDefined();
    expect(result.get("app.py")?.content.trim()).toEqual(
      `
from services.user_service import UserService
from services.auth_service import AuthService
from models.user import User

class Application:
    def __init__(self):
        self.user_service = UserService()
        self.auth_service = AuthService()

    def register_user(self, username, password):
        user = User(username)
        self.auth_service.set_password(user, password)
        return self.user_service.save_user(user)

    def authenticate(self, username, password):
        return self.auth_service.verify(username, password)
`.trim(),
    );
    expect(result.get("services/user_service.py")).toBeDefined();
    expect(result.get("services/user_service.py")?.content.trim()).toEqual(
      `
from models.user import User
from database.repository import Repository

class UserService:
    def __init__(self):
        self.repository = Repository("users")

    def save_user(self, user):
        return self.repository.save(user)

    def get_user(self, username):
        return self.repository.find_one({"username": username})
    `.trim(),
    );
    expect(result.get("services/auth_service.py")).toBeDefined();
    expect(result.get("services/auth_service.py")?.content.trim()).toEqual(
      `
from models.user import User
from services.user_service import UserService
import hashlib

class AuthService:
    def __init__(self):
        self.user_service = UserService()

    def set_password(self, user, password):
        user.password_hash = hashlib.sha256(password.encode()).hexdigest()

    def verify(self, username, password):
        user = self.user_service.get_user(username)
        if not user:
            return False
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return user.password_hash == password_hash
`.trim(),
    );
    expect(result.get("models/user.py")).toBeDefined();
    expect(result.get("models/user.py")?.content.trim()).toEqual(
      `
class User:
    def __init__(self, username):
        self.username = username
        self.password_hash = None
        self.is_active = True

    def deactivate(self):
        self.is_active = False

    def __str__(self):
        return f"User({self.username})"
`.trim(),
    );
    expect(result.get("database/repository.py")).toBeDefined();
    expect(result.get("database/repository.py")?.content.trim()).toEqual(
      `
class Repository:
    def __init__(self, collection_name):
        self.collection_name = collection_name
        self.data = {}

    def save(self, entity):
        key = getattr(entity, "username", id(entity))
        self.data[key] = entity
        return entity

    def find_one(self, query):
        username = query.get("username")
        if username in self.data:
            return self.data[username]
        return None
`.trim(),
    );
  });

  test("should remove invalid normal imports", () => {
    const files = new Map([
      [
        "main.py",
        {
          path: "main.py",
          content: `
import valid_module
import invalid_module

class MyClass:
    def __init__(self):
        self.helper = valid_module.valid_function()

class AnotherClass:
    def __init__(self):
        self.invalid = invalid_module.something()
  `.trim(),
        },
      ],
      [
        "valid_module.py",
        {
          path: "valid_module.py",
          content: `
def valid_function():
    return "I'm valid"
  `.trim(),
        },
      ],
      [
        "invalid_module.py",
        {
          path: "invalid_module.py",
          content: `
def something():
    return "I'll be removed"
  `.trim(),
        },
      ],
    ]);

    const symbolExtractor = createSymbolExtractor(files);

    // Only extract MyClass which depends on Helper but not on invalid_module
    const symbolsToExtract = new Map([
      [
        "main.py",
        {
          filePath: "main.py",
          symbols: new Set(["MyClass"]),
        },
      ],
    ]);

    const result = symbolExtractor.extractSymbol(symbolsToExtract);

    expect(result.size).toBe(2);
    expect(result.get("main.py")).toBeDefined();
    expect(result.get("main.py")?.content.trim()).toEqual(
      `
import valid_module


class MyClass:
    def __init__(self):
        self.helper = valid_module.valid_function()
  `.trim(),
    );
    expect(result.get("valid_module.py")).toBeDefined();
    expect(result.get("valid_module.py")?.content.trim()).toEqual(
      `
def valid_function():
    return "I'm valid"
  `.trim(),
    );
  });

  test("should remove invalid from imports", () => {
    const files = new Map([
      [
        "main.py",
        {
          path: "main.py",
          content: `
from valid_module import valid_function
from invalid_module import something

class MyClass:
    def __init__(self):
        self.helper = valid_function()

class AnotherClass:
    def __init__(self):
        self.invalid = something()
  `.trim(),
        },
      ],
      [
        "valid_module.py",
        {
          path: "valid_module.py",
          content: `
def valid_function():
    return "I'm valid"
  `.trim(),
        },
      ],
      [
        "invalid_module.py",
        {
          path: "invalid_module.py",
          content: `
def something():
    return "I'll be removed"
  `.trim(),
        },
      ],
    ]);

    const symbolExtractor = createSymbolExtractor(files);

    const symbolsToExtract = new Map([
      [
        "main.py",
        {
          filePath: "main.py",
          symbols: new Set(["MyClass"]),
        },
      ],
    ]);

    const result = symbolExtractor.extractSymbol(symbolsToExtract);

    expect(result.size).toBe(2);
    expect(result.get("main.py")).toBeDefined();
    expect(result.get("main.py")?.content.trim()).toEqual(
      `
from valid_module import valid_function


class MyClass:
    def __init__(self):
        self.helper = valid_function()
  `.trim(),
    );
    expect(result.get("valid_module.py")).toBeDefined();
    expect(result.get("valid_module.py")?.content.trim()).toEqual(
      `
def valid_function():
    return "I'm valid"
  `.trim(),
    );
  });
});
