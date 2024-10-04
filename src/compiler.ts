import path from "path";
import fs from "fs";
import dependencyTree from "dependency-tree";
import { NanoAPIAnnotation } from "./helper/types";
import { getAnnotationsFromFile } from "./helper/file";
export class Compiler {
  entrypoint: string;
  targetDir: string;
  outputDir: string;
  splitDirName: string;
  annotationIndex: number;
  constructor(
    entrypoint: string, // Path to the entrypoint file
    targetDir: string, // Path to the target directory
    outputDir: string // Path to the output directory
  ) {
    this.entrypoint = entrypoint;
    this.targetDir = targetDir || path.dirname(entrypoint);
    this.outputDir = outputDir;
    this.splitDirName = "nanoapi-split";
    this.annotationIndex = 0;
  }

  run() {
    console.log("Running compiler...");
    const tree = this.getDependencyTree();
    this.cleanupOutputDir();
    this.createOutputDir();
    this.iterateOverTree(tree);
  }

  // This function returns a dependency tree of the entrypoint file
  // this is a nested object structured like this:
  //   {
  //     '/home/USER/code/express-nanoapi/dist/index.js': {
  //       '/home/USER/code/express-nanoapi/dist/server.js': {
  //         '/home/USER/code/express-nanoapi/dist/users/router.js': [Object],
  //         '/home/USER/code/express-nanoapi/dist/posts/router.js': [Object]
  //       }
  //     }
  //   }
  getDependencyTree() {
    const directory = path.dirname(this.entrypoint);
    const tree = dependencyTree({
      filename: this.entrypoint,
      directory: directory,
      filter: (filePath) => filePath.includes(this.targetDir),
    });
    console.log(JSON.stringify(tree));
    return tree;
  }

  async cleanupOutputDir() {
    const splitDirectory = path.join(this.outputDir, this.splitDirName);
    if (fs.existsSync(splitDirectory)) {
      fs.rmSync(splitDirectory, { recursive: true });
    }
  }

  async createOutputDir() {
    const splitDirectory = path.join(this.outputDir, this.splitDirName);
    fs.mkdirSync(splitDirectory, { recursive: true });
  }

  async iterateOverTree(
    tree: dependencyTree.Tree | dependencyTree.TreeInnerNode,
    parentFiles: string[] = []
  ) {
    for (const [key, value] of Object.entries(tree)) {
      const filePath = key;
      const annotations = await getAnnotationsFromFile(
        parentFiles,
        filePath,
        tree as dependencyTree.TreeInnerNode,
        "@nanoapi"
      );
      for (const annotation of annotations) {
        this.splitPath(annotation);
      }
      // if value is not a string, it means it's a nested object
      // so we should call this function recursively to go over the rest of the tree
      if (typeof value !== "string") {
        const updatedParentKeys = [...parentFiles, filePath];
        this.iterateOverTree(value, updatedParentKeys);
      }
    }
  }

  splitPath(annotation: NanoAPIAnnotation) {
    const splitDirectory = path.join(this.outputDir, this.splitDirName);
    const annotationDirectory = path.join(
      splitDirectory,
      this.annotationIndex.toString()
    );
    this.annotationIndex++;

    fs.mkdirSync(annotationDirectory, { recursive: true });
    for (const filePath of annotation.filePaths) {
      const relativeFileNamePath = path.relative(this.targetDir, filePath);

      const destinationPath = path.join(
        annotationDirectory,
        relativeFileNamePath
      );

      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(filePath, destinationPath);
    }
  }
}
