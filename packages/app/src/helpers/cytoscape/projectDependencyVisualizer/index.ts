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
import {
  DependencyManifest,
  AuditManifest,
  FileAuditManifest,
  metricLinesCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCharacterCount,
  metricDependencyCount,
  metricDependentCount,
  metricCyclomaticComplexity,
  Metric,
} from "@napi/shared";
import tailwindConfig from "../../../../tailwind.config.js";
import { getNodeWidthAndHeightFromLabel } from "../sizeAndPosition.js";
import { NapiNodeData } from "./types.js";

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
  private targetMetric: Metric;
  /** Currently selected node in the graph */
  private selectedNodeId: string | undefined;
  /** Currently highlighted node in the graph */
  private highlightedNodeId: string | undefined;
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
      defaultMetric?: Metric | undefined;
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
      defaultMetric: undefined,
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
   * Highlights a specific node in the graph
   *
   * @param nodeId - The ID of the node to highlight
   */
  public highlightNode(nodeId: string) {
    this.highlightedNodeId = nodeId;
    this.setNodesStyle();
  }

  /**
   * Unhighlights all nodes in the graph
   */
  public unhighlightNodes() {
    this.highlightedNodeId = undefined;
    this.setNodesStyle();
  }

  /**
   * Updates styles of nodes based on the current selection state
   * and target metric for coloring.
   *
   * Handles different visual states: selected nodes, connected nodes,
   * and background nodes based on relationships.
   */
  private setNodesStyle() {
    this.cy.batch(() => {
      if (this.selectedNodeId) {
        const closedNeighborhoodNodes = this.cy
          .nodes(`node[id="${this.selectedNodeId}"]`)
          .closedNeighborhood()
          .nodes();
        const backgroundElements = this.cy
          .elements()
          .difference(closedNeighborhoodNodes);

        closedNeighborhoodNodes.removeStyle();
        closedNeighborhoodNodes.style({
          "border-color": (node: NodeSingular) =>
            node.data(`customData.viewColors.${this.targetMetric}`) ||
            undefined,
        });

        backgroundElements.removeStyle();
        backgroundElements.style({
          "background-color": (node: NodeSingular) =>
            node.data(`customData.viewColors.${this.targetMetric}`) ||
            undefined,
        });
      } else {
        this.cy.nodes().removeStyle();
        this.cy.nodes().style({
          "background-color": (node: NodeSingular) =>
            node.data(`customData.viewColors.${this.targetMetric}`) ||
            undefined,
        });
      }

      if (this.highlightedNodeId) {
        this.cy.nodes(`node[id="${this.highlightedNodeId}"]`).style({
          "background-color": "#FF00FF", // Magenta/fuchsia color not used elsewhere
        });
      }
    });
  }

  /**
   * Sets up event listeners for node interactions:
   * - Click: Selects a node and highlights its connections
   * - Double-click: Triggers the external double-click callback
   * - Right-click: Opens context menu via the external callback
   */
  private createEventListeners() {
    this.cy.on("onetap", "node", (evt: EventObjectNode) => {
      const isAlreadySelected = this.selectedNodeId === evt.target.id();

      this.selectedNodeId = evt.target.id();

      const allElements = this.cy.elements();

      const selectedNode = this.cy.nodes(`node[id="${this.selectedNodeId}"]`);

      const connectedNodes = selectedNode
        .closedNeighborhood()
        .nodes()
        .difference(selectedNode);

      const dependentEdges = selectedNode
        .connectedEdges()
        .filter(
          (edge: EdgeSingular) => edge.source().id() === this.selectedNodeId,
        );

      const dependencyEdges = selectedNode
        .connectedEdges()
        .filter(
          (edge: EdgeSingular) => edge.target().id() === this.selectedNodeId,
        );

      const focusedElements = selectedNode.closedNeighborhood();

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
          selectedNode.addClass("selected");

          // layout the closed neighborhood
          focusedElements.layout(this.layout).run();
        } else {
          this.selectedNodeId = undefined;
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
  public setTargetMetric(metric: Metric | undefined) {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const alertMessage: string[] = Object.values(
        fileAuditManifest.alerts,
      ).map((alert) => alert.message.short);

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

      const metricsColors = this.getMetricsColorsForNode(
        theme,
        fileAuditManifest,
      );

      const nodeElement: CustomNodeDefinition = {
        data: {
          id: fileDependencyManifest.id,
          // initial node position - will be updated by layout
          position: { x: 0, y: 0 },
          customData: {
            fileName: fileDependencyManifest.id,
            metricsColors,
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

  private errorChar = "⚠️";
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

    const alerts = Object.values(data.fileAuditManifest.alerts);

    if (alerts.length > 0) {
      alerts.forEach((alert) => {
        label += `\n${this.errorChar} ${alert.message.short}`;
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

    const alerts = Object.values(data.fileAuditManifest.alerts);

    if (alerts.length > 0) {
      label += `\n${this.errorChar}(${alerts.length})`;
    }

    return label;
  }

  /**
   * Determines the colors for a node based on audit metrics and severity
   *
   * Uses a color scale from green to red based on severity levels:
   * - Green (0): No issues
   * - Yellow (1): Minor issues
   * - Orange (2): Moderate issues
   * - Amber (3): Significant issues
   * - Dark Red (4): Severe issues
   * - Red (5): Critical issues
   *
   * @param fileAuditManifest - Audit information for the file
   * @returns Object containing colors for different metrics
   */
  private getMetricsColorsForNode(
    theme: "light" | "dark",
    fileAuditManifest: FileAuditManifest,
  ) {
    const levelToColor =
      theme === "light"
        ? {
            0: "#22c55e", // green
            1: "#eab308", // yellow
            2: "#f97316", // orange
            3: "#d97706", // amber
            4: "#991b1b", // dark red
            5: "#ef4444", // red
          }
        : {
            0: "#4ade80", // lighter green for dark theme
            1: "#facc15", // brighter yellow for dark theme
            2: "#fb923c", // lighter orange for dark theme
            3: "#fbbf24", // brighter amber for dark theme
            4: "#b91c1c", // slightly brighter dark red for dark theme
            5: "#f87171", // lighter red for dark theme
          };

    const metrics = {
      [metricLinesCount]: levelToColor[0],
      [metricCodeLineCount]: levelToColor[0],
      [metricCodeCharacterCount]: levelToColor[0],
      [metricCharacterCount]: levelToColor[0],
      [metricDependencyCount]: levelToColor[0],
      [metricDependentCount]: levelToColor[0],
      [metricCyclomaticComplexity]: levelToColor[0],
    };

    // Check each metric for audit alerts
    Object.keys(metrics).forEach((metricKey) => {
      // Look for audit alert related to this metric
      const alert = fileAuditManifest.alerts[metricKey];
      if (alert) {
        metrics[metricKey] = levelToColor[alert.severity];
      }
    });

    return metrics;
  }
}
