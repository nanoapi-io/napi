import cytoscape, {
  Collection,
  EdgeDefinition,
  EdgeSingular,
  ElementDefinition,
  EventObjectNode,
  NodeDefinition,
  NodeSingular,
  StylesheetJson,
} from "cytoscape";
import { Core } from "cytoscape";
import fcose, { FcoseLayoutOptions } from "cytoscape-fcose";
import { DependencyManifest } from "../../../service/api/types/dependencyManifest";
import {
  AuditManifest,
  AuditMessage,
  FileAuditManifest,
} from "../../../service/api/types/auditManifest";
import tailwindConfig from "../../../../tailwind.config";
import { getNodeWidthAndHeightFromLabel } from "../sizeAndPosition";

export const noMetric = "noMetric";
export const linesOfCodeMetric = "linesOfCode";
export const charactersMetric = "characters";
export const dependenciesMetric = "dependencies";

export type TargetMetric =
  | typeof noMetric
  | typeof linesOfCodeMetric
  | typeof charactersMetric
  | typeof dependenciesMetric;

export class NapiProjectEngine {
  public cy: Core;
  private getTheme: () => "light" | "dark";
  private layout = {
    name: "fcose",
    quality: "proof",
    nodeRepulsion: 1000000,
    idealEdgeLength: 200,
    gravity: 0.1,
    packComponents: true,
    nodeDimensionsIncludeLabels: true,
  } as FcoseLayoutOptions;
  private targetMetric: TargetMetric;
  private selectedNode: NodeSingular | undefined;
  private externalCallbacks: {
    onAfterNodeClick: () => void;
    onAfterNodeDblClick: () => void;
    onAfterNodeRightClick: (data: {
      position: { x: number; y: number };
      data: NapiNodeData;
    }) => void;
  };

  constructor(
    container: HTMLElement,
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
    options?: {
      theme?: () => "light" | "dark";
      defaultMetric?: TargetMetric;
      onAfterNodeRightClick?: (data: {
        position: { x: number; y: number };
        data: NapiNodeData;
      }) => void;
    },
  ) {
    const defaultOptions = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onAfterNodeClick: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onAfterNodeDblClick: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onAfterNodeRightClick: () => {},
      theme: () => "light" as const,
      defaultMetric: noMetric as TargetMetric,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    this.targetMetric = mergedOptions.defaultMetric;

    this.externalCallbacks = {
      onAfterNodeClick: mergedOptions.onAfterNodeClick,
      onAfterNodeDblClick: mergedOptions.onAfterNodeDblClick,
      onAfterNodeRightClick: mergedOptions.onAfterNodeRightClick,
    };

    cytoscape.use(fcose);
    this.cy = cytoscape();
    this.cy.mount(container);
    this.getTheme = mergedOptions.theme;

    const theme = this.getTheme();

    const elements = this.getElementsFromManifestos(
      dependencyManifest,
      auditManifest,
    );
    this.cy.add(elements);

    this.cy.style(getCyStyleSheet(theme));
    this.cy.nodes().style({
      "background-color": (node: NodeSingular) =>
        node.data(`customData.viewColors.${this.targetMetric}`),
      "border-color": (node: NodeSingular) =>
        node.data(`customData.viewColors.${this.targetMetric}`),
    });

    this.layoutGraph(this.cy);

    this.createEventListeners();
  }

  private setNodesStyle() {
    if (this.selectedNode) {
      const closedNeighborhoodNodes = this.selectedNode
        .closedNeighborhood()
        .nodes();
      const backgroundElements = this.cy
        .elements()
        .difference(closedNeighborhoodNodes);

      this.cy.batch(() => {
        closedNeighborhoodNodes.removeStyle();
        closedNeighborhoodNodes.style({
          "border-color": (node: NodeSingular) =>
            node.data(`customData.viewColors.${this.targetMetric}`),
        });

        backgroundElements.removeStyle();
        backgroundElements.style({
          "background-color": (node: NodeSingular) =>
            node.data(`customData.viewColors.${this.targetMetric}`),
        });
      });
    } else {
      this.cy.nodes().removeStyle();
      this.cy.nodes().style({
        "background-color": (node: NodeSingular) =>
          node.data(`customData.viewColors.${this.targetMetric}`),
      });
    }
  }

