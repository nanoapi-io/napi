import type { JavaInvocationResolver } from "../invocationResolver/index.ts";
import type { JavaFile } from "../packageResolver/types.ts";

/**
 * Represents a file that has been exported along with its dependencies.
 */
export class ExportedFile {
  /**
   * A map of dependencies where the key is the file path and the value is the corresponding JavaFile.
   */
  dependencies: Map<string, JavaFile>;

  /**
   * The main JavaFile instance associated with this exported file.
   */
  file: JavaFile;

  /**
   * Constructs an ExportedFile instance and resolves its dependencies.
   *
   * @param filepath - The file path of the Java file to be exported.
   * @param resolver - An instance of JavaInvocationResolver used to resolve file dependencies.
   */
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
