import path from "path";
import { ResolvedImports } from "../usingResolver/index.js";

/**
 * Represents a .NET project.
 */
export interface DotNetProject {
  /**
   * The root folder of the project.
   */
  rootFolder: string;

  /**
   * The path to the .csproj file of the project.
   */
  csprojPath: string;

  /**
   * The content of the .csproj file of the project
   */
  csprojContent: string;

  /**
   * The global usings resolved for the project.
   */
  globalUsings: ResolvedImports;
}

export class CSharpProjectMapper {
  rootFolder: string;
  subprojects: DotNetProject[];

  constructor(csprojFiles: Map<string, { path: string; content: string }>) {
    this.rootFolder = this.#getRootFolder(
      Array.from(csprojFiles.values()).map((csproj) => csproj.path),
    );
    this.subprojects = this.#makeSubprojects(csprojFiles);
  }

  /**
   * Recursively finds all .csproj files in the given directory and its subdirectories.
   * @param dir - The directory to search in.
   * @returns An array of dotnet projects (path to project and csproj file).
   */
  #makeSubprojects(
    csprojFiles: Map<string, { path: string; content: string }>,
  ): DotNetProject[] {
    const subprojects: DotNetProject[] = [];
    for (const [csprojPath, csprojContent] of csprojFiles) {
      const subproject: DotNetProject = {
        rootFolder: path.dirname(csprojPath),
        csprojPath,
        csprojContent: csprojContent.content,
        globalUsings: { internal: [], external: [] },
      };
      subprojects.push(subproject);
    }
    return subprojects;
  }

  /**
   * Gets the root folder of the project based on the provided file paths.
   * @param filepaths - An array of file paths.
   * @returns The root folder path.
   */
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
          let rootFolder = path.join(...commonPath);
          if (filepaths[0].startsWith(path.sep)) {
            rootFolder = path.sep + rootFolder;
          }
          return rootFolder;
        }
      }
    }
    let rootFolder = path.join(...commonPath);
    if (filepaths[0].startsWith(path.sep)) {
      rootFolder = path.sep + rootFolder;
    }
    return rootFolder;
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
