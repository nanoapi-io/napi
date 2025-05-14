import type { NodeSingular, StylesheetJson } from "cytoscape";
import {
  classSymbolType,
  delegateSymbolType,
  enumSymbolType,
  functionSymbolType,
  interfaceSymbolType,
  type Metric,
  recordSymbolType,
  structSymbolType,
  variableSymbolType,
} from "@napi/shared";
import type { NapiNodeData, SymbolNapiNodeData } from "../elements/types.ts";

interface CytoscapeStyles {
  node: {
    colors: {
      text: {
        default: string;
        selected: string;
        external: string;
      };
      background: {
        default: string;
        highlighted: string;
        selected: string;
        external: string;
      };
      border: {
        default: string;
        severity: {
          0: string;
          1: string;
          2: string;
          3: string;
          4: string;
          5: string;
        };
      };
    };
    width: {
      default: number;
      highlighted: number;
    };
  };
  edge: {
    colors: {
      default: string;
      dependency: string;
      dependent: string;
    };
    width: {
      default: number;
      highlighted: number;
    };
  };
}

function getSeverityColor(styles: CytoscapeStyles, level: number) {
  const severityLevels = styles.node.colors.border.severity;
  const targetColor = level in severityLevels
    ? severityLevels[level as keyof typeof severityLevels]
    : undefined;

  return targetColor || styles.node.colors.border.default;
}

function getCytoscapeStyles(theme: "light" | "dark" = "light") {
  return {
    node: {
      colors: {
        text: {
          default: theme === "light" ? "#3B0764" : "#FFFFFF",
          selected: theme === "light" ? "#FFFFFF" : "#3B0764",
          external: theme === "light" ? "#3B0764" : "#FFFFFF",
        },
        background: {
          default: theme === "light" ? "#F3E8FF" : "#6D28D9",
          selected: theme === "light" ? "#A259D9" : "#CBA6F7",
          external: theme === "light" ? "#F1F5F9" : "#334155",
          highlighted: theme === "light" ? "#eab308" : "#facc15",
        },
        border: {
          default: theme === "light" ? "#A259D9" : "#CBA6F7",
          severity: {
            0: theme === "light" ? "#A259D9" : "#CBA6F7",
            1: theme === "light" ? "#65a30d" : "#a3e635",
            2: theme === "light" ? "#ca8a04" : "#facc15",
            3: theme === "light" ? "#d97706" : "#fbbf24",
            4: theme === "light" ? "#ea580c" : "#fb923c",
            5: theme === "light" ? "#dc2626" : "#f87171",
          },
        },
      },
      width: {
        default: 5,
        highlighted: 10,
      },
    },
    edge: {
      colors: {
        default: theme === "light" ? "#1a1a1a" : "#ffffff",
        dependency: theme === "light" ? "#0284c7" : "#38bdf8",
        dependent: theme === "light" ? "#9333ea" : "#a78bfa",
      },
      width: {
        default: 1,
        highlighted: 3,
      },
    },
  } as CytoscapeStyles;
}

export function getCytoscapeStylesheet(
  targetMetric: Metric | undefined,
  theme: "light" | "dark" = "light",
) {
  const styles = getCytoscapeStyles(theme);

  const stylesheet = [
    // Node specific styles
    {
      selector: "node",
      style: {
        "text-wrap": "wrap",
        color: styles.node.colors.text.default,
        "border-width": styles.node.width.default,
        "border-color": (node: NodeSingular) => {
          const data = node.data() as NapiNodeData;
          if (targetMetric) {
            return getSeverityColor(styles, data.metricsSeverity[targetMetric]);
          }
          return styles.node.colors.border.default;
        },
        "background-color": styles.node.colors.background.default,
        shape: "ellipse",
        "text-valign": "center",
        "text-halign": "center",
        "width": 20,
        "height": 20,
        opacity: 0.9,
      },
    },
    {
      selector: "node.file",
      style: {
        shape: "roundrectangle",
      },
    },
    {
      selector: "node.symbol",
      style: {
        "background-color": (node: NodeSingular) => {
          const data = node.data() as SymbolNapiNodeData;
          return data.isExternal
            ? styles.node.colors.background.external
            : styles.node.colors.background.default;
        },
        "color": (node: NodeSingular) => {
          const data = node.data() as SymbolNapiNodeData;
          return data.isExternal
            ? styles.node.colors.text.external
            : styles.node.colors.text.default;
        },
        shape: (node: NodeSingular) => {
          const data = node.data() as SymbolNapiNodeData;
          if (data.isExternal) return "octagon";
          switch (data.symbolType) {
            case classSymbolType:
            case interfaceSymbolType:
            case structSymbolType:
            case enumSymbolType:
            case recordSymbolType:
              return "hexagon";
            case functionSymbolType:
            case delegateSymbolType:
              return "roundrectangle";
            case variableSymbolType:
              return "ellipse";
            default:
              return "ellipse";
          }
        },
        "border-style": (node: NodeSingular) => {
          const data = node.data() as SymbolNapiNodeData;
          return data.isExternal ? "dashed" : "solid";
        },
      },
    },
    {
      selector: "node.collapsed",
      style: {
        label: "data(collapsed.label)",
        width: "data(collapsed.width)",
        height: "data(collapsed.height)",
        "z-index": 1000,
      },
    },
    {
      selector: "node.expanded",
      style: {
        label: "data(expanded.label)",
        width: "data(expanded.width)",
        height: "data(expanded.height)",
        "z-index": 2000,
      },
    },
    {
      selector: "node.highlighted",
      style: {
        "border-width": styles.node.width.highlighted,
        "background-color": styles.node.colors.background.highlighted,
      },
    },
    {
      selector: "node.selected",
      style: {
        "background-color": styles.node.colors.background.selected,
        "color": styles.node.colors.text.selected,
      },
    },

    // Edge specific styles
    {
      selector: "edge",
      style: {
        width: styles.edge.width.default,
        "line-color": styles.edge.colors.default,
        "target-arrow-color": styles.edge.colors.default,
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
    {
      selector: "edge.dependency",
      style: {
        width: styles.edge.width.highlighted,
        "line-color": styles.edge.colors.dependency,
        "target-arrow-color": styles.edge.colors.dependency,
      },
    },
    {
      selector: "edge.dependent",
      style: {
        width: styles.edge.width.highlighted,
        "line-color": styles.edge.colors.dependent,
        "target-arrow-color": styles.edge.colors.dependent,
      },
    },

    // All elements styles
    {
      selector: ".background",
      style: {
        "opacity": 0.1,
      },
    },
    {
      selector: ".hidden",
      style: {
        "opacity": 0,
      },
    },
  ] as StylesheetJson;

  return stylesheet;
}
