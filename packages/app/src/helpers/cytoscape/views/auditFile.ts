import { ElementDefinition, StylesheetJson } from "cytoscape";
import tailwindConfig from "../../../../tailwind.config.js";
import { FcoseLayoutOptions } from "cytoscape-fcose";
import { DependencyManifest, AuditManifest } from "@napi/shared";
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

export type NodeMap = Record<
  string,
  {
    element: NodeElementDefinition;
    children: NodeMap;
  }
>;

export interface EdgeElementDefinition extends ElementDefinition {
  data: {
    source: string;
    target: string;
    type: "dependency" | "dependent";
  };
}

export function getCyElements(
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
  currentFilePath: string,
) {
  const joinChar = "|";

  const currentFile = dependencyManifest[currentFilePath];
  if (!currentFile) {
    throw new Error(`File not found in audit map: ${currentFilePath}`);
  }

  type NodeMap = Record<
    string,
    {
      element: NodeElementDefinition;
      children: NodeMap;
    }
  >;
  const nodeMap: NodeMap = {};
  const edges: EdgeElementDefinition[] = [];

  // initial node position
  // will be updated by layout
  const x = 0;
  const y = 0;

  // Current file
  const currentFileId = currentFile.id;
  const errorMessages: string[] = [];
  const warningMessages: string[] = [];

  const fileAuditManifest = auditManifest[currentFile.id];
  if (fileAuditManifest) {
    Object.values(fileAuditManifest.alerts).forEach((auditMessage) => {
      errorMessages.push(auditMessage.message.short);
    });
  }

  const label = getNodeLabel({
    isExpanded: false,
    isExternal: false,
    type: "file",
    fileName: currentFileId,
    errorMessages,
    warningMessages,
  });

  const currentFileElement: NodeElementDefinition = {
    data: {
      id: currentFileId,
      label,
      position: { x, y },
      isExpanded: false,
      type: "file",
      isCurrentFile: true,
      isExternal: false,
      customData: {
        fileName: currentFileId,
        errorMessages,
        warningMessages,
      },
    },
  };
  nodeMap[currentFileId] = { element: currentFileElement, children: {} };

  Object.values(currentFile.symbols).forEach((currentSymbol) => {
    // Current instances
    const currentSymbolId = `${currentFileId}${joinChar}${currentSymbol.id}`;

    const errorMessages: string[] = [];
    const warningMessages: string[] = [];

    if (fileAuditManifest) {
      const SymbolAuditManifest = fileAuditManifest.symbols[currentSymbol.id];
      if (SymbolAuditManifest) {
        Object.values(SymbolAuditManifest.alerts).forEach((auditMessage) => {
          errorMessages.push(auditMessage.message.short);
        });
      }
    }

    const label = getNodeLabel({
      isExpanded: false,
      isExternal: false,
      type: "instance",
      fileName: currentFileId,
      instance: {
        name: currentSymbol.id,
        type: currentSymbol.type,
      },
      errorMessages,
      warningMessages,
    });

    const instanceElement: NodeElementDefinition = {
      data: {
        id: currentSymbolId,
        label,
        position: { x, y },
        isExpanded: false,
        type: "instance",
        isCurrentFile: true,
        isExternal: false,
        parent: currentFileId,
        customData: {
          fileName: currentFileId,
          instance: {
            name: currentSymbol.id,
            type: currentSymbol.type,
          },
          errorMessages,
          warningMessages,
        },
      },
    };
    nodeMap[currentFileId].children[currentSymbolId] = {
      element: instanceElement,
      children: {},
    };

    // Dependencies
    Object.values(currentSymbol.dependencies).forEach((dependencyFile) => {
      // Dependency file
      const dependencyFileId = dependencyFile.id;

      const label = getNodeLabel({
        isExpanded: false,
        isExternal: dependencyFile.isExternal,
        type: "file",
        fileName: dependencyFileId,
        errorMessages: [],
        warningMessages: [],
      });

      const dependencyFileElement: NodeElementDefinition = {
        data: {
          id: dependencyFileId,
          label,
          position: { x, y },
          isExpanded: false,
          type: "file",
          isCurrentFile: false,
          isExternal: dependencyFile.isExternal,
          customData: {
            fileName: dependencyFileId,
            errorMessages: [],
            warningMessages: [],
          },
        },
      };
      if (!nodeMap[dependencyFileId]) {
        nodeMap[dependencyFileId] = {
          element: dependencyFileElement,
          children: {},
        };
      }

      // Dependency instances
      const dependencyFileSymbols = Object.values(dependencyFile.symbols);
      if (dependencyFileSymbols.length === 0) {
        // create edge to file
        const edgeElement: EdgeElementDefinition = {
          data: {
            source: currentSymbolId,
            target: dependencyFileId,
            type: "dependency",
          },
        };
        edges.push(edgeElement);
      } else {
        dependencyFileSymbols.forEach((dependencySymbolId) => {
          const id = `${dependencyFileId}${joinChar}${dependencySymbolId}`;
          const instanceType =
            dependencyManifest[dependencyFileId]?.symbols[dependencySymbolId]
              ?.type;

          const label = getNodeLabel({
            isExpanded: false,
            isExternal: dependencyFile.isExternal,
            type: "instance",
            fileName: dependencyFileId,
            instance: {
              name: dependencySymbolId,
              type: instanceType,
            },
            errorMessages: [],
            warningMessages: [],
          });

          const dependencyInstanceElement: NodeElementDefinition = {
            data: {
              id,
              label,
              position: { x, y },
              isExpanded: false,
              type: "instance",
              isCurrentFile: false,
              isExternal: dependencyFile.isExternal,
              parent: dependencyFileId,
              customData: {
                fileName: dependencyFileId,
                instance: {
                  name: dependencySymbolId,
                  type: instanceType,
                },
                errorMessages: [],
                warningMessages: [],
              },
            },
          };
          nodeMap[dependencyFileId].children[dependencySymbolId] = {
            element: dependencyInstanceElement,
            children: {},
          };

          // Edges
          const edgeElement: EdgeElementDefinition = {
            data: {
              source: id,
              target: currentSymbolId,
              type: "dependency",
            },
          };
          edges.push(edgeElement);
        });
      }
    });

    // Dependents
    Object.values(currentSymbol.dependents).forEach((dependentFile) => {
      // Dependent file
      const dependentFileId = dependentFile.id;

      const label = getNodeLabel({
        isExpanded: false,
        isExternal: false,
        type: "file",
        fileName: dependentFileId,
        errorMessages: [],
        warningMessages: [],
      });

      const dependentFileElement: NodeElementDefinition = {
        data: {
          id: dependentFileId,
          label,
          position: { x, y },
          isExpanded: false,
          type: "file",
          isCurrentFile: false,
          isExternal: false,
          customData: {
            fileName: dependentFileId,
            errorMessages: [],
            warningMessages: [],
          },
        },
      };
      if (!nodeMap[dependentFileId]) {
        nodeMap[dependentFileId] = {
          element: dependentFileElement,
          children: {},
        };
      }

      if (dependentFileId === currentFileId) {
        // Dependent file is the same as current file
        // We do not want to show dependents here cause does not really matter for the user
        return;
      }

      const dependentFileSymbolIds = Object.values(dependentFile.symbols);
      if (dependentFileId.length === 0) {
        // Dependent file has no instances, create edge to file
        const edgeElement: EdgeElementDefinition = {
          data: {
            source: currentSymbolId,
            target: dependentFileId,
            type: "dependent",
          },
        };
        edges.push(edgeElement);
      } else {
        // Dependent instances
        dependentFileSymbolIds.forEach((dependentFileSymbolId) => {
          const id = `${dependentFileId}${joinChar}${dependentFileSymbolId}`;
          const instanceType =
            dependencyManifest[dependentFileId]?.symbols[dependentFileSymbolId]
              ?.type;

          const label = getNodeLabel({
            isExpanded: false,
            isExternal: false,
            type: "instance",
            fileName: dependentFileId,
            instance: {
              name: dependentFileSymbolId,
              type: instanceType,
            },
            errorMessages: [],
            warningMessages: [],
          });

          const dependentInstanceElement: NodeElementDefinition = {
            data: {
              id,
              label,
              position: { x, y },
              isExpanded: false,
              type: "instance",
              isCurrentFile: false,
              isExternal: false,
              parent: dependentFileId,
              customData: {
                fileName: dependentFileId,
                instance: {
                  name: dependentFileSymbolId,
                  type: instanceType,
                },
                errorMessages: [],
                warningMessages: [],
              },
            },
          };
          nodeMap[dependentFileId].children[dependentFileSymbolId] = {
            element: dependentInstanceElement,
            children: {},
          };

          // Edges
          const edgeElement: EdgeElementDefinition = {
            data: {
              source: currentSymbolId,
              target: id,
              type: "dependent",
            },
          };
          edges.push(edgeElement);
        });
      }
    });
  });

  function traverse(
    nodeMap: NodeMap,
    nodeElements: NodeElementDefinition[] = [],
  ) {
    Object.values(nodeMap).forEach((node) => {
      nodeElements.push(node.element);
      traverse(node.children, nodeElements);
    });
    return nodeElements;
  }

  const nodeElements = traverse(nodeMap);
  const allElements = [...nodeElements, ...edges];

  return allElements;
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
      },
    },
    // current instancenode
    {
      selector: "node[type = 'instance'][isCurrentFile]",
      style: {
        "background-color": tailwindConfig.theme.extend.colors.primary[theme],
      },
    },
    // external instancenode
    {
      selector: "node[type = 'instance'][!isCurrentFile][isExternal]",
      style: {
        "background-color": tailwindConfig.theme.extend.colors.gray[theme],
      },
    },
    // instance node non external
    {
      selector: "node[type = 'instance'][!isCurrentFile][!isExternal]",
      style: {
        "background-color": tailwindConfig.theme.extend.colors.secondary[theme],
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