  private createEventListeners() {
    this.cy.on("onetap", "node", (evt: EventObjectNode) => {
      const isAlreadySelected = this.selectedNode?.id() === evt.target.id();

      this.selectedNode = evt.target;

      const allElements = this.cy.elements();

      const connectedNodes = this.selectedNode
        .closedNeighborhood()
        .nodes()
        .difference(this.selectedNode);

      const dependentEdges = this.selectedNode
        .connectedEdges()
        .filter(
          (edge: EdgeSingular) =>
            edge.source().id() === this.selectedNode?.id(),
        );

      const dependencyEdges = this.selectedNode
        .connectedEdges()
        .filter(
          (edge: EdgeSingular) =>
            edge.target().id() === this.selectedNode?.id(),
        );

      const focusedElements = this.selectedNode.closedNeighborhood();

      const backgroundElements = allElements.difference(focusedElements);

      this.cy.batch(() => {
        // remove all, clean state
        allElements.removeClass([
          "background",
          "selected",
          "connected",
          "dependency",
          "dependent",
          "highlighted",
        ]);

        if (!isAlreadySelected) {
          // add relevant classes
          backgroundElements.addClass("background");
          connectedNodes.addClass("connected");
          dependencyEdges.addClass("dependency");
          dependentEdges.addClass("dependent");
          this.selectedNode?.addClass("selected");

          // layout the closed neighborhood
          focusedElements.layout(this.layout).run();
        } else {
          this.selectedNode = undefined;
        }

        this.setNodesStyle();
      });

      this.externalCallbacks.onAfterNodeClick();
    });

    this.cy.on("cxttap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const { x, y } = node.renderedPosition();
      const data = node.data() as NapiNodeData;

      this.externalCallbacks.onAfterNodeRightClick({
        position: { x, y },
        data,
      });
    });
  }

  public layoutGraph(collection: Collection | Core) {
    const collectionToLayout = collection || this.cy.nodes();
    collectionToLayout.layout(this.layout).run();
  }

  public setTargetMetric(metric: TargetMetric) {
    this.targetMetric = metric;

    this.setNodesStyle();
  }

  private getElementsFromManifestos(
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
  ): ElementDefinition[] {
    const theme = this.getTheme();

    const nodes = createNodes(dependencyManifest, auditManifest, theme);
    const edges = createEdges(dependencyManifest);

    return [...nodes, ...edges];
  }
}

function getCyStyleSheet(theme: "light" | "dark") {
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
        "curve-style": "straight",
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

export interface NapiNodeData {
  id: string;
  position: { x: number; y: number };
  customData: {
    fileName: string;
    viewColors: {
      noMetric: string;
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
  };
}

interface CustomNodeDefinition extends NodeDefinition {
  data: NapiNodeData & object;
}

function createNodes(
  dependencyManifest: DependencyManifest,
  auditManifest: AuditManifest,
  theme: "light" | "dark",
) {
  const nodes: CustomNodeDefinition[] = [];

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

    const nodeElement: CustomNodeDefinition = {
      data: {
        id: fileDependencyManifest.id,
        // initial node position - will be updated by layout
        position: { x: 0, y: 0 },
        customData: {
          fileName: fileDependencyManifest.id,
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

function createEdges(dependencyManifest: DependencyManifest) {
  const edges: EdgeDefinition[] = [];

  Object.values(dependencyManifest).forEach((fileManifest) => {
    for (const dependency of Object.values(fileManifest.dependencies)) {
      if (dependency.isExternal) {
        continue;
      }

      if (dependency.id === fileManifest.id) {
        continue;
      }

      edges.push({
        data: {
          source: dependency.id,
          target: fileManifest.id,
        },
      });
    }
  });

  return edges;
}

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
  theme: "light" | "dark",
  nodeAuditManifest: FileAuditManifest,
): {
  noMetric: string;
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
    noMetric: defaultColor,
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
