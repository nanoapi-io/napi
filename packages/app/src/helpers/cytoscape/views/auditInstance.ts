import { DependencyInfo, DependencyManifest, FileManifest } from "../../../service/api/types/dependencyManifest.js";
import { AuditManifest } from "../../../service/api/types/auditManifest.js";
import { NodeElementDefinition, EdgeElementDefinition, NodeMap, getNodeLabel } from "./auditFile.js";

function getNodeId(
  filePath: string,
  symbolName: string,
): string {
  const joinChar = "|";
  return `${filePath}${joinChar}${symbolName}`;
}

function createNodeElement(params: {
  fileId: string;
  filePath: string;
  symbolName: string;
  symbolType?: string;
  isExternal: boolean;
  isCurrentFile: boolean;
  errorMessages?: string[];
  warningMessages?: string[];
}): NodeElementDefinition {
  const {
    fileId,
    filePath,
    symbolName,
    symbolType,
    isExternal,
    isCurrentFile,
    errorMessages = [],
    warningMessages = [],
  } = params;

  const id = getNodeId(fileId, symbolName);
  const label = getNodeLabel({
    isExpanded: false,
    isExternal,
    type: "instance",
    fileName: filePath,
    instance: { name: symbolName, type: symbolType },
    errorMessages,
    warningMessages,
  });

  return {
    data: {
      id,
      label,
      position: { x: 0, y: 0 },
      isExpanded: false,
      type: "instance",
      isCurrentFile,
      isExternal,
      parent: fileId,
      customData: {
        fileName: filePath,
        instance: { name: symbolName, type: symbolType },
        errorMessages,
        warningMessages,
      },
    },
  };
}

function traverseGraphRecursively(
  manifest: DependencyManifest,
  file: FileManifest,
  symbolName: string,
  direction: "dependencies" | "dependents",
  depth: number,
  visited: Set<string>
): {
  localNodeMap: NodeMap;
  localEdges: EdgeElementDefinition[];
} {
  const nodeMap: NodeMap = {};
  const edges: EdgeElementDefinition[] = [];

  const currentSymbol = file.symbols[symbolName];
  const currentId = getNodeId(file.id, symbolName);

  const mapToTraverse = direction === "dependencies"
    ? currentSymbol.dependencies
    : currentSymbol.dependents;

  for (const targetFileId in mapToTraverse) {
    const connectionInfo = mapToTraverse[targetFileId];
    for (const targetSymbolName in connectionInfo.symbols) {
      const targetId = getNodeId(targetFileId, targetSymbolName);

      if (visited.has(targetId)) continue;
      visited.add(targetId);

      const targetFile = manifest[targetFileId];
      const targetSymbol = targetFile?.symbols[targetSymbolName];

      let isExternal = false;
      if (direction === 'dependencies' && (mapToTraverse[targetFileId] as DependencyInfo).isExternal) {
        isExternal = true;
      }

      const element = createNodeElement({
        fileId: targetFileId,
        filePath: targetFile?.filePath ?? targetFileId,
        symbolName: targetSymbolName,
        symbolType: targetSymbol?.type,
        isExternal,
        isCurrentFile: false,
      });

      nodeMap[targetId] = { element, children: {} };

      edges.push({
        data: {
          source: direction === "dependencies" ? currentId : targetId,
          target: direction === "dependencies" ? targetId : currentId,
          type: direction === "dependencies" ? "dependency" : "dependent",
        },
      });

      if (depth > 1 && !isExternal && targetFile) {
        const subDeps = traverseGraphRecursively(manifest, targetFile, targetSymbolName, direction, depth - 1, visited);

        Object.assign(nodeMap, subDeps.localNodeMap);
        edges.push(...subDeps.localEdges);
      }
    }
  }

  return { localNodeMap: nodeMap, localEdges: edges };
}

