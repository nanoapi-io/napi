import type {
  EdgeDefinition,
  ElementDefinition,
  NodeDefinition,
} from "cytoscape";
import type { AuditManifest, DependencyManifest } from "@napi/shared";
import {
  getCollapsedFileNodeLabel,
  getExpandedFileNodeLabel,
  getNodeWidthAndHeightFromLabel,
} from "../label/index.ts";
import { getMetricsSeverityForNode } from "../metrics/index.ts";
import type { FileNapiNodeData } from "./types.ts";

export function getFileElementsInProject(
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
): ElementDefinition[] {
  interface CustomNodeDefinition extends NodeDefinition {
    data: FileNapiNodeData & object;
  }

  const nodes: CustomNodeDefinition[] = [];
  const edges: EdgeDefinition[] = [];

  Object.values(dependencyManifest).forEach((fileDependencyManifest) => {
    const fileAuditManifest = auditManifest[fileDependencyManifest.id];

    const expandedLabel = getExpandedFileNodeLabel({
      fileName: fileDependencyManifest.id,
      fileAuditManifest,
    });
    const { width: expandedWitdh, height: expandedHeight } =
      getNodeWidthAndHeightFromLabel(
        expandedLabel,
      );

    const collapsedLabel = getCollapsedFileNodeLabel({
      fileName: fileDependencyManifest.id,
      fileAuditManifest,
    });
    const { width: collapsedWidth, height: collapsedHeight } =
      getNodeWidthAndHeightFromLabel(
        collapsedLabel,
      );

    const metricsColors = getMetricsSeverityForNode(fileAuditManifest);

    const nodeElement: CustomNodeDefinition = {
      data: {
        id: fileDependencyManifest.id,
        // initial node position - will be updated by layout
        position: { x: 0, y: 0 },
        fileName: fileDependencyManifest.id,
        isExternal: false,
        metricsSeverity: metricsColors,
        expanded: {
          label: expandedLabel,
          width: expandedWitdh,
          height: expandedHeight,
        },
        collapsed: {
          label: collapsedLabel,
          width: collapsedWidth,
          height: collapsedHeight,
        },
      },
    };

    nodes.push(nodeElement);

    for (
      const fileDependency of Object.values(fileDependencyManifest.dependencies)
    ) {
      if (fileDependency.isExternal) {
        continue;
      }

      if (fileDependency.id === fileDependencyManifest.id) {
        // ignore self-references
        continue;
      }

      edges.push({
        data: {
          source: fileDependencyManifest.id,
          target: fileDependency.id,
        },
      });
    }
  });

  return [...nodes, ...edges];
}
