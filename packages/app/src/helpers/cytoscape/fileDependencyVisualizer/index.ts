import {
  AuditManifest,
  DependencyManifest,
  Metric,
  FileAuditManifest,
  SymbolDependencyManifest,
  metricLinesCount,
  metricCodeLineCount,
  metricCodeCharacterCount,
  metricCharacterCount,
  metricDependencyCount,
  metricDependentCount,
  metricCyclomaticComplexity,
} from "@napi/shared";
import {
  Core,
  NodeSingular,
  StylesheetJson,
  Collection,
  EventObjectNode,
} from "cytoscape";
import fcose, { FcoseLayoutOptions } from "cytoscape-fcose";
import { NapiNodeData } from "./types.js";
import cytoscape from "cytoscape";
import tailwindConfig from "../../../../tailwind.config.js";
import { getNodeWidthAndHeightFromLabel } from "../sizeAndPosition.js";

export class FileDependencyVisualizer {
  public cy: Core;
  private theme: "light" | "dark";
  private layout = {
    name: "fcose",
    quality: "proof",
    nodeRepulsion: 1000000,
    idealEdgeLength: 200,
    gravity: 0.1,
    packComponents: true,
    nodeDimensionsIncludeLabels: true,
  } as FcoseLayoutOptions;
  private fileId: string;
  /** Current metric used for node coloring */
  private targetMetric: Metric | undefined;
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
  /** Error and success character symbols for node labels */
  private errorChar = "⚠️";
  private successChar = "🎉";

  constructor(
    container: HTMLElement,
    fileId: string,
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
    this.fileId = fileId;

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
      fileId,
      dependencyManifest,
      auditManifest,
    );
    this.cy.add(elements);