function traverseGraphAdaptive(
  manifest: DependencyManifest,
  file: FileManifest,
  symbolName: string,
  currentDepth: number,
  maxDepsDepth: number,
  maxDependentsDepth: number,
  visited: Set<string>
): {
  localNodeMap: NodeMap;
  localEdges: EdgeElementDefinition[];
} {
  const nodeMap: NodeMap = {};
  const edges: EdgeElementDefinition[] = [];

  const currentSymbol = file.symbols[symbolName];
  const currentId = getNodeId(file.id, symbolName);

  // Traverse dependencies
  if (currentDepth < maxDepsDepth) {
    for (const depFileId in currentSymbol.dependencies) {
      const depInfo = currentSymbol.dependencies[depFileId];
      const depFile = manifest[depFileId];

      for (const depSymbolName in depInfo.symbols) {
        const depId = getNodeId(depFileId, depSymbolName);
        if (visited.has(depId)) {
          // Add an edge to this node if the inverse direction is not already present
          // if (!edges.some(edge => edge.data.source === depId && edge.data.target === currentId)) {
          //   edges.push({
          //     data: { source: currentId, target: depId, type: "dependency" },
          //   });
          // }
          // continue;
        }
        visited.add(depId);

        const depSymbol = depFile?.symbols?.[depSymbolName];
        const depNode = createNodeElement({
          fileId: depFileId,
          filePath: depFile?.filePath ?? depFileId,
          symbolName: depSymbolName,
          symbolType: depSymbol?.type,
          isExternal: depInfo.isExternal,
          isCurrentFile: false,
        });

        nodeMap[depId] = { element: depNode, children: {} };
        edges.push({
          data: { source: currentId, target: depId, type: "dependency" },
        });

        if (!depInfo.isExternal && depFile) {
          const sub = traverseGraphAdaptive(
            manifest,
            depFile,
            depSymbolName,
            currentDepth + 1,
            maxDepsDepth,
            maxDependentsDepth,
            visited
          );
          Object.assign(nodeMap, sub.localNodeMap);
          edges.push(...sub.localEdges);
        }
      }
    }
  }

  // Traverse dependents
  if (currentDepth < maxDependentsDepth) {
    for (const depFileId in currentSymbol.dependents) {
      const depInfo = currentSymbol.dependents[depFileId];
      const depFile = manifest[depFileId];

      for (const depSymbolName in depInfo.symbols) {
        const depId = getNodeId(depFileId, depSymbolName);
        if (visited.has(depId)) {
          // Add an edge to this node if the inverse direction is not already present
          // if (!edges.some(edge => edge.data.source === depId && edge.data.target === currentId)) {
          //   edges.push({
          //     data: { source: depId, target: currentId, type: "dependent" },
          //   });
          // }
          // continue;
        }
        visited.add(depId);

        const depSymbol = depFile?.symbols?.[depSymbolName];
        const depNode = createNodeElement({
          fileId: depFileId,
          filePath: depFile?.filePath ?? depFileId,
          symbolName: depSymbolName,
          symbolType: depSymbol?.type,
          isExternal: false,
          isCurrentFile: false,
        });

        nodeMap[depId] = { element: depNode, children: {} };
        edges.push({
          data: { source: depId, target: currentId, type: "dependent" },
        });

        if (depFile) {
          const sub = traverseGraphAdaptive(
            manifest,
            depFile,
            depSymbolName,
            currentDepth + 1,
            maxDepsDepth,
            maxDependentsDepth,
            visited
          );
          Object.assign(nodeMap, sub.localNodeMap);
          edges.push(...sub.localEdges);
        }
      }
    }
  }

  return { localNodeMap: nodeMap, localEdges: edges };
}


export function getInstanceCyElements(
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
  currentFilePath: string,
  currentSymbolName: string,
  dependencyDepth: number = 1,
  dependentDepth: number = 1,
) {
  const currentFile = dependencyManifest[currentFilePath];
  if (!currentFile) throw new Error(`File not found: ${currentFilePath}`);

  const currentSymbol = currentFile.symbols[currentSymbolName];
  if (!currentSymbol) throw new Error(`Symbol not found: ${currentSymbolName}`);

  const currentId = getNodeId(currentFile.id, currentSymbolName);
  const nodeMap: NodeMap = {};
  const edges: EdgeElementDefinition[] = [];

  const currentSymbolElement = createNodeElement({
    fileId: currentFile.id,
    filePath: currentFilePath,
    symbolName: currentSymbolName,
    symbolType: currentSymbol.type,
    isExternal: false,
    isCurrentFile: true,
  });

  nodeMap[currentId] = { element: currentSymbolElement, children: {} };

  const visited = new Set<string>([currentId]);

  const results = traverseGraphAdaptive(
    dependencyManifest,
    currentFile,
    currentSymbolName,
    0,
    dependencyDepth,
    dependentDepth,
    visited
  );

  Object.assign(nodeMap, results.localNodeMap);
  edges.push(...results.localEdges);

  const traverse = (
    nodeMap: NodeMap,
    nodeElements: NodeElementDefinition[] = []
  ): NodeElementDefinition[] => {
    for (const node of Object.values(nodeMap)) {
      nodeElements.push(node.element);
      traverse(node.children, nodeElements);
    }
    return nodeElements;
  };

  // const traverseEdges = (
  //   edges: EdgeElementDefinition[] = []
  // ): EdgeElementDefinition[] => {
  //   const lookup = new Set<string>();
  //   // Go through all the edges and remove cycles
  //   for (const edge of edges) {
  //     const sourceId = edge.data.source;
  //     const targetId = edge.data.target;

  //     // Check if the edge is a cycle
  //     if (sourceId === targetId) {
  //       edges.splice(edges.indexOf(edge), 1);
  //       continue;
  //     }

  //     // Check if the edge is a duplicate
  //     if (edges.some(e => e.data.source === targetId && e.data.target === sourceId)) {
  //       edges.splice(edges.indexOf(edge), 1);
  //       continue;
  //     }
  //   }
  //   return edges;
  // };

  const nodeElements = traverse(nodeMap);
  return [...nodeElements, ...edges];
}