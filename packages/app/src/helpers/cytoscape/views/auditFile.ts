import { ElementDefinition, StylesheetJson } from "cytoscape";
import { AuditMap } from "../../../service/api/types";
import tailwindConfig from "../../../../tailwind.config";

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

export function getCyElements(auditMap: AuditMap, currentFilePath: string) {
  const joinChar = "|";

  const auditFile = auditMap[currentFilePath];
  if (!auditFile) {
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
  const currentFileId = auditFile.id;
  const errorMessages: string[] = [];
  const warningMessages: string[] = [];

  Object.values(auditFile.auditResults).forEach((auditResult) => {
    if (auditResult.result === "error") {
      errorMessages.push(auditResult.message.long);
    } else if (auditResult.result === "warning") {
      warningMessages.push(auditResult.message.long);
    }
  });

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

  Object.values(auditFile.instances).forEach((instance) => {
    // Current instances
    const currentInstanceId = `${currentFileId}${joinChar}${instance.id}`;

    const errorMessages: string[] = [];
    const warningMessages: string[] = [];

    Object.values(instance.auditResults).forEach((auditResult) => {
      if (auditResult.result === "error") {
        errorMessages.push(auditResult.message.long);
      } else if (auditResult.result === "warning") {
        warningMessages.push(auditResult.message.long);
      }
    });

    const label = getNodeLabel({
      isExpanded: false,
      isExternal: false,
      type: "instance",
      fileName: currentFileId,
      instance: {
        name: instance.id,
        type: instance.type,
      },
      errorMessages,
      warningMessages,
    });

    const instanceElement: NodeElementDefinition = {
      data: {
        id: currentInstanceId,
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
            name: instance.id,
            type: instance.type,
          },
          errorMessages,
          warningMessages,
        },
      },
    };
    nodeMap[currentFileId].children[currentInstanceId] = {
      element: instanceElement,
      children: {},
    };

    // Dependencies
    Object.values(instance.dependenciesMap).forEach((dependencyFile) => {
      // Dependency file
      const dependencyFileId = dependencyFile.fileId;

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
      Object.values(dependencyFile.instanceIds).forEach(
        (dependencyInstanceId) => {
          const id = `${dependencyFileId}${joinChar}${dependencyInstanceId}`;
          const instanceType =
            auditMap[dependencyFileId]?.instances[dependencyInstanceId]?.type;

          const label = getNodeLabel({
            isExpanded: false,
            isExternal: dependencyFile.isExternal,
            type: "instance",
            fileName: dependencyFileId,
            instance: {
              name: dependencyInstanceId,
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
                  name: dependencyInstanceId,
                  type: instanceType, // TODO: update when
                },
                errorMessages: [],
                warningMessages: [],
              },
            },
          };
          nodeMap[dependencyFileId].children[dependencyInstanceId] = {
            element: dependencyInstanceElement,
            children: {},
          };

          // Edges
          const edgeElement: EdgeElementDefinition = {
            data: {
              source: id,
              target: currentInstanceId,
              type: "dependency",
            },
          };
          edges.push(edgeElement);
        },
      );
    });

    // Dependents
    Object.values(instance.dependentsMap).forEach((dependentFile) => {
      // Dependent file
      const dependentFileId = dependentFile.fileId;

      const label = getNodeLabel({
        isExpanded: false,
        isExternal: dependentFile.isExternal,
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
          isExternal: dependentFile.isExternal,
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

      const dependentInstanceIds = Object.values(dependentFile.instanceIds);
      if (dependentInstanceIds.length === 0) {
        // Dependent file has no instances, create edge to file
        const edgeElement: EdgeElementDefinition = {
          data: {
            source: currentInstanceId,
            target: dependentFileId,
            type: "dependent",
          },
        };
        edges.push(edgeElement);
      } else {
        // Dependent instances
        dependentInstanceIds.forEach((dependentInstanceId) => {
          const id = `${dependentFileId}${joinChar}${dependentInstanceId}`;
          const instanceType =
            auditMap[dependentFileId].instances[dependentInstanceId].type;

          const label = getNodeLabel({
            isExpanded: false,
            isExternal: dependentFile.isExternal,
            type: "instance",
            fileName: dependentFileId,
            instance: {
              name: dependentInstanceId,
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
              isExternal: dependentFile.isExternal,
              parent: dependentFileId,
              customData: {
                fileName: dependentFileId,
                instance: {
                  name: dependentInstanceId,
                  type: instanceType,
                },
                errorMessages: [],
                warningMessages: [],
              },
            },
          };
          nodeMap[dependentFileId].children[dependentInstanceId] = {
            element: dependentInstanceElement,
            children: {},
          };

          // Edges
          const edgeElement: EdgeElementDefinition = {
            data: {
              source: currentInstanceId,
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

export function getCyStyle(theme: "light" | "dark") {
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
  ] as StylesheetJson;
}

export function getCyLayout(animate = true) {
  return {
    name: "cose-bilkent",
    quality: "proof",
    animate: animate ? "end" : false,
    idealEdgeLength: 75,
    tilingPaddingVertical: 100,
    tilingPaddingHorizontal: 100,
  };
}

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
