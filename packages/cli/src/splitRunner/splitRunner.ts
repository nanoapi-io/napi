import path from "path";
import { Worker } from "worker_threads";
import DependencyTreeManager from "../dependencyManager/dependencyManager";
import { Group } from "../dependencyManager/types";
import { File } from "./types";

class SplitRunner {
  private dependencyTreeManager: DependencyTreeManager;
  private group: Group;

  constructor(dependencyTreeManager: DependencyTreeManager, group: Group) {
    this.dependencyTreeManager = dependencyTreeManager;
    this.group = group;
  }

  run(): Promise<File[]> {
    console.info(`Splitting group: ${this.group.name}`);
    console.time(`${this.group.name ? `${this.group.name}-` : ""}total-time`);

    const worker = new Worker(path.resolve(__dirname, "worker"), {
      workerData: {
        entrypointPath: this.dependencyTreeManager.dependencyTree.path,
        group: this.group,
        files: this.dependencyTreeManager.getFiles(),
      },
    });

    return new Promise<File[]>((resolve, reject) => {
      worker.on("message", (updatedFiles: File[]) => {
        console.timeEnd(
          `${this.group.name ? `${this.group.name}-` : ""}total-time`,
        );
        resolve(updatedFiles);
      });

      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}

export default SplitRunner;
