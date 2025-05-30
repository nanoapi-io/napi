import type {
  AuditManifest,
  DependencyManifest,
  FileAuditManifest,
  FileDependencyManifest,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
  SymbolDependencyManifest,
  SymbolType,
} from "@napi/shared";
import {
  getCollapsedSymbolNodeLabel,
  getExpandedSymbolNodeLabel,
  getNodeWidthAndHeightFromLabel,
} from "../label/index.ts";
import { getMetricsSeverityForNode } from "../metrics/index.ts";
import type { SymbolNapiNodeData } from "./types.ts";
import type { EdgeDefinition, NodeDefinition } from "cytoscape";
import { computeNodeId } from "./file.ts";

function createNodeData(params: {
  id: string;
  fileName: string;
  symbolName: string;
  symbolType: string;
  isExternal: boolean;
  metricsSeverity: {
    [metricLinesCount]: number;
    [metricCodeLineCount]: number;
    [metricCodeCharacterCount]: number;
    [metricCharacterCount]: number;
    [metricDependencyCount]: number;
    [metricDependentCount]: number;
    [metricCyclomaticComplexity]: number;
  };
  expandedLabel: string;
  collapsedLabel: string;
}): SymbolNapiNodeData {
  // Calculate dimensions for expanded and collapsed views
  const { width: expandedWidth, height: expandedHeight } =
    getNodeWidthAndHeightFromLabel(
      params.expandedLabel,
    );

  const { width: collapsedWidth, height: collapsedHeight } =
    getNodeWidthAndHeightFromLabel(
      params.collapsedLabel,
    );

  // Create the node data structure
  return {
    id: params.id,
    position: { x: 0, y: 0 },
    fileName: params.fileName,
    isExternal: params.isExternal,
    symbolName: params.symbolName,
    symbolType: params.symbolType,
    metricsSeverity: params.metricsSeverity,
    expanded: {
      label: params.expandedLabel,
      width: expandedWidth,
      height: expandedHeight,
    },
    collapsed: {
      label: params.collapsedLabel,
      width: collapsedWidth,
      height: collapsedHeight,
    },
  };
}

interface CustomNodeDefinition extends NodeDefinition {
  data: SymbolNapiNodeData & object;
}

