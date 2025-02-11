import { Group } from "./dependencyManager/types";
import { LanguagePlugin } from "./languagesPlugins/types";

// Create cusotm error
export class CannotParseAnnotationError extends Error {
  constructor() {
    super();
    this.message = "Could not parse path from annotation";
    this.name = "AnnotationError";
  }
}

class AnnotationManager {
  private nanoapiRegex: RegExp;
  private commentPrefix: string;
  path: string;
  method?: string;
  group?: string;

  constructor(comment: string, languagePlugin: LanguagePlugin) {
    this.nanoapiRegex = languagePlugin.annotationRegex;
    this.commentPrefix = languagePlugin.commentPrefix;
    const { path, method, group } = this.#parsetext(comment);
    this.path = path;
    this.method = method;
    this.group = group;
  }

  #parsetext(text: string) {
    const matches = text.match(this.nanoapiRegex);

    if (!matches) {
      throw new Error("Could not parse annotation");
    }

    const methodRegex = /method:([^ ]+)/;
    const pathRegex = /path:([^ ]+)/;
    const groupRegex = /group:([^ ]+)/;

    const pathMatches = text.match(pathRegex);
    const methodMatches = text.match(methodRegex);
    const groupMatches = text.match(groupRegex);

    if (!pathMatches) {
      throw new CannotParseAnnotationError();
    }

    const path = pathMatches[1];
    const method = methodMatches ? methodMatches[1] : undefined;
    const group = groupMatches ? groupMatches[1] : undefined;

    return { path, method, group };
  }

  matchesEndpoint(path: string, method: string | undefined) {
    return this.path === path && this.method === method;
  }

  isInGroup(group: Group) {
    // check if annotation has a method (actual endpoint)
    if (this.method) {
      const endpoint = group.endpoints.find(
        (endpoint) =>
          endpoint.method === this.method && endpoint.path === this.path,
      );

      if (endpoint) {
        return true;
      }

      return false;
    }

    // if annotation has no method, we treat it as a module that contains other endpoints
    const endpoints = group.endpoints.filter((endpoint) =>
      endpoint.path.startsWith(this.path),
    );

    if (endpoints.length > 0) {
      return true;
    }

    return false;
  }

  stringify() {
    let annotation = `${this.commentPrefix} @nanoapi`;
    if (this.method) {
      annotation += ` method:${this.method}`;
    }
    if (this.path) {
      annotation += ` path:${this.path}`;
    }
    if (this.group) {
      annotation += ` group:${this.group}`;
    }

    return annotation;
  }
}

export default AnnotationManager;
