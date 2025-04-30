import { ElementDefinition, StylesheetJson } from "cytoscape";
import tailwindConfig from "../../../../tailwind.config.js";
import { FcoseLayoutOptions } from "cytoscape-fcose";
import { Theme } from "../../../contexts/ThemeContext.js";
export interface NodeElementDefinition extends ElementDefinition {
  data: {
    id: string;
    label: string;
    position: { x: number; y: number };
    parent?: string;
    isExpanded: boolean;
    type: "file" | "instance";
    isCurrentFile: boolean;
    isExternal: boolean;
    customData: {
      fileName: string;
      instance?: {
        name: string;
        type?: string;
      };
      errorMessages: string[];
      warningMessages: string[];
    } & object;
  };
}

export interface EdgeElementDefinition extends ElementDefinition {
  data: {
    source: string;
    target: string;
    type: "dependency" | "dependent";
  };
}

export function getCyStyle(theme: Theme) {
  return [
    // filenode general style
    {
      selector: "node[type = 'file']",
      style: {
        label: "data(label)",
        "text-wrap": "wrap",
        "background-color":
          tailwindConfig.theme.extend.colors.background[theme],
        "border-width": 2,
        "border-color": tailwindConfig.theme.extend.colors.border[theme],
        opacity: 0.8,
        "text-valign": "top",
        "text-halign": "center",
        shape: "roundrectangle",
      },
    },
    // current filenode
    {
      selector: "node[type = 'file'][isCurrentFile]",
      style: {
        color: tailwindConfig.theme.extend.colors.primary[theme],
      },
    },
    // external filenode
    {
      selector: "node[type = 'file'][!isCurrentFile][isExternal]",
      style: {
        color: tailwindConfig.theme.extend.colors.gray[theme],
      },
    },
    // file node non external
    {
      selector: "node[type = 'file'][!isCurrentFile][!isExternal]",
      style: {
        color: tailwindConfig.theme.extend.colors.secondary[theme],
      },
    },
    // instancenode general style
    {
      selector: "node[type = 'instance']",
      style: {
        label: "data(label)",
        "text-wrap": "wrap",
        "text-valign": "center",
        "text-halign": "center",
        color: tailwindConfig.theme.extend.colors.text[theme],
        shape: "roundrectangle",
        width: "data(customData.nodeWidth)",
      },
    },
    // current instancenode
    {
      selector: "node[type = 'instance'][isCurrentFile]",
      style: {
        "background-color": tailwindConfig.theme.extend.colors.primary[theme],
        "background-opacity": 0.2,
        "border-color": tailwindConfig.theme.extend.colors.primary[theme],
        "border-width": 2,
      },
    },
    // external instancenode
    {
      selector: "node[type = 'instance'][!isCurrentFile][isExternal]",
      style: {
        "background-color": tailwindConfig.theme.extend.colors.gray[theme],
        "background-opacity": 0.2,
        "border-color": tailwindConfig.theme.extend.colors.gray[theme],
        "border-width": 2,
      },
    },
    // instance node non external
    {
      selector: "node[type = 'instance'][!isCurrentFile][!isExternal]",
      style: {
        "background-color": tailwindConfig.theme.extend.colors.secondary[theme],
        "background-opacity": 0.2,
        "border-color": tailwindConfig.theme.extend.colors.secondary[theme],
        "border-width": 2,
      },
    },
    // dependency edge
    {
      selector: "edge[type = 'dependency']",
      style: {
        width: 2,
        "line-color": tailwindConfig.theme.extend.colors.primary[theme],
        "target-arrow-color": tailwindConfig.theme.extend.colors.primary[theme],
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
    // dependent edge
    {
      selector: "edge[type = 'dependent']",
      style: {
        width: 2,
        "line-color": tailwindConfig.theme.extend.colors.secondary[theme],
        "target-arrow-color":
          tailwindConfig.theme.extend.colors.secondary[theme],
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
    // hide elements
    {
      selector: ".hidden",
      style: {
        display: "none",
      },
    },
  ] as StylesheetJson;
}

export const layout = {
  name: "fcose",
  quality: "proof",
  nodeRepulsion: 1000,
  idealEdgeLength: 200,
  gravity: 0.1,
  gravityCompound: 1000,
  packComponents: true,
  nodeDimensionsIncludeLabels: true,
} as FcoseLayoutOptions;

const errorChar = "❗";
const warningChar = "⚠️";
const successChar = "🎉";

export function getNodeLabel(data: {
  isExpanded: boolean;
  isExternal: boolean;
  type: "file" | "instance";
  fileName: string;
  instance?: {
    name: string;
    type?: string;
  };
  errorMessages: string[];
  warningMessages: string[];
}) {
  let label = "";
  if (data.isExpanded) {
    if (data.type === "file") {
      label = data.fileName;
      if (data.isExternal) {
        label += "\n(External reference)";
      }
    } else if (data.type === "instance" && data.instance) {
      label = `Name: ${data.instance.name}`;
      if (data.instance.type) {
        label += `\nType: ${data.instance.type}`;
      }
    }

    if (!data.isExternal) {
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
    }

    return label;
  }

  if (data.type === "file") {
    label = data.fileName;
    if (data.isExternal) {
      label += " (External)";
    }
  } else if (data.type === "instance" && data.instance) {
    label = data.instance.name;
  }

  if (!data.isExternal) {
    if (data.errorMessages.length > 0) {
      label += `\n${errorChar}(${data.errorMessages.length})`;
    } else if (data.warningMessages.length > 0) {
      label += `\n${warningChar}(${data.warningMessages.length})`;
    }
  }

  return label;
}
