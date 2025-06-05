import type { ExportedSymbol, JavaFile } from "../packageResolver/types.ts";

export interface JavaNode {
  name: string;
  children: Map<string, JavaNode>;
}

export class AbstractNode implements JavaNode {
  name: string;
  children: Map<string, JavaNode>;
  constructor(name: string) {
    this.name = name;
    this.children = new Map();
  }
}

export interface ConcreteNode extends JavaNode {
  name: string;
  children: Map<string, NestedSymbol>;
  declaration: ExportedSymbol;
  file: JavaFile;
}

export class JavaTree extends AbstractNode {
  constructor() {
    super("");
  }

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

  getImport(name: string): Map<string, FileNode> | undefined {
    if (name.endsWith("*")) {
      const node = this.getNode(name.substring(0, name.length - 2));
      if (node) {
        const map = new Map<string, FileNode>();
        for (const v of node.children.values()) {
          if (v instanceof FileNode) {
            map.set(v.name, v);
          }
        }
        return map;
      }
    } else {
      const node = this.getNode(name);
      if (node && node instanceof FileNode) {
        const map = new Map<string, FileNode>();
        map.set(node.name, node);
        return map;
      }
    }
    return undefined;
  }
}

export class FileNode implements ConcreteNode {
  name: string;
  children: Map<string, NestedSymbol>;
  declaration: ExportedSymbol;
  file: JavaFile;
  constructor(file: JavaFile) {
    this.file = file;
    this.name = file.symbol.name;
    this.declaration = file.symbol;
    this.children = new Map();
    for (const c of this.declaration.children) {
      if (!c.modifiers.includes("private")) {
        this.children.set(c.name, new NestedSymbol(c, file));
      }
    }
  }
}

export class NestedSymbol implements ConcreteNode {
  name: string;
  children: Map<string, NestedSymbol>;
  declaration: ExportedSymbol;
  file: JavaFile;
  constructor(symbol: ExportedSymbol, file: JavaFile) {
    this.name = symbol.name;
    this.declaration = symbol;
    this.file = file;
    this.children = new Map();
    for (const c of this.declaration.children) {
      if (!c.modifiers.includes("private")) {
        this.children.set(c.name, new NestedSymbol(c, file));
      }
    }
  }
}
