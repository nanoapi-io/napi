import { ElementDefinition, StylesheetJson } from "cytoscape";
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
        "border-width": 2,
        "border-color": tailwindConfig.theme.extend.colors.border[theme],
        "text-valign": "center",
        "text-halign": "center",
        shape: "roundrectangle",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": tailwindConfig.theme.extend.colors.text[theme],
        "target-arrow-color": tailwindConfig.theme.extend.colors.text[theme],
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ] as StylesheetJson;
}

export function getCyLayout(animate = true) {
  return {
    name: "cose-bilkent",
    quality: "draft",
    animate: animate ? "end" : false,
    idealEdgeLength: 1000,
  };
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
