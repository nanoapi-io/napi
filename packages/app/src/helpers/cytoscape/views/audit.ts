import {
  Core,
  ElementDefinition,
  NodeSingular,
  StylesheetJson,
} from "cytoscape";
import tailwindConfig from "../../../../tailwind.config";
import { FcoseLayoutOptions } from "cytoscape-fcose";
import { getNodeWidthAndHeightFromLabel } from "../sizeAndPosition";
import {
  AuditManifest,
  AuditMessage,
  FileAuditManifest,
} from "../../../service/api/types/auditManifest";
import { DependencyManifest } from "../../../service/api/types/dependencyManifest";
import { Theme } from "../../../contexts/ThemeContext";

export type ViewType =
  | "default"
  | "linesOfCode"
  | "characters"
  | "dependencies";

export interface NodeElementDefinition extends ElementDefinition {
  data: {
    id: string;
    position: { x: number; y: number };
    customData: {
      fileName: string;
      loc: number;
      dependencies: number;
      totalSymbols: number;
      viewColors: {
        default: string;
        linesOfCode: string;
        characters: string;
        dependencies: string;
      };
      errors: string[];
      warnings: string[];
      expanded: {
        label: string;
        width: number;
        height: number;
      };
      collapsed: {
        label: string;
        width: number;
        height: number;
      };
    } & object;
  };
}

export interface EdgeElementDefinition extends ElementDefinition {
  data: {
    source: string;
    target: string;
  };
}

export function getCyElements(
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
  theme: Theme,
) {
  const nodes = createNodes(dependencyManifest, auditManifest, theme);
  const edges = createEdges(dependencyManifest);

  return [...nodes, ...edges];
}

