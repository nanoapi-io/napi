import { basename, dirname, join } from "@std/path";
import type {
  ExternalSymbol,
  InternalSymbol,
  ResolvedImports,
  UsingDirective,
} from "../usingResolver/index.ts";

/**
 * Represents a .NET project.
 */
export interface DotNetProject {
  /**
   * The root folder of the project.
   */
  rootFolder: string;

  /**
   * The name of the project.
   */
  name: string;

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
  globalUsings: GlobalUsings;
}

/**
 * Interface for a subproject's global usings
 */
export interface GlobalUsings {
  /**
   * The internal symbols used in the project.
   */
  internal: InternalSymbol[];
  /**
   * The external symbols used in the project.
   */
  external: ExternalSymbol[];
  /**
   * The using directives that define the global usings.
   */
  directives: UsingDirective[];
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
        rootFolder: dirname(csprojPath).replace(/\\/g, "/"), // Ensure UNIX format
        name: basename(csprojPath, ".csproj").replace(/\\/g, "/"), // Ensure UNIX format
        csprojPath,
        csprojContent: csprojContent.content,
        globalUsings: { internal: [], external: [], directives: [] },
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
      throw new Error(
        "No .csproj files found. Make sure to include .csproj files along with .cs files in .napirc and that such files exist in your project.",
      );
    }
    const splitPaths = filepaths.map((filepath) => filepath.split("/"));
    const commonPath = splitPaths[0].slice();
    for (let i = 0; i < commonPath.length; i++) {
      for (let j = 1; j < splitPaths.length; j++) {
        if (splitPaths[j][i] !== commonPath[i]) {
          commonPath.splice(i);
          let rootFolder = join("", ...commonPath).replace(/\\/g, "/");
          if (filepaths[0].startsWith("/")) {
            rootFolder = "/" + rootFolder;
          }
          return rootFolder;
        }
      }
    }
    let rootFolder = join("", ...commonPath).replace(/\\/g, "/");
    if (filepaths[0].startsWith("/")) {
      rootFolder = "/" + rootFolder;
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
      if (
        filePath.startsWith(project.rootFolder) ||
        project.rootFolder === "."
      ) {
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
  updateGlobalUsings(globalUsings: GlobalUsings, subproject: DotNetProject) {
    globalUsings.internal.forEach((symbol) => {
      subproject.globalUsings.internal.push(symbol);
    });
    globalUsings.external.forEach((symbol) => {
      subproject.globalUsings.external.push(symbol);
    });
    globalUsings.directives.forEach((directive) => {
      subproject.globalUsings.directives.push(directive);
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
