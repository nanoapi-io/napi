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

export abstract class ConcreteNode implements JavaNode {
  name: string;
  children: Map<string, NestedSymbol>;
  declaration: ExportedSymbol;
  file: JavaFile;
  constructor(declaration: ExportedSymbol, file: JavaFile) {
    this.declaration = declaration;
    this.file = file;
    this.name = declaration.name;
    this.children = new Map();
  }
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

export class FileNode extends ConcreteNode {
  constructor(file: JavaFile) {
    super(file.symbol, file);
    for (const c of this.declaration.children) {
      if (!c.modifiers.includes("private")) {
        this.children.set(c.name, new NestedSymbol(c, file));
      }
    }
  }
}

export class NestedSymbol extends ConcreteNode {
  constructor(symbol: ExportedSymbol, file: JavaFile) {
    super(symbol, file);
    for (const c of this.declaration.children) {
      if (!c.modifiers.includes("private")) {
        this.children.set(c.name, new NestedSymbol(c, file));
      }
    }
  }
}
