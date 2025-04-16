import { ElementDefinition, StylesheetJson } from "cytoscape";
import tailwindConfig from "../../../../tailwind.config";
import { AuditResponse } from "../../../service/auditApi/types";
import { FcoseLayoutOptions } from "cytoscape-fcose";
import { getNodeWidthAndHeightFromLabel } from "../sizeAndPosition";

export interface NodeElementDefinition extends ElementDefinition {
  data: {
    id: string;
    position: { x: number; y: number };
    "x-audit-color"?: string;
    customData: {
      fileName: string;
      loc: number;
      dependencies: number;
      totalSymbols: number;
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

export function getCyElements(auditResponse: AuditResponse) {
  const nodes: NodeElementDefinition[] = [];
  const edges: EdgeElementDefinition[] = [];

  // initial node position
  // will be updated by layout
  const x = 0;
  const y = 0;

  Object.values(auditResponse.dependencyManifest).forEach((fileManifest) => {
    const errorMessages: string[] = [];
    const warningMessages: string[] = [];

    const fileAuditManifest = auditResponse.auditManifest[fileManifest.id];
    if (fileAuditManifest) {
      Object.values(fileAuditManifest.errors).forEach((auditMessage) => {
        errorMessages.push(auditMessage.shortMessage);
      });
      Object.values(fileAuditManifest.warnings).forEach((auditMessage) => {
        warningMessages.push(auditMessage.shortMessage);
      });
    }

    const expandedLabel = getNodeLabel({
      isExpanded: true,
      fileName: fileManifest.id,
      errorMessages,
      warningMessages,
    });
    const { width: expandedWitdh, height: expandedHeight } =
      getNodeWidthAndHeightFromLabel(expandedLabel);
    const collapsedLabel = getNodeLabel({
      isExpanded: false,
      fileName: fileManifest.id,
      errorMessages,
      warningMessages,
    });
    const { width: collapsedWidth, height: collapsedHeight } =
      getNodeWidthAndHeightFromLabel(collapsedLabel);

    const nodeElement: NodeElementDefinition = {
      data: {
        id: fileManifest.id,
        position: { x, y },
        customData: {
          fileName: fileManifest.id,
          loc: fileManifest.lineCount,
          dependencies: Object.keys(fileManifest.dependencies).length,
          totalSymbols: Object.keys(fileManifest.symbols).length,
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

    const edgeElements: EdgeElementDefinition[] = [];
    Object.values(fileManifest.dependencies).forEach((dependency) => {
      if (dependency.isExternal) {
        return;
      }
      const edgeElement: EdgeElementDefinition = {
        data: {
          source: dependency.id,
          target: fileManifest.id,
        },
      };
      edgeElements.push(edgeElement);
    });

    edges.push(...edgeElements);
  });

  const allElements = [...nodes, ...edges];

  return allElements;
}

export function getCyStyle(theme: "light" | "dark") {
  return [
    {
      selector: "node",
      style: {
        "text-wrap": "wrap",
        color: tailwindConfig.theme.extend.colors.text[theme],
        "background-color": tailwindConfig.theme.extend.colors.primary[theme],
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
        "background-color": tailwindConfig.theme.extend.colors.secondary.dark,
        "z-index": 1000,
        width: 50,
        height: 50,
        "corner-radius": "100%",
      },
    },
    {
      selector: "node.linesOfCode",
      style: {},
    },
    {
      selector: "node.characters",
      style: {},
    },
    {
      selector: "node.dependencies",
      style: {},
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

export const layout = {
  name: "fcose",
  quality: "proof",
  nodeRepulsion: 1000000, // the repulsion force between nodes connected by an edge
  idealEdgeLength: 200,
  gravity: 0.1, // the gravity force of the graph. Lower value means looser graph in the center
  packComponents: true,
  nodeDimensionsIncludeLabels: true,
} as FcoseLayoutOptions;

const errorChar = "❗";
const warningChar = "⚠️";
const successChar = "🎉";

export function getNodeLabel(data: {
  isExpanded: boolean;
  fileName: string;
  errorMessages: string[];
  warningMessages: string[];
}) {
  let label = "";

  const fileNameMaxLength = 25;
  // display only last 10 characters of file name
  // if file name is longer than 10 characters, add ellipsis
  // to the end of the file name
  // if file name is shorter than 10 characters, display the whole file name
  const fileName =
    data.fileName.length > fileNameMaxLength
      ? `...${data.fileName.slice(-fileNameMaxLength)}`
      : data.fileName;

  if (data.isExpanded) {
    label = data.fileName;

    if (data.errorMessages.length > 0 || data.warningMessages.length > 0) {
      data.errorMessages.forEach((message) => {
        label += `\n${errorChar} ${message}`;
      });
      data.warningMessages.forEach((message) => {
        label += `\n${warningChar} ${message}`;
      });
    } else {
      label += `\n${successChar} No issues found`;
    }

    return label;
  }

  label = fileName;

  if (data.errorMessages.length > 0) {
    label += `\n${errorChar}(${data.errorMessages.length})`;
  }
  if (data.warningMessages.length > 0) {
    label += `\n${warningChar}(${data.warningMessages.length})`;
  }

  return label;
}
