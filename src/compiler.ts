import path from "path";
import fs from "fs";
import dependencyTree from "dependency-tree";
import { NanoAPIAnnotation } from "./helper/types";
import { getAnnotationsFromFile } from "./helper/file";

export class Compiler {
  entrypoint: string;
  excludeDirs: string[];
  outputDir: string;
  constructor(
    entrypoint: string, // Path to the entrypoint file
    excludeDirs: string[], // Array of paths to exclude from the dependency tree
    outputDir: string // Path to the output directory
  ) {
    this.entrypoint = entrypoint;
    this.excludeDirs = excludeDirs;
    this.outputDir = outputDir;
  }

  run() {
    console.log("Running compiler...");
    const tree = this.getDependencyTree();

    this.createOutputFolder();

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
      filter: (filePath) =>
        !this.excludeDirs.some((dir) => filePath.includes(dir)),
    });

    console.log(tree);

    return tree;
  }

  async createOutputFolder() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir);
    }

    const splitDirectory = path.join(this.outputDir, "nanoapi-split");
    if (!fs.existsSync(splitDirectory)) {
      fs.mkdirSync(splitDirectory);
    }
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
        //   this.splitPath(tree, parentFiles, filePath, annotation);
        console.log(annotation);
      }

      // if value is not a string, it means it's a nested object
      // so we should call this function recursively to go over the rest of the tree
      if (typeof value !== "string") {
        const updatedParentKeys = [...parentFiles, filePath];
        this.iterateOverTree(value, updatedParentKeys);
      }
    }
  }

  splitPath(
    tree: dependencyTree.Tree,
    parentfilePaths: string[],
    filePath: string,
    annotation: NanoAPIAnnotation
  ) {
    console.log("Splitting path...");
    console.log(parentfilePaths);
    console.log(filePath);
    console.log(annotation);

    parentfilePaths.forEach((parentFilePath) => {
      //   console.log(tree);
      //   console.log(111111, parentFilePath);
    });

    // Create a new folder for the API
  }
}
