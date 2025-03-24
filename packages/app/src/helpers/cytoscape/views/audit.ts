import {
  Core,
  ElementDefinition,
  LayoutOptions,
  NodeCollection,
  StylesheetJson,
} from "cytoscape";
import tailwindConfig from "../../../../tailwind.config";
import { AuditResponse } from "../../../service/api/auditApi/types";

export interface NodeElementDefinition extends ElementDefinition {
  data: {
    id: string;
    label: string;
    position: { x: number; y: number };
    isExpanded: boolean;
    customData: {
      fileName: string;
      errorMessages: string[];
      warningMessages: string[];
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

  Object.values(auditResponse.dependencyManifesto).forEach((fileManifesto) => {
    const errorMessages: string[] = [];
    const warningMessages: string[] = [];

    const fileAuditManifesto = auditResponse.auditManifesto[fileManifesto.id];
    if (fileAuditManifesto) {
      Object.values(fileAuditManifesto.errors).forEach((auditMessage) => {
        errorMessages.push(auditMessage.shortMessage);
      });
      Object.values(fileAuditManifesto.warnings).forEach((auditMessage) => {
        warningMessages.push(auditMessage.shortMessage);
      });
    }

    const label = getNodeLabel({
      isExpanded: false,
      fileName: fileManifesto.id,
      errorMessages,
      warningMessages,
    });

    const nodeElement: NodeElementDefinition = {
      data: {
        id: fileManifesto.id,
        label,
        position: { x, y },
        isExpanded: false,
        customData: {
          fileName: fileManifesto.id,
          errorMessages,
          warningMessages,
        },
      },
    };

    nodes.push(nodeElement);

    const edgeElements: EdgeElementDefinition[] = [];
    Object.values(fileManifesto.dependencies).forEach((dependency) => {
      if (dependency.isExternal) {
        return;
      }
      const edgeElement: EdgeElementDefinition = {
        data: {
          source: fileManifesto.id,
          target: dependency.id,
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
        label: "data(label)",
        "text-wrap": "wrap",
        color: tailwindConfig.theme.extend.colors.text[theme],
        "background-color":
          tailwindConfig.theme.extend.colors.background[theme],
        "border-width": 1,
        "border-color": tailwindConfig.theme.extend.colors.border[theme],
        "text-valign": "center",
        "text-halign": "center",
        shape: "roundrectangle",
      },
    },
    {
      selector: "node.focus",
      style: {
        "border-width": 3,
        "border-color": tailwindConfig.theme.extend.colors.secondary[theme],
        "z-index": 1000,
      },
    },
    {
      selector: "node.background",
      style: {
        opacity: 0.3,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": tailwindConfig.theme.extend.colors.text[theme],
        "line-opacity": 1,
        "target-arrow-color": tailwindConfig.theme.extend.colors.text[theme],
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
    {
      selector: "edge.background",
      style: {
        "line-opacity": 0.1,
        width: 5,
      },
    },
    {
      selector: "edge.focus",
      style: {
        "line-opacity": 1,
        width: 5,
        "z-index": 1000,
      },
    },
    {
      selector: "edge.dependency", // class focus and class dependency
      style: {
        "line-color": tailwindConfig.theme.extend.colors.secondary[theme],
        "target-arrow-color":
          tailwindConfig.theme.extend.colors.secondary[theme],
      },
    },
    {
      selector: "edge.dependent",
      style: {
        "line-color": tailwindConfig.theme.extend.colors.primary[theme],
        "target-arrow-color": tailwindConfig.theme.extend.colors.primary[theme],
      },
    },
  ] as StylesheetJson;
}

export function getCyLayout(
  cyInstance: Core,
  selectedNodes: NodeCollection,
  options?: {
    animate?: boolean;
    keepBoundingBox?: boolean;
  },
) {
  let idealEdgeLength = 0;
  if (selectedNodes.length < 10) {
    idealEdgeLength = 25;
  } else if (selectedNodes.length < 50) {
    idealEdgeLength = 40;
  } else if (selectedNodes.length < 100) {
    idealEdgeLength = 60;
  } else if (selectedNodes.length < 200) {
    idealEdgeLength = 100;
  } else if (selectedNodes.length < 500) {
    idealEdgeLength = 150;
  } else if (selectedNodes.length < 1000) {
    idealEdgeLength = 200;
  } else {
    idealEdgeLength = 300;
  }

  const boundingBox =
    options?.keepBoundingBox && cyInstance.elements().renderedBoundingBox();

  let numIter = 0;
  if (selectedNodes.length < 50) {
    numIter = 1000;
  } else if (selectedNodes.length < 100) {
    numIter = 500;
  } else if (selectedNodes.length < 200) {
    numIter = 300;
  } else if (selectedNodes.length < 500) {
    numIter = 200;
  } else if (selectedNodes.length < 1000) {
    numIter = 100;
  } else {
    numIter = 50;
  }

  return {
    name: "cose",
    quality: "default",
    animate: options?.animate ? "end" : false,
    idealEdgeLength,
    fit: boundingBox ? true : true,
    // boundingBox,
    nodeDimensionsIncludeLabels: true,
    randomize: true,
    numIter,
  } as LayoutOptions;
}

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

  label = data.fileName;

  if (data.errorMessages.length > 0) {
    label += `\n${errorChar}(${data.errorMessages.length})`;
  } else if (data.warningMessages.length > 0) {
    label += `\n${warningChar}(${data.warningMessages.length})`;
  }

  return label;
}
