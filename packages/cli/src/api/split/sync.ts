import { z } from "zod";
import fs from "fs";
import DependencyTreeManager from "../../dependencyManager/dependencyManager";
import AnnotationManager, {
  CannotParseAnnotationError,
} from "../../annotationManager";
import { getLanguagePlugin } from "../../legacyLanguagesPlugins";
import { replaceIndexesFromSourceCode } from "../../helpers/file";
import { localConfigSchema } from "../../config/localConfig";
import path from "path";

export const syncSchema = z.object({
  endpoints: z.array(
    z.object({
      path: z.string(),
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
      group: z.string().optional(),
    }),
  ),
});

export function sync(
  napiConfig: z.infer<typeof localConfigSchema>,
  payload: z.infer<typeof syncSchema>,
) {
  const dependencyTreeManager = new DependencyTreeManager(
    napiConfig.entrypoint,
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
    const languagePlugin = getLanguagePlugin(
      path.dirname(napiConfig.entrypoint),
      endpoint.filePath,
    );

    const sourceCode = fs.readFileSync(endpoint.filePath, "utf-8");

    const tree = languagePlugin.parser.parse(sourceCode);

    const indexesToReplace: {
      startIndex: number;
      endIndex: number;
      text: string;
    }[] = [];

    const annotationNodes = languagePlugin.getAnnotationNodes(tree.rootNode);

    annotationNodes.forEach((node) => {
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
      } catch (e) {
        if (e instanceof CannotParseAnnotationError) {
          // Skip if annotation is not valid, we assume it is a regular comment
          return;
        }
        throw e;
      }
    });

    const updatedSourceCode = replaceIndexesFromSourceCode(
      sourceCode,
      indexesToReplace,
    );

    fs.writeFileSync(endpoint.filePath, updatedSourceCode, "utf-8");
  });
}
