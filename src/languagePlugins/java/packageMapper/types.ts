import type { ExportedSymbol, JavaFile } from "../packageResolver/types.ts";

/**
 * Represents a node in a Java tree structure.
 */
export interface JavaNode {
  /** The name of the node. */
  name: string;
  /** The children of the node, stored as a map. */
  children: Map<string, JavaNode>;
}

/**
 * A basic implementation of the JavaNode interface.
 */
export class AbstractNode implements JavaNode {
  /** The name of the node. */
  name: string;
  /** The children of the node, stored as a map. */
  children: Map<string, JavaNode>;

  /**
   * Creates an instance of AbstractNode.
   * @param name - The name of the node.
   */
  constructor(name: string) {
    this.name = name;
    this.children = new Map();
  }
}

/**
 * An abstract class representing a concrete node in the Java tree structure.
 */
export abstract class ConcreteNode implements JavaNode {
  /** The name of the node. */
  name: string;
  /** The children of the node, stored as a map of NestedSymbol. */
  children: Map<string, NestedSymbol>;
  /** The declaration associated with this node. */
  declaration: ExportedSymbol;
  /** The file associated with this node. */
  file: JavaFile;

  /**
   * Creates an instance of ConcreteNode.
   * @param declaration - The exported symbol declaration for this node.
   * @param file - The Java file associated with this node.
   */
  constructor(declaration: ExportedSymbol, file: JavaFile) {
    this.declaration = declaration;
    this.file = file;
    this.name = declaration.name;
    this.children = new Map();
  }
}

/**
 * Represents the root of a Java tree structure.
 */
export class JavaTree extends AbstractNode {
  /**
   * Creates an instance of JavaTree.
   */
  constructor() {
    super("");
  }

  /**
   * Adds a Java file to the tree structure.
   * @param file - The Java file to add.
   */
  addFile(file: JavaFile) {
    const packageparts = file.package.split(".");
    let current = this.children;
    for (const p of packageparts) {
      if (!current.has(p)) {
        current.set(p, new AbstractNode(p));
      }
      current = current.get(p)!.children;
    }
    current.set(file.symbol.name, new FileNode(file));
  }

  /**
   * Retrieves a node from the tree by its name.
   * @param name - The fully qualified name of the node.
   * @returns The JavaNode if found, otherwise undefined.
   */
  getNode(name: string): JavaNode | undefined {
    if (name === "") {
      return this;
    } else {
      const packageparts = name.split(".").reverse();
      let current = this.children.get(packageparts.pop()!);
      if (!current) {
        return undefined;
      }
      while (packageparts.length > 0) {
        if (!current) {
          return undefined;
        }
        current = current.children.get(packageparts.pop()!);
      }
      return current;
    }
  }

  /**
   * Retrieves a map of importable nodes by their name.
   * @param name - The name of the import, optionally ending with `*` for wildcard imports.
   * @returns A map of ConcreteNode objects if found, otherwise undefined.
   */
  getImport(name: string): Map<string, ConcreteNode> | undefined {
    if (name.endsWith("*")) {
      const node = this.getNode(name.substring(0, name.length - 2));
      if (node) {
        const map = new Map<string, ConcreteNode>();
        for (const v of node.children.values()) {
          if (v instanceof ConcreteNode) {
            map.set(v.name, v);
          }
        }
        return map;
      }
    } else {
      const node = this.getNode(name);
      if (node && node instanceof ConcreteNode) {
        const map = new Map<string, ConcreteNode>();
        map.set(node.name, node);
        return map;
      }
    }
    return undefined;
  }
}

/**
 * Represents a file node in the Java tree structure.
 */
export class FileNode extends ConcreteNode {
  /**
   * Creates an instance of FileNode.
   * @param file - The Java file associated with this node.
   */
  constructor(file: JavaFile) {
    super(file.symbol, file);
    for (const c of this.declaration.children) {
      if (!c.modifiers.includes("private")) {
        this.children.set(c.name, new NestedSymbol(c, file));
      }
    }
  }
}

/**
 * Represents a nested symbol within a Java file.
 */
export class NestedSymbol extends ConcreteNode {
  /**
   * Creates an instance of NestedSymbol.
   * @param symbol - The exported symbol associated with this node.
   * @param file - The Java file associated with this node.
   */
  constructor(symbol: ExportedSymbol, file: JavaFile) {
    super(symbol, file);
    for (const c of this.declaration.children) {
      if (!c.modifiers.includes("private")) {
        this.children.set(c.name, new NestedSymbol(c, file));
      }
    }
  }
}
