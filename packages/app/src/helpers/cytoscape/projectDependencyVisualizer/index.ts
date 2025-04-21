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
import { DependencyManifest } from "../../../service/api/types/dependencyManifest.js";
import {
  AuditManifest,
  AuditMessage,
  FileAuditManifest,
} from "../../../service/api/types/auditManifest.js";
import tailwindConfig from "../../../../tailwind.config.js";
import { getNodeWidthAndHeightFromLabel } from "../sizeAndPosition.js";
import { NapiNodeData, noMetric, TargetMetric } from "./types.js";

/**
 * CodeDependencyVisualizer handles the visualization of project dependencies using Cytoscape.
 *
 * This class creates an interactive graph visualization where:
 * - Nodes represent project files with size based on metrics (LOC, character count)
 * - Edges represent import/export relationships between files
 * - Nodes can be styled based on different metrics and audit results
 * - Interactive features include selecting, highlighting, and focusing on dependency relationships
 * - Audit information (errors/warnings) is visually integrated into nodes
 *
 * The visualization dynamically responds to user interactions, supports different metrics
 * for node visualization, and adapts to light/dark themes.
 */
export class ProjectDependencyVisualizer {
  public cy: Core;
  private theme: "light" | "dark";
  /** Layout configuration for organizing the dependency graph */
  private layout = {
    name: "fcose",
    quality: "proof",
    nodeRepulsion: 1000000,
    idealEdgeLength: 200,
    gravity: 0.1,
    packComponents: true,
    nodeDimensionsIncludeLabels: true,
  } as FcoseLayoutOptions;
  /** Current metric used for node coloring */
  private targetMetric: TargetMetric;
  /** Currently selected node in the graph */
  private selectedNode: NodeSingular | undefined;
  /** Callback functions triggered by graph interactions */
  private externalCallbacks: {
    onAfterNodeClick: () => void;
    onAfterNodeDblClick: (data: NapiNodeData) => void;
    onAfterNodeRightClick: (data: {
      position: { x: number; y: number };
      id: string;
    }) => void;
  };

  /**
   * Creates a new CodeDependencyVisualizer instance.
   *
   * @param container - The HTML element to mount the Cytoscape graph onto
   * @param dependencyManifest - Object containing dependency information for project files
   * @param auditManifest - Object containing audit information (errors/warnings) for project files
   * @param options - Optional configuration parameters
   */
  constructor(
    container: HTMLElement,
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
    options?: {
      theme?: "light" | "dark";
      defaultMetric?: TargetMetric;
      onAfterNodeClick?: () => void;
      onAfterNodeRightClick?: (data: {
        position: { x: number; y: number };
        id: string;
      }) => void;
      onAfterNodeDblClick?: (data: NapiNodeData) => void;
    },
  ) {
    const defaultOptions = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onAfterNodeClick: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onAfterNodeDblClick: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onAfterNodeRightClick: () => {},
      theme: "light" as const,
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
    this.theme = mergedOptions.theme;

    const elements = this.getElementsFromManifestos(
      dependencyManifest,
      auditManifest,
    );
    this.cy.add(elements);

    this.cy.style(this.getCyStyleSheet(this.theme));
    this.cy.nodes().style({
      "background-color": (node: NodeSingular) =>
        node.data(`customData.viewColors.${this.targetMetric}`),
      "border-color": (node: NodeSingular) =>
        node.data(`customData.viewColors.${this.targetMetric}`),
    });

    this.layoutGraph(this.cy);

    this.createEventListeners();
  }

  /**
   * Updates the theme of the visualization between light and dark mode
   *
   * @param theme - The theme to switch to ("light" or "dark")
   */
  public updateTheme(theme: "light" | "dark") {
    this.theme = theme;
    this.cy.style(this.getCyStyleSheet(this.theme));
  }

  /**
   * Updates styles of nodes based on the current selection state
   * and target metric for coloring.
   *
   * Handles different visual states: selected nodes, connected nodes,
   * and background nodes based on relationships.
   */
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

  /**
   * Sets up event listeners for node interactions:
   * - Click: Selects a node and highlights its connections
   * - Double-click: Triggers the external double-click callback
   * - Right-click: Opens context menu via the external callback
   */
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

