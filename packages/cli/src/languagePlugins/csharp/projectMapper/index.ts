import fs from "fs";
import path from "path";
import { ResolvedImports } from "../usingResolver";
import Parser from "tree-sitter";

export interface DotNetProject {
  rootFolder: string;
  csprojPath: string;
  globalUsings: ResolvedImports;
}

export class CSharpProjectMapper {
  rootFolder: string;
  subprojects: DotNetProject[];

  constructor(
    files: Map<string, { path: string; rootNode: Parser.SyntaxNode }>,
  ) {
    this.rootFolder = this.#getRootFolder(
      Array.from(files.values().map((file) => file.path)),
    );
    this.subprojects = this.#findSubprojects(this.rootFolder);
  }

  /**
   * Recursively finds all .csproj files in the given directory and its subdirectories.
   * @param dir - The directory to search in.
   * @returns An array of dotnet projects (path to project and csproj file).
   */
  #findSubprojects(dir: string): DotNetProject[] {
    const projects: DotNetProject[] = [];
    const files = fs.readdirSync(dir);
    const seenProjects = new Set<string>();

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        projects.push(...this.#findSubprojects(fullPath));
      } else if (file.endsWith(".csproj")) {
        if (!seenProjects.has(fullPath)) {
          seenProjects.add(fullPath);
          projects.push({
            rootFolder: dir,
            csprojPath: fullPath,
            globalUsings: { internal: [], external: [] },
          });
        }
      }
    }
    return projects;
  }

  #getRootFolder(filepaths: string[]): string {
    if (filepaths.length === 0) {
      throw new Error("No file paths provided");
    }
    const splitPaths = filepaths.map((filepath) => filepath.split(path.sep));
    const commonPath = splitPaths[0].slice();
    for (let i = 0; i < commonPath.length; i++) {
      for (let j = 1; j < splitPaths.length; j++) {
        if (splitPaths[j][i] !== commonPath[i]) {
          commonPath.splice(i);
          return path.join(...commonPath);
        }
      }
    }
    return path.join(...commonPath);
  }

  /**
   * Finds the subproject that contains the given file.
   * @param filePath - The path to the file.
   * @returns The subproject that contains the file, or null if not found.
   */
  findSubprojectForFile(filePath: string): DotNetProject | null {
    let mostPreciseProject: DotNetProject | null = null;
    // Check what subprojects contains the file
    // We assume that the most precise project is the one with the longest rootFolder
    // (In case there are nested projects)
    for (const project of this.subprojects) {
      if (filePath.startsWith(project.rootFolder)) {
        if (
          mostPreciseProject === null ||
          project.rootFolder.length > mostPreciseProject.rootFolder.length
        ) {
          mostPreciseProject = project;
        }
      }
    }
    return mostPreciseProject;
  }

  /**
   * Updates the global usings for the subprojects
   * @param globalUsings - The global usings to set for the subprojects
   */
  updateGlobalUsings(globalUsings: ResolvedImports, subproject: DotNetProject) {
    globalUsings.internal.forEach((symbol) => {
      subproject.globalUsings.internal.push(symbol);
    });
    globalUsings.external.forEach((symbol) => {
      subproject.globalUsings.external.push(symbol);
    });
  }

  /**
   * Gets the global usings for the given file.
   * @param filepath - The path to the file.
   * @returns The global usings for the file.
   */
  getGlobalUsings(filepath: string): ResolvedImports {
    const subproject = this.findSubprojectForFile(filepath);
    if (subproject) {
      return subproject.globalUsings;
    }
    return { internal: [], external: [] };
  }
}