function traverseSymbolGraph(
  symbol: SymbolDependencyManifest,
  symbolNodeId: string,
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
  nodeMap: Map<string, CustomNodeDefinition>,
  edgeMap: Map<string, EdgeDefinition>,
  currentDepth: number,
  maxDepsDepth: number,
  maxDependentsDepth: number,
  visited: Set<string>,
) {
  // Process dependencies if we haven't reached max depth
  if (currentDepth < maxDepsDepth) {
    Object.values(symbol.dependencies).forEach((dep) => {
      let depDependencyManifest: FileDependencyManifest | undefined;
      let depAuditManifest: FileAuditManifest | undefined;

      if (!dep.isExternal) {
        depDependencyManifest = dependencyManifest[dep.id];
        depAuditManifest = auditManifest[dep.id];
      }

      Object.keys(dep.symbols).forEach((depSymbolName) => {
        const depSymbolNodeId = computeNodeId(dep.id, depSymbolName);

        // Skip if already visited
        if (visited.has(depSymbolNodeId)) {
          // Add edge even if node was already visited
          const edgeId = `${depSymbolNodeId}->${symbolNodeId}`;
          edgeMap.set(edgeId, {
            data: {
              id: edgeId,
              source: depSymbolNodeId,
              target: symbolNodeId,
            },
          });
          return;
        }
        visited.add(depSymbolNodeId);

        let depSymbolType: SymbolType | "unknown" = "unknown";
        if (depDependencyManifest) {
          depSymbolType = depDependencyManifest.symbols[depSymbolName].type;
        }

        const expandedLabel = getExpandedSymbolNodeLabel({
          currentFileId: dep.id,
          fileName: dep.id,
          symbolName: depSymbolName,
          symbolType: depSymbolType,
          symbolAuditManifest: depAuditManifest?.symbols[depSymbolName],
        });

        const collapsedLabel = getCollapsedSymbolNodeLabel({
          symbolName: depSymbolName,
          symbolType: depSymbolType,
        });

        const metricsSeverity = getMetricsSeverityForNode(
          depAuditManifest?.symbols[depSymbolName],
        );

        const nodeData = createNodeData({
          id: depSymbolNodeId,
          fileName: dep.id,
          symbolName: depSymbolName,
          symbolType: depSymbolType,
          isExternal: dep.isExternal,
          metricsSeverity,
          expandedLabel,
          collapsedLabel,
        });

        nodeMap.set(depSymbolNodeId, { data: nodeData });

        // Add the edge
        const edgeId = `${depSymbolNodeId}->${symbolNodeId}`;
        edgeMap.set(edgeId, {
          data: {
            id: edgeId,
            source: depSymbolNodeId,
            target: symbolNodeId,
          },
        });

        // Recursively process dependencies if not external
        if (!dep.isExternal && depDependencyManifest) {
          traverseSymbolGraph(
            depDependencyManifest.symbols[depSymbolName],
            depSymbolNodeId,
            dependencyManifest,
            auditManifest,
            nodeMap,
            edgeMap,
            currentDepth + 1,
            maxDepsDepth,
            maxDependentsDepth,
            visited,
          );
        }
      });
    });
  }

  // Process dependents if we haven't reached max depth
  if (currentDepth < maxDependentsDepth) {
    Object.values(symbol.dependents).forEach((dep) => {
      const depDependencyManifest = dependencyManifest[dep.id];
      const depAuditManifest = auditManifest[dep.id];

      Object.keys(dep.symbols).forEach((depSymbolName) => {
        const depSymbolNodeId = computeNodeId(dep.id, depSymbolName);

        // Skip if already visited
        if (visited.has(depSymbolNodeId)) {
          // Add edge even if node was already visited
          const edgeId = `${symbolNodeId}->${depSymbolNodeId}`;
          edgeMap.set(edgeId, {
            data: {
              id: edgeId,
              source: symbolNodeId,
              target: depSymbolNodeId,
            },
          });
          return;
        }
        visited.add(depSymbolNodeId);

        const depSymbolType = depDependencyManifest.symbols[depSymbolName].type;

        const expandedLabel = getExpandedSymbolNodeLabel({
          currentFileId: dep.id,
          fileName: dep.id,
          symbolName: depSymbolName,
          symbolType: depSymbolType,
          symbolAuditManifest: depAuditManifest?.symbols[depSymbolName],
        });

        const metricsSeverity = getMetricsSeverityForNode(
          depAuditManifest?.symbols[depSymbolName],
        );

        const isExternal = !dependencyManifest[dep.id];

        const nodeData = createNodeData({
          id: depSymbolNodeId,
          fileName: dep.id,
          symbolName: depSymbolName,
          symbolType: depSymbolType,
          isExternal,
          metricsSeverity,
          expandedLabel,
          collapsedLabel: depSymbolName,
        });

        nodeMap.set(depSymbolNodeId, { data: nodeData });

        // Add the edge
        const edgeId = `${symbolNodeId}->${depSymbolNodeId}`;
        edgeMap.set(edgeId, {
          data: {
            id: edgeId,
            source: symbolNodeId,
            target: depSymbolNodeId,
          },
        });

        // Recursively process dependents
        if (depDependencyManifest) {
          traverseSymbolGraph(
            depDependencyManifest.symbols[depSymbolName],
            depSymbolNodeId,
            dependencyManifest,
            auditManifest,
            nodeMap,
            edgeMap,
            currentDepth + 1,
            maxDepsDepth,
            maxDependentsDepth,
            visited,
          );
        }
      });
    });
  }
}

export function getSymbolElementsForSymbol(
  fileName: string,
  symbolId: string,
  dependencyDepth: number,
  dependentDepth: number,
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
) {
  const fileManifest = dependencyManifest[fileName];
  if (!fileManifest) {
    console.error(`File manifest not found for ${fileName}`);
    return [];
  }
  const symbolManifest = fileManifest.symbols[symbolId];
  if (!symbolManifest) {
    console.error(`Symbol manifest not found for ${symbolId}`);
    return [];
  }

  const fileAuditManifest = auditManifest[fileName];
  const symbolAuditManifest = fileAuditManifest.symbols[symbolId];

  const nodeMap: Map<string, CustomNodeDefinition> = new Map();
  const edgeMap: Map<string, EdgeDefinition> = new Map();
  const visited = new Set<string>();

  const symbolNodeId = computeNodeId(fileName, symbolManifest.id);
  visited.add(symbolNodeId);

  // Create labels for the symbol
  const expandedLabel = getExpandedSymbolNodeLabel({
    currentFileId: fileName,
    fileName,
    symbolName: symbolManifest.id,
    symbolType: symbolManifest.type,
    symbolAuditManifest,
  });
  const collapsedLabel = getCollapsedSymbolNodeLabel({
    symbolName: symbolManifest.id,
    symbolType: symbolManifest.type,
  });

  const metricsSeverity = getMetricsSeverityForNode(symbolAuditManifest);

  const isExternal = !dependencyManifest[fileName];

  const nodeData = createNodeData({
    id: symbolNodeId,
    fileName,
    symbolName: symbolManifest.id,
    symbolType: symbolManifest.type,
    isExternal,
    metricsSeverity,
    expandedLabel,
    collapsedLabel,
  });

  nodeMap.set(symbolNodeId, { data: nodeData });

  // Use the recursive function to process dependencies and dependents
  traverseSymbolGraph(
    symbolManifest,
    symbolNodeId,
    dependencyManifest,
    auditManifest,
    nodeMap,
    edgeMap,
    0,
    dependencyDepth,
    dependentDepth,
    visited,
  );

  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  return [...nodes, ...edges];
}