function createNodes(
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
  theme: Theme,
): NodeElementDefinition[] {
  const nodes: NodeElementDefinition[] = [];

  Object.values(dependencyManifest).forEach((fileDependencyManifest) => {
    const fileAuditManifest = auditManifest[fileDependencyManifest.id];
    const errorMessages: string[] = Object.values(fileAuditManifest.errors).map(
      (auditMessage) => auditMessage.shortMessage,
    );
    const warningMessages: string[] = Object.values(
      fileAuditManifest.warnings,
    ).map((auditMessage) => auditMessage.shortMessage);

    const expandedLabel = getExpandedNodeLabel({
      fileName: fileDependencyManifest.id,
      fileAuditManifest,
    });
    const { width: expandedWitdh, height: expandedHeight } =
      getNodeWidthAndHeightFromLabel(expandedLabel);

    const collapsedLabel = getCollapsedNodeLabel({
      fileName: fileDependencyManifest.id,
      fileAuditManifest,
    });
    const { width: collapsedWidth, height: collapsedHeight } =
      getNodeWidthAndHeightFromLabel(collapsedLabel);

    const viewColors = getAuditColorsForNode(theme, fileAuditManifest);

    const nodeElement: NodeElementDefinition = {
      data: {
        id: fileDependencyManifest.id,
        // initial node position - will be updated by layout
        position: { x: 0, y: 0 },
        customData: {
          fileName: fileDependencyManifest.id,
          loc: fileDependencyManifest.lineCount,
          dependencies: Object.keys(fileDependencyManifest.dependencies).length,
          totalSymbols: Object.keys(fileDependencyManifest.symbols).length,
          viewColors,
          errors: errorMessages,
          warnings: warningMessages,
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
      },
    };

    nodes.push(nodeElement);
  });

  return nodes;
}

function createEdges(
  dependencyManifest: DependencyManifest,
): EdgeElementDefinition[] {
  const edges: EdgeElementDefinition[] = [];

  Object.values(dependencyManifest).forEach((fileManifest) => {
    Object.values(fileManifest.dependencies).forEach((dependency) => {
      if (dependency.isExternal) {
        return;
      }

      edges.push({
        data: {
          source: dependency.id,
          target: fileManifest.id,
        },
      });
    });
  });

  return edges;
}

function getCyStyleSheet(theme: Theme) {
  return [
    {
      selector: "node",
      style: {
        "text-wrap": "wrap",
        color: tailwindConfig.theme.extend.colors.text[theme],
        "border-width": 1,
        "border-color": tailwindConfig.theme.extend.colors.border[theme],
        "text-valign": "center",
        "text-halign": "center",
        shape: "round-rectangle",
        width: 20,
        height: 20,
      },
    },
    {
      selector: "node.background",
      style: {
        opacity: 0.2,
      },
    },
    {
      selector: "node.selected",
      style: {
        label: "data(customData.expanded.label)",
        "background-color":
          tailwindConfig.theme.extend.colors.background[theme],
        "border-width": 3,
        "z-index": 2000,
        width: "data(customData.expanded.width)",
        height: "data(customData.expanded.height)",
      },
    },
    {
      selector: "node.connected",
      style: {
        label: "data(customData.collapsed.label)",
        "background-color":
          tailwindConfig.theme.extend.colors.background[theme],
        "border-width": 3,
        "z-index": 1000,
        width: "data(customData.collapsed.width)",
        height: "data(customData.collapsed.height)",
      },
    },
    {
      selector: "node.highlighted",
      style: {
        "background-color": tailwindConfig.theme.extend.colors.secondary[theme],
        "z-index": 1000,
        "min-width": 50,
        "min-height": 50,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1,
        "line-color": tailwindConfig.theme.extend.colors.text[theme],
        "line-opacity": 0.5,
        "target-arrow-color": tailwindConfig.theme.extend.colors.text[theme],
        "target-arrow-shape": "triangle",
        "curve-style": "unbundled-bezier",
        "arrow-scale": 1,
      },
    },
    {
      selector: "edge.background",
      style: {
        "line-opacity": 0.1,
      },
    },
    {
      selector: "edge.dependency",
      style: {
        width: 2,
        "line-opacity": 1,
        "z-index": 1000,
        "line-color": tailwindConfig.theme.extend.colors.secondary[theme],
        "target-arrow-color":
          tailwindConfig.theme.extend.colors.secondary[theme],
      },
    },
    {
      selector: "edge.dependent",
      style: {
        width: 2,
        "line-opacity": 1,
        "z-index": 1000,
        "line-color": tailwindConfig.theme.extend.colors.primary[theme],
        "target-arrow-color": tailwindConfig.theme.extend.colors.primary[theme],
      },
    },
  ] as StylesheetJson;
}

export function setStylesForNodes(cy: Core, theme: Theme, viewType: ViewType) {
  const styleSheet = getCyStyleSheet(theme);
  cy.style(styleSheet);

  cy.nodes().style({
    "background-color": (node: NodeSingular) =>
      node.data(`customData.viewColors.${viewType}`),
  });
}

export const layout = {
  name: "fcose",
  quality: "proof",
  nodeRepulsion: 1000000,
  idealEdgeLength: 200,
  gravity: 0.1,
  packComponents: true,
  nodeDimensionsIncludeLabels: true,
} as FcoseLayoutOptions;

const errorChar = "❗";
const warningChar = "⚠️";
const successChar = "🎉";

function getExpandedNodeLabel(data: {
  fileName: string;
  fileAuditManifest: FileAuditManifest;
}) {
  let label = data.fileName;

  const errorMessages = Object.values(data.fileAuditManifest.errors).map(
    (auditMessage) => auditMessage.shortMessage,
  );
  const warningMessages = Object.values(data.fileAuditManifest.warnings).map(
    (auditMessage) => auditMessage.shortMessage,
  );

  if (errorMessages.length > 0 || warningMessages.length > 0) {
    errorMessages.forEach((message) => {
      label += `\n${errorChar} ${message}`;
    });
    warningMessages.forEach((message) => {
      label += `\n${warningChar} ${message}`;
    });
  } else {
    label += `\n${successChar} No issues found`;
  }

  return label;
}

function getCollapsedNodeLabel(data: {
  fileName: string;
  fileAuditManifest: FileAuditManifest;
}) {
  const fileNameMaxLength = 25;
  const fileName =
    data.fileName.length > fileNameMaxLength
      ? `...${data.fileName.slice(-fileNameMaxLength)}`
      : data.fileName;

  let label = fileName;

  const errorMessages = Object.values(data.fileAuditManifest.errors).map(
    (auditMessage) => auditMessage.shortMessage,
  );
  const warningMessages = Object.values(data.fileAuditManifest.warnings).map(
    (auditMessage) => auditMessage.shortMessage,
  );

  if (errorMessages.length > 0) {
    label += `\n${errorChar}(${errorMessages.length})`;
  }
  if (warningMessages.length > 0) {
    label += `\n${warningChar}(${warningMessages.length})`;
  }

  return label;
}

function getAuditColorsForNode(
  theme: Theme,
  nodeAuditManifest: FileAuditManifest | undefined,
): {
  default: string;
  linesOfCode: string;
  characters: string;
  dependencies: string;
} {
  const defaultColor = tailwindConfig.theme.extend.colors.primary[theme];
  const severityColorMap = [
    { threshold: 1.0, color: "#8BC34A" }, // green
    { threshold: 1.2, color: "#ffdd00" }, // yellow
    { threshold: 1.5, color: "#ff8c00" }, // orange
    { threshold: 2.0, color: "#dc1414" }, // red
  ];

  if (!nodeAuditManifest || !nodeAuditManifest.lookup) {
    return {
      default: defaultColor,
      linesOfCode: defaultColor,
      characters: defaultColor,
      dependencies: defaultColor,
    };
  }

  function getColorForMetric(auditError: AuditMessage | undefined): string {
    if (!auditError) {
      return severityColorMap[0].color;
    }

    const ratio = parseFloat(auditError.value) / parseFloat(auditError.target);

    for (const severityColor of severityColorMap) {
      if (ratio <= severityColor.threshold) {
        return severityColor.color;
      }
    }

    return severityColorMap[severityColorMap.length - 1].color;
  }

  return {
    default: defaultColor,
    linesOfCode: getColorForMetric(
      nodeAuditManifest.lookup.targetMaxLineInFile?.[0],
    ),
    characters: getColorForMetric(
      nodeAuditManifest.lookup.targetMaxCharInFile?.[0],
    ),
    dependencies: getColorForMetric(
      nodeAuditManifest.lookup.targetMaxDepPerFile?.[0],
    ),
  };
}
