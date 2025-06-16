import type { JavaInvocationResolver } from "../invocationResolver/index.ts";
import type { JavaFile } from "../packageResolver/types.ts";

export class ExportedFile {
  dependencies: Map<string, JavaFile>;
  file: JavaFile;
  constructor(filepath: string, resolver: JavaInvocationResolver) {
    this.file = resolver.mapper.files.get(filepath)!;
    this.dependencies = new Map();
    const stack = [this.file];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (this.dependencies.has(current.path)) {
        continue;
      }
      this.dependencies.set(current.path, current);
      const currentDep = resolver.getInvocations(current).resolved;
      stack.push(...currentDep.values().map((v) => v.file));
    }
  }
}
