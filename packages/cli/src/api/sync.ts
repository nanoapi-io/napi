import { z } from "zod";
import { syncSchema } from "./helpers/validation";
import fs from "fs";
import { Dependencies } from "../helper/types";
import {
  getNanoApiAnnotationFromCommentValue,
  getParserLanguageFromFile,
  replaceCommentFromAnnotation,
} from "../helper/file";
import { getDependencyTree } from "../helper/dependencies";
import Parser from "tree-sitter";
import { iterateOverTree } from "../helper/tree";

export function sync(payload: z.infer<typeof syncSchema>) {
  const tree = getDependencyTree(payload.entrypointPath);

  const endpoints = iterateOverTree(tree);

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

  function iterateOverTreeAndUpdateContent(tree: Dependencies) {
    for (const [filePath, value] of Object.entries(tree)) {
      let sourceCode = fs.readFileSync(filePath, "utf-8");

      updatedEndpoints.forEach((endpoint) => {
        const language = getParserLanguageFromFile(filePath);
        const parser = new Parser();
        parser.setLanguage(language);

        const tree = parser.parse(sourceCode);

        function traverse(node: Parser.SyntaxNode) {
          if (node.type === "comment") {
            const comment = node.text;

            const annotation = getNanoApiAnnotationFromCommentValue(comment);

            if (annotation) {
              if (
                annotation.path === endpoint.path &&
                annotation.method === endpoint.method
              ) {
                annotation.group = endpoint.group;
                const updatedComment = replaceCommentFromAnnotation(
                  comment,
                  annotation,
                );
                // Replace the comment in the source code
                sourceCode = sourceCode.replace(comment, updatedComment);
              }
            }
          }
          node.children.forEach((child) => traverse(child));
        }

        traverse(tree.rootNode);
      });

      // update the file
      fs.writeFileSync(filePath, sourceCode, "utf-8");

      // Recursively process the tree
      if (typeof value !== "string") {
        iterateOverTreeAndUpdateContent(value);
      }
    }
  }

  iterateOverTreeAndUpdateContent(tree);
}