    this.cy.on("dbltap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const data = node.data() as NapiNodeData;
      this.externalCallbacks.onAfterNodeDblClick(data);
    });

    this.cy.on("cxttap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const { x, y } = node.renderedPosition();

      this.externalCallbacks.onAfterNodeRightClick({
        position: { x, y },
        id: node.id(),
      });
    });
  }

  /**
   * Applies the graph layout algorithm to position nodes optimally
   *
   * @param collection - The collection of elements to layout (defaults to all nodes)
   */
  public layoutGraph(collection: Collection | Core) {
    const collectionToLayout = collection || this.cy.nodes();
    collectionToLayout.layout(this.layout).run();
  }

  /**
   * Changes the metric used for coloring nodes and updates the visualization
   *
   * @param metric - The new metric to use for node coloring (e.g., LOC, characters, dependencies)
   */
  public setTargetMetric(metric: TargetMetric) {
    this.targetMetric = metric;

    this.setNodesStyle();
  }

  /**
   * Processes dependency and audit manifests to create graph elements (nodes and edges)
   *
   * @param dependencyManifest - Object containing dependency information for project files
   * @param auditManifest - Object containing audit information for project files
   * @returns Array of element definitions for Cytoscape
   */
  private getElementsFromManifestos(
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
  ): ElementDefinition[] {
    const nodes = this.createNodes(
      dependencyManifest,
      auditManifest,
      this.theme,
    );
    const edges = this.createEdges(dependencyManifest);

    return [...nodes, ...edges];
  }

  /**
   * Generates the stylesheet for Cytoscape graph visualization based on theme
   *
   * Includes styles for:
   * - Base node and edge appearance
   * - Selected nodes and their connections
   * - Background elements
   * - Dependency/dependent relationship highlighting
   *
   * @param theme - The current theme (light or dark)
   * @returns StylesheetJson for Cytoscape
   */
  private getCyStyleSheet(theme: "light" | "dark") {
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
          "background-color":
            tailwindConfig.theme.extend.colors.secondary[theme],
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
          "target-arrow-color":
            tailwindConfig.theme.extend.colors.primary[theme],
        },
      },
    ] as StylesheetJson;
  }

  /**
   * Creates node elements for the Cytoscape graph with proper styling and metrics
   *
   * Each node contains:
   * - File identification
   * - Metric data (LOC, character count, etc.)
   * - Audit information (errors/warnings)
   * - Visual properties for expanded/collapsed states
   *
   * @param dependencyManifest - Object containing dependency information for project files
   * @param auditManifest - Object containing audit information for project files
   * @param theme - The current theme (light or dark)
   * @returns Array of node definitions for Cytoscape
   */
  private createNodes(
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
    theme: "light" | "dark",
  ) {
    interface CustomNodeDefinition extends NodeDefinition {
      data: NapiNodeData & object;
    }

    const nodes: CustomNodeDefinition[] = [];

    Object.values(dependencyManifest).forEach((fileDependencyManifest) => {
      const fileAuditManifest = auditManifest[fileDependencyManifest.id];
      const errorMessages: string[] = Object.values(
        fileAuditManifest.errors,
      ).map((auditMessage) => auditMessage.shortMessage);
      const warningMessages: string[] = Object.values(
        fileAuditManifest.warnings,
      ).map((auditMessage) => auditMessage.shortMessage);

      const expandedLabel = this.getExpandedNodeLabel({
        fileName: fileDependencyManifest.id,
        fileAuditManifest,
      });
      const { width: expandedWitdh, height: expandedHeight } =
        getNodeWidthAndHeightFromLabel(expandedLabel);

      const collapsedLabel = this.getCollapsedNodeLabel({
        fileName: fileDependencyManifest.id,
        fileAuditManifest,
      });
      const { width: collapsedWidth, height: collapsedHeight } =
        getNodeWidthAndHeightFromLabel(collapsedLabel);

      const viewColors = this.getAuditColorsForNode(theme, fileAuditManifest);

      const nodeElement: CustomNodeDefinition = {
        data: {
          id: fileDependencyManifest.id,
          // initial node position - will be updated by layout
          position: { x: 0, y: 0 },
          customData: {
            fileName: fileDependencyManifest.id,
            viewColors,
            metrics: {
              linesOfCodeCount: fileDependencyManifest.lineCount,
              characterCount: fileDependencyManifest.characterCount,
              symbolCount: Object.keys(fileDependencyManifest.symbols).length,
              dependencyCount: Object.keys(fileDependencyManifest.dependencies)
                .length,
            },
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

  /**
   * Creates edge elements representing dependencies between files
   *
   * Filters out self-references and external dependencies to focus on
   * internal project structure.
   *
   * @param dependencyManifest - Object containing dependency information for project files
   * @returns Array of edge definitions for Cytoscape
   */
  private createEdges(dependencyManifest: DependencyManifest) {
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

  private errorChar = "❗";
  private warningChar = "⚠️";
  private successChar = "🎉";

  /**
   * Generates the expanded label for a node with detailed audit information
   *
   * Shows the full file name and lists all errors and warnings with their icons,
   * or a success message if no issues are found.
   *
   * @param data - Object containing file name and audit information
   * @returns Formatted label string for expanded node view
   */
  private getExpandedNodeLabel(data: {
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
        label += `\n${this.errorChar} ${message}`;
      });
      warningMessages.forEach((message) => {
        label += `\n${this.warningChar} ${message}`;
      });
    } else {
      label += `\n${this.successChar} No issues found`;
    }

    return label;
  }

  /**
   * Generates the collapsed label for a node with summarized audit information
   *
   * Shows a truncated file name and counts of errors and warnings with icons.
   *
   * @param data - Object containing file name and audit information
   * @returns Formatted label string for collapsed node view
   */
  private getCollapsedNodeLabel(data: {
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
      label += `\n${this.errorChar}(${errorMessages.length})`;
    }
    if (warningMessages.length > 0) {
      label += `\n${this.warningChar}(${warningMessages.length})`;
    }

    return label;
  }

  /**
   * Determines the colors for a node based on audit metrics and severity
   *
   * Uses a color scale from green to red based on how metrics compare to target values:
   * - Green: Within acceptable range
   * - Yellow/Orange: Approaching threshold limits
   * - Red: Exceeding recommended limits
   *
   * @param theme - The current theme (light or dark)
   * @param nodeAuditManifest - Audit information for the node
   * @returns Object containing colors for different metrics
   */
  private getAuditColorsForNode(
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

    const getColorForMetric = (
      auditError: AuditMessage | undefined,
    ): string => {
      if (!auditError) {
        return severityColorMap[0].color;
      }

      const ratio =
        parseFloat(auditError.value) / parseFloat(auditError.target);

      for (const severityColor of severityColorMap) {
        if (ratio <= severityColor.threshold) {
          return severityColor.color;
        }
      }

      return severityColorMap[severityColorMap.length - 1].color;
    };

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
}
