import { z } from "zod";
import { syncSchema } from "./helpers/validation";
import fs from "fs";
import DependencyTreeManager from "../dependencyManager/dependencyManager";
import AnnotationManager from "../annotationManager";
import { getLanguagePluginFromFilePath } from "../languagesPlugins";
import { replaceIndexesFromSourceCode } from "../helper/file";

export function sync(payload: z.infer<typeof syncSchema>) {
  const dependencyTreeManager = new DependencyTreeManager(
    payload.entrypointPath,
  );

  const endpoints = dependencyTreeManager.getEndponts();

  const updatedEndpoints = endpoints.map((endpoint) => {
    const updatedEndpoint = payload.endpoints.find(
      (e) => e.path === endpoint.path && e.method === endpoint.method,
    );

    if (updatedEndpoint) {
      return {
        ...endpoint,
        group: updatedEndpoint.group,
      };
    }

    return endpoint;
  });

  updatedEndpoints.forEach((endpoint) => {
    const languagePlugin = getLanguagePluginFromFilePath(endpoint.filePath);

    const sourceCode = fs.readFileSync(endpoint.filePath, "utf-8");

    const tree = languagePlugin.parser.parse(sourceCode);

    const indexesToReplace: {
      startIndex: number;
      endIndex: number;
      text: string;
    }[] = [];

    const commentNodes = languagePlugin.getCommentNodes(tree.rootNode);

    commentNodes.forEach((node) => {
      try {
        const annotationManager = new AnnotationManager(
          node.text,
          languagePlugin,
        );
        if (annotationManager.matchesEndpoint(endpoint.path, endpoint.method)) {
          annotationManager.group = endpoint.group;
          const updatedComment = annotationManager.stringify();

          indexesToReplace.push({
            startIndex: node.startIndex,
            endIndex: node.endIndex,
            text: updatedComment,
          });
        }
      } catch {
        // Skip if annotation is not valid, we assume it is a regular comment
        return;
      }
    });

    const updatedSourceCode = replaceIndexesFromSourceCode(
      sourceCode,
      indexesToReplace,
    );

    fs.writeFileSync(endpoint.filePath, updatedSourceCode, "utf-8");
  });
}
