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
      };
      background: {
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
      border: {
        default: string;
        highlighted: string;
        selected: string;
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
  const severityLevels = styles.node.colors.background.severity;
  const targetColor = level in severityLevels
    ? severityLevels[level as keyof typeof severityLevels]
    : undefined;

  return targetColor || styles.node.colors.background.default;
}

function getCytoscapeStyles(theme: "light" | "dark" = "light") {
  return {
    node: {
      colors: {
        text: {
          default: theme === "light" ? "#1a1a1a" : "#ffffff",
        },
        background: {
          default: theme === "light" ? "#ffffff" : "#1a1a1a",
          severity: {
            0: theme === "light" ? "#16a34a" : "#4ade80",
            1: theme === "light" ? "#65a30d" : "#a3e635",
            2: theme === "light" ? "#ca8a04" : "#facc15",
            3: theme === "light" ? "#d97706" : "#fbbf24",
            4: theme === "light" ? "#ea580c" : "#fb923c",
            5: theme === "light" ? "#dc2626" : "#f87171",
          },
        },
        border: {
          default: theme === "light" ? "#1a1a1a" : "#ffffff",
          highlighted: theme === "light" ? "#6366f1" : "#818cf8",
          selected: theme === "light" ? "#059669" : "#10b981",
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
        "border-color": styles.node.colors.border.default,
        "background-color": (node: NodeSingular) => {
          const data = node.data() as NapiNodeData;
          if (targetMetric) {
            return getSeverityColor(styles, data.metricsSeverity[targetMetric]);
          }
          return styles.node.colors.background.default;
        },
        shape: "ellipse",
        "text-valign": "center",
        "text-halign": "center",
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
      "border-color": (node: NodeSingular) => {
        const data = node.data() as SymbolNapiNodeData;
        if (data.isExternal) {
          return styles.node.colors.border.default;
        }
        return styles.node.colors.border.default;
      },
      style: {
        shape: (node: NodeSingular) => {
          const data = node.data() as SymbolNapiNodeData;

          if (data.isExternal) {
            return "octagon";
          }

          if (data.symbolType === classSymbolType) {
            return "hexagon";
          }
          if (data.symbolType === functionSymbolType) {
            return "triangle";
          }
          if (data.symbolType === variableSymbolType) {
            return "ellipse";
          }
          if (data.symbolType === structSymbolType) {
            return "hexagon";
          }
          if (data.symbolType === enumSymbolType) {
            return "hexagon";
          }
          if (data.symbolType === interfaceSymbolType) {
            return "hexagon";
          }
          if (data.symbolType === recordSymbolType) {
            return "hexagon";
          }
          if (data.symbolType === delegateSymbolType) {
            return "hexagon";
          }
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
        "border-color": styles.node.colors.border.highlighted,
      },
    },
    {
      selector: "node.selected",
      style: {
        "border-color": styles.node.colors.border.selected,
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
        "curve-style": "straight",
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
