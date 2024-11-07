import { z } from "zod";
import { syncSchema } from "./helpers/validation";
import fs from "fs";
import {
  parseNanoApiAnnotation,
  updateCommentFromAnnotation,
} from "../helper/annotations";
import {
  getDependencyTree,
  getEndpontsFromTree,
} from "../helper/dependencyTree";
import Parser from "tree-sitter";
import { getParserLanguageFromFile } from "../helper/treeSitter";
import { replaceIndexesFromSourceCode } from "../helper/cleanup";
import { getAnnotationNodes } from "../helper/languages/javascript/annotations";

export function sync(payload: z.infer<typeof syncSchema>) {
  const tree = getDependencyTree(payload.entrypointPath);

  const endpoints = getEndpontsFromTree(tree);

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
    const language = getParserLanguageFromFile(endpoint.filePath);
    const parser = new Parser();
    parser.setLanguage(language);

    let sourceCode = fs.readFileSync(endpoint.filePath, "utf-8");

    const tree = parser.parse(sourceCode);

    const indexesToReplace: {
      startIndex: number;
      endIndex: number;
      text: string;
    }[] = [];

    const annotationNodes = getAnnotationNodes(parser, tree.rootNode);
    annotationNodes.forEach((node) => {
      const annotation = parseNanoApiAnnotation(node.text);
      if (
        annotation.path === endpoint.path &&
        annotation.method === endpoint.method
      ) {
        annotation.group = endpoint.group;
        const updatedComment = updateCommentFromAnnotation(
          node.text,
          annotation,
        );

        indexesToReplace.push({
          startIndex: node.startIndex,
          endIndex: node.endIndex,
          text: updatedComment,
        });
      }
    });

    sourceCode = replaceIndexesFromSourceCode(sourceCode, indexesToReplace);

    fs.writeFileSync(endpoint.filePath, sourceCode, "utf-8");
  });
}