    this.cy.style(this.getCyStyleSheet(this.theme));
    this.cy.nodes().style({
      "background-color": (node: NodeSingular) =>
        node.data(
          `customData.metricsColors.${this.targetMetric || "undefined"}`,
        ),
      "border-color": (node: NodeSingular) =>
        node.data(
          `customData.metricsColors.${this.targetMetric || "undefined"}`,
        ),
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
   * Changes the metric used for coloring nodes and updates the visualization
   *
   * @param metric - The new metric to use for node coloring
   */
  public setTargetMetric(metric: Metric | undefined) {
    this.targetMetric = metric;
    this.setNodesStyle();
  }

  /**
   * Updates styles of nodes based on the current selection state
   * and target metric for coloring.
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
            node.data(
              `customData.metricsColors.${this.targetMetric || "undefined"}`,
            ) || undefined,
        });

        backgroundElements.removeStyle();
        backgroundElements.style({
          "background-color": (node: NodeSingular) =>
            node.data(
              `customData.metricsColors.${this.targetMetric || "undefined"}`,
            ) || undefined,
          opacity: 0.2,
        });
      } else {
        this.cy.nodes().removeStyle();
        this.cy.nodes().style({
          "background-color": (node: NodeSingular) =>
            node.data(
              `customData.metricsColors.${this.targetMetric || "undefined"}`,
            ) || undefined,
        });
      }

      if (this.highlightedNodeId) {
        this.cy.nodes(`node[id="${this.highlightedNodeId}"]`).style({
          "background-color": "#FF00FF", // Magenta/fuchsia color for highlighting
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
      const nodeId = evt.target.id();
      const nodeData = evt.target.data() as NapiNodeData;

      // If the node doesn't belong to the current file, ignore the click
      if (nodeData.customData.fileName !== this.fileId) {
        return;
      }

      const isAlreadySelected = this.selectedNodeId === nodeId;

      this.selectedNodeId = nodeId;

      const allElements = this.cy.elements();

      const selectedNode = this.cy.nodes(`node[id="${this.selectedNodeId}"]`);

      const connectedNodes = selectedNode
        .closedNeighborhood()
        .nodes()
        .difference(selectedNode);

      const dependentEdges = selectedNode
        .connectedEdges()
        .filter((edge) => edge.source().id() === this.selectedNodeId);

      const dependencyEdges = selectedNode
        .connectedEdges()
        .filter((edge) => edge.target().id() === this.selectedNodeId);

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

      // If the node doesn't belong to the current file, ignore the click
      if (data.customData.fileName !== this.fileId) {
        return;
      }

      this.externalCallbacks.onAfterNodeDblClick(data);
    });

    this.cy.on("cxttap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const data = node.data() as NapiNodeData;

      // If the node doesn't belong to the current file, ignore the click
      if (data.customData.fileName !== this.fileId) {
        return;
      }

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
   * Generates the stylesheet for Cytoscape graph visualization based on theme
   *
   * @param theme - The current theme (light or dark)
   * @returns StylesheetJson for Cytoscape
   */
  private getCyStyleSheet(theme: "light" | "dark"): StylesheetJson {
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
   * Processes dependency and audit manifests to create graph elements (nodes and edges)
   * for a specific file, showing all symbols and their dependencies
   *
   * @param fileId - The ID of the file to visualize
   * @param dependencyManifest - Object containing dependency information
   * @param auditManifest - Object containing audit information
   * @returns Array of element definitions for Cytoscape
   */
  private getElementsFromManifestos(
    fileId: string,
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
  ) {
    // Get the file manifest for the current file
    const fileManifest = dependencyManifest[fileId];
    if (!fileManifest) {
      console.error(`File manifest not found for ${fileId}`);
      return [];
    }

    const fileAuditManifest = auditManifest[fileId];
    const nodes = [];
    const edges = [];

    // Create nodes for each symbol in the file
    if (fileManifest.symbols) {
      Object.values(fileManifest.symbols).forEach((symbol) => {
        const symbolId = `${fileId}:${symbol.id}`;

        // Create label for the symbol
        const expandedLabel = this.getExpandedNodeLabel({
          fileName: fileId,
          symbolName: symbol.id,
          symbolType: symbol.type,
          fileAuditManifest,
        });

        const { width: expandedWidth, height: expandedHeight } =
          getNodeWidthAndHeightFromLabel(expandedLabel);

        const collapsedLabel = this.getCollapsedNodeLabel({
          symbolName: symbol.id,
          symbolType: symbol.type,
        });

        const { width: collapsedWidth, height: collapsedHeight } =
          getNodeWidthAndHeightFromLabel(collapsedLabel);

        // Get colors for the node based on metrics
        const metricsColors = this.getMetricsColorsForNode(
          this.theme,
          fileAuditManifest,
          symbol,
        );

        // Create the node element
        const nodeElement = {
          data: {
            id: symbolId,
            // initial node position - will be updated by layout
            position: { x: 0, y: 0 },
            customData: {
              fileName: fileId,
              symbolName: symbol.id,
              metricsColors,
              expanded: {
                label: expandedLabel,
                width: expandedWidth,
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

        // Create edges for symbol dependencies
        if (symbol.dependencies) {
          Object.values(symbol.dependencies).forEach((dep) => {
            if (dep.isExternal) {
              // Skip external dependencies for now
              return;
            }

            // For each symbol this depends on, create an edge
            Object.keys(dep.symbols).forEach((depSymbolName) => {
              const depId = `${dep.id}:${depSymbolName}`;

              // Add the edge
              edges.push({
                data: {
                  source: depId,
                  target: symbolId,
                  id: `${depId}->${symbolId}`,
                },
              });
            });
          });
        }
      });
    }

    return [...nodes, ...edges];
  }

  /**
   * Generates the expanded label for a node with detailed information
   */
  private getExpandedNodeLabel(data: {
    fileName: string;
    symbolName: string;
    symbolType: string;
    fileAuditManifest: FileAuditManifest;
  }) {
    let label = `${data.symbolName} (${data.symbolType})`;
    label += `\nFile: ${data.fileName}`;

    const symbolAuditManifest = data.fileAuditManifest.symbols[data.symbolName];

    if (symbolAuditManifest) {
      Object.values(symbolAuditManifest.alerts).forEach((alert) => {
        label += `\n${this.errorChar} ${alert.message.short}`;
      });
    } else {
      label += `\n${this.successChar} No issues`;
    }

    return label;
  }

  /**
   * Generates the collapsed label for a node with minimal information
   */
  private getCollapsedNodeLabel(data: {
    symbolName: string;
    symbolType: string;
  }) {
    return data.symbolName;
  }

  /**
   * Determines the colors for a node based on metrics and severity
   */
  private getMetricsColorsForNode(
    theme: "light" | "dark",
    fileAuditManifest: FileAuditManifest,
    symbol: SymbolDependencyManifest,
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

    // Initialize with default colors (level 0 - green)
    const metrics = {
      undefined: levelToColor[0],
      [metricLinesCount]: levelToColor[0],
      [metricCodeLineCount]: levelToColor[0],
      [metricCodeCharacterCount]: levelToColor[0],
      [metricCharacterCount]: levelToColor[0],
      [metricDependencyCount]: levelToColor[0],
      [metricDependentCount]: levelToColor[0],
      [metricCyclomaticComplexity]: levelToColor[0],
    };

    const symbolAuditManifest = fileAuditManifest.symbols[symbol.id];

    if (symbolAuditManifest) {
      Object.keys(metrics).forEach((metricKey) => {
        const alert = symbolAuditManifest.alerts[metricKey];
        if (alert) {
          metrics[metricKey] = levelToColor[alert.severity];
        }
      });
    }

    return metrics;
  }
}
