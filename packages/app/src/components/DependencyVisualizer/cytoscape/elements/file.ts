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

export function computeNodeId(fileId: string, symbolId: string) {
  return `${fileId}:${symbolId}`;
}

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

function processDependencies(
  symbol: SymbolDependencyManifest,
  symbolNodeId: string,
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
  nodes: CustomNodeDefinition[],
  edges: EdgeDefinition[],
) {
  Object.values(symbol.dependencies).forEach((dep) => {
    let depDependencyManifest: FileDependencyManifest | undefined;
    let depAuditManifest: FileAuditManifest | undefined;

    if (!dep.isExternal) {
      depDependencyManifest = dependencyManifest[dep.id];
      depAuditManifest = auditManifest[dep.id];
    }

    // For each symbol this depends on, create an edge
    Object.keys(dep.symbols).forEach((depSymbolName) => {
      const depSymbolNodeId = computeNodeId(dep.id, depSymbolName);

      // Check if node already exists
      const existingNode = nodes.find(
        (node) => node.data.id === depSymbolNodeId,
      );

      if (!existingNode) {
        let depSymbolType: SymbolType | "unknown" = "unknown";
        if (depDependencyManifest) {
          depSymbolType = depDependencyManifest.symbols[depSymbolName].type;
        }

        // Create label for dependency nodes
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

        nodes.push({ data: nodeData });
      }

      // Add the edge
      const edgeId = `${depSymbolNodeId}->${symbolNodeId}`;
      edges.push({
        data: {
          id: edgeId,
          source: depSymbolNodeId,
          target: symbolNodeId,
        },
      });
    });
  });
}

function processDependents(
  symbol: SymbolDependencyManifest,
  symbolNodeId: string,
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
  nodes: CustomNodeDefinition[],
  edges: EdgeDefinition[],
) {
  Object.values(symbol.dependents).forEach((dep) => {
    const depDependencyManifest = dependencyManifest[dep.id];
    const depAuditManifest = auditManifest[dep.id];

    Object.keys(dep.symbols).forEach((depSymbolName) => {
      const depSymbolNodeId = computeNodeId(dep.id, depSymbolName);

      // Check if node already exists
      const existingNode = nodes.find(
        (node) => node.data.id === depSymbolNodeId,
      );

      if (!existingNode) {
        const depSymbolType = depDependencyManifest.symbols[depSymbolName].type;

        // Create label for dependent nodes
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

        nodes.push({ data: nodeData });
      }

      // Add the edge
      const edgeId = `${symbolNodeId}->${depSymbolNodeId}`;
      edges.push({
        data: {
          id: edgeId,
          source: symbolNodeId,
          target: depSymbolNodeId,
        },
      });
    });
  });
}

export function getSymbolElementsInFile(
  fileId: string,
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
) {
  const fileManifest = dependencyManifest[fileId];
  if (!fileManifest) {
    console.error(`File manifest not found for ${fileId}`);
    return [];
  }

  const fileAuditManifest = auditManifest[fileId];
  const nodes: CustomNodeDefinition[] = [];
  const edges: EdgeDefinition[] = [];

  // First pass: Create nodes for each symbol in the file
  Object.values(fileManifest.symbols).forEach((symbol) => {
    const symbolAuditManifest = fileAuditManifest.symbols[symbol.id];
    const symbolNodeId = computeNodeId(fileId, symbol.id);

    // Create labels for the symbol
    const expandedLabel = getExpandedSymbolNodeLabel({
      currentFileId: fileId,
      fileName: fileId,
      symbolName: symbol.id,
      symbolType: symbol.type,
      symbolAuditManifest,
    });
    const collapsedLabel = getCollapsedSymbolNodeLabel({
      symbolName: symbol.id,
      symbolType: symbol.type,
    });

    const metricsSeverity = getMetricsSeverityForNode(symbolAuditManifest);

    const isExternal = !dependencyManifest[fileId];

    const nodeData = createNodeData({
      id: symbolNodeId,
      fileName: fileId,
      symbolName: symbol.id,
      symbolType: symbol.type,
      isExternal,
      metricsSeverity,
      expandedLabel,
      collapsedLabel,
    });

    nodes.push({ data: nodeData });
  });

  // Second pass: Create nodes and edges for dependencies and dependents
  Object.values(fileManifest.symbols).forEach((symbol) => {
    const symbolNodeId = computeNodeId(fileId, symbol.id);

    // Process dependencies
    processDependencies(
      symbol,
      symbolNodeId,
      dependencyManifest,
      auditManifest,
      nodes,
      edges,
    );

    // Process dependents
    processDependents(
      symbol,
      symbolNodeId,
      dependencyManifest,
      auditManifest,
      nodes,
      edges,
    );
  });

  return [...nodes, ...edges];
}
