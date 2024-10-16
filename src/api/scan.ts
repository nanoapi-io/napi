import { getDependencyTree } from '../helper/dependencies';
import { getEndpointsFromFile } from '../helper/file';
import { Dependencies } from '../helper/types';
import { Endpoint } from './types';

export function scan(entrypoint: string, targetDir: string | undefined): Endpoint[] {
  const tree = getDependencyTree(entrypoint);
  const endpoints: Endpoint[] = [];

  iterateOverTree(tree);

  function iterateOverTree(tree: Dependencies, parentFiles: string[] = []) {
    for (const [filePath, value] of Object.entries(tree)) {
      const annotations = getEndpointsFromFile(parentFiles, filePath, tree);
      for (const annotation of annotations) {
        const endpoint = {
          method: annotation.method,
          path: annotation.path,
          group: annotation.group,
          dependencies: {
            handlerFile: annotation.filePath,
            parentFiles: annotation.parentFilePaths,
            childrenFiles: annotation.childrenFilePaths,
          },
        } as Endpoint;
        endpoints.push(endpoint);
      }

      // Recursively process the tree
      if (typeof value !== 'string') {
        const updatedParentFiles = [...parentFiles, filePath];
        iterateOverTree(value, updatedParentFiles);
      }
    }
  }

  return endpoints;
}
