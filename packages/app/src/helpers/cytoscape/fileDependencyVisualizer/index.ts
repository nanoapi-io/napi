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
  classSymbolType,
  functionSymbolType,
  variableSymbolType,
  enumSymbolType,
  structSymbolType,
  FileDependencyManifest,
  SymbolType,
} from "@nanoapi.io/shared";
import {
  Core,
  NodeSingular,
  StylesheetJson,
  Collection,
  EventObjectNode,
} from "cytoscape";
import fcose from "cytoscape-fcose";
import {
  NapiNodeData,
  NapiEdgeData,
  edgeTypeDependent,
  edgeTypeDependency,
} from "./types.js";
import cytoscape from "cytoscape";
import tailwindConfig from "../../../../tailwind.config.js";
import {
  getCollapsedSymbolNodeLabel,
  getExpandedSymbolNodeLabel,
  getNodeWidthAndHeightFromLabel,
} from "../label/index.js";
import {
  getMetricLevelColor,
  getMetricsSeverityForNode,
} from "../metrics/index.js";
import { mainLayout } from "../layout/index.js";

/**
 * FileDependencyVisualizer creates an interactive graph of symbol dependencies within a file.
 *
 * This visualization provides a detailed view of internal file structure where:
 * - Nodes represent symbols (functions, classes, variables) within the file
 * - Edges represent dependencies between symbols
 * - Node shapes indicate symbol types (hexagon for classes, ellipse for functions, etc.)
 * - Colors indicate metrics severity for each symbol
 *
 * Key features:
 * - Focus on a single file's internal structure and external dependencies
 * - Different node shapes for different symbol types (classes, functions, variables)
 * - Theme-aware visualization with optimized colors for light/dark modes
 * - Selectable metric visualization for symbol-level analysis
 * - Interactive node selection with focus on direct dependencies
 * - Visual distinction between internal and external symbols
 * - Comprehensive display of audit information for each symbol
 *
 * The visualization is designed to help developers understand code organization
 * at the symbol level, identify complex relationships, and analyze internal
 * dependencies within files.
 */
export class FileDependencyVisualizer {
  public cy: Core;
  private theme: "light" | "dark";
  private layout = mainLayout;
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
      data: NapiNodeData;
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
        data: NapiNodeData;
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
    this.cy.style(this.getCyStyleSheet(this.theme));
  }

  /**
   * Unhighlights all nodes in the graph
   */
  public unhighlightNodes() {
    this.highlightedNodeId = undefined;
    this.cy.style(this.getCyStyleSheet(this.theme));
  }

  /**
   * Changes the metric used for coloring nodes and updates the visualization
   *
   * @param metric - The new metric to use for node coloring
   */
  public setTargetMetric(metric: Metric | undefined) {
    this.targetMetric = metric;
    this.cy.style(this.getCyStyleSheet(this.theme));
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
      const isCurrentFileNode = nodeData.customData.fileName === this.fileId;

      // If clicking on a node that's already selected, deselect it
      const isAlreadySelected = this.selectedNodeId === nodeId;

      if (isAlreadySelected) {
        // Deselect the node
        this.cy
          .elements()
          .removeClass([
            "background",
            "selected",
            "connected",
            "dependency",
            "dependent",
            "highlighted",
          ]);
        this.selectedNodeId = undefined;
        this.cy.style(this.getCyStyleSheet(this.theme));
        this.externalCallbacks.onAfterNodeClick();
        return;
      }

      this.selectedNodeId = nodeId;
      const selectedNode = evt.target;

      // For nodes in the current file, expand and show neighbors
      if (isCurrentFileNode) {
        const allElements = this.cy.elements();
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

          // add relevant classes
          backgroundElements.addClass("background");
          connectedNodes.addClass("connected");
          dependencyEdges.addClass("dependency");
          dependentEdges.addClass("dependent");
          selectedNode.addClass("selected");

          // layout the closed neighborhood
          focusedElements.layout(this.layout).run();
        });

        this.cy.style(this.getCyStyleSheet(this.theme));
        this.externalCallbacks.onAfterNodeClick();
        return;
      }

      // For nodes not in current file, just expand the node without affecting other nodes
      this.cy.batch(() => {
        // Just mark the clicked node as selected
        selectedNode.addClass("selected");
      });
      this.cy.style(this.getCyStyleSheet(this.theme));
      this.externalCallbacks.onAfterNodeClick();
    });

    this.cy.on("dbltap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const data = node.data() as NapiNodeData;

      // If the node is external, ignore it
      if (data.customData.isExternal) return;

      this.externalCallbacks.onAfterNodeDblClick(data);
    });

    this.cy.on("cxttap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const data = node.data() as NapiNodeData;

      // If the node is external, ignore it
      if (data.customData.isExternal) return;

      const { x, y } = node.renderedPosition();
      this.externalCallbacks.onAfterNodeRightClick({
        position: { x, y },
        data,
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

  private computeNodeId(fileId: string, symbolId: string) {
    return `${fileId}:${symbolId}`;
  }

  /**
   * Creates node data with all required properties
   */
  private createNodeData(params: {
    id: string;
    fileName: string;
    symbolName: string;
    symbolType: string;
    isExternal: boolean;
    metricsSeverity: {
      [metricLinesCount]: number;
      [metricCodeLineCount]: number;
      [metricCodeCharacterCount]: number;
      [metricCharacterCount]: number;
      [metricDependencyCount]: number;
      [metricDependentCount]: number;
      [metricCyclomaticComplexity]: number;
    };
    expandedLabel: string;
    collapsedLabel: string;
  }): NapiNodeData {
    // Calculate dimensions for expanded and collapsed views
    const { width: expandedWidth, height: expandedHeight } =
      getNodeWidthAndHeightFromLabel(params.expandedLabel);

    const { width: collapsedWidth, height: collapsedHeight } =
      getNodeWidthAndHeightFromLabel(params.collapsedLabel);

    // Create the node data structure
    return {
      id: params.id,
      position: { x: 0, y: 0 },
      customData: {
        fileName: params.fileName,
        symbolName: params.symbolName,
        symbolType: params.symbolType,
        isExternal: params.isExternal,
        metricsSeverity: params.metricsSeverity,
        expanded: {
          label: params.expandedLabel,
          width: expandedWidth,
          height: expandedHeight,
        },
        collapsed: {
          label: params.collapsedLabel,
          width: collapsedWidth,
          height: collapsedHeight,
        },
      },
    };
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

    // First pass: Create nodes for each symbol in the file
    Object.values(fileManifest.symbols).forEach((symbol) => {
      const symbolAuditManifest = fileAuditManifest.symbols[symbol.id];
      const symbolNodeId = this.computeNodeId(fileId, symbol.id);

      // Create labels for the symbol
      const expandedLabel = getExpandedSymbolNodeLabel({
        currentFileId: fileId,
        fileName: fileId,
        symbolName: symbol.id,
        symbolType: symbol.type,
        symbolAuditManifest,
      });
      const collapsedLabel = getCollapsedSymbolNodeLabel({
        symbolName: symbol.id,
      });

      const metricsSeverity = getMetricsSeverityForNode(symbolAuditManifest);

      const nodeData = this.createNodeData({
        id: symbolNodeId,
        fileName: fileId,
        symbolName: symbol.id,
        symbolType: symbol.type,
        isExternal: false,
        metricsSeverity,
        expandedLabel,
        collapsedLabel,
      });

      nodes.push({ data: nodeData });
    });

    // Second pass: Create nodes and edges for dependencies and dependents
    Object.values(fileManifest.symbols).forEach((symbol) => {
      const symbolNodeId = this.computeNodeId(fileId, symbol.id);

      // Process dependencies
      this.processDependencies(
        symbol,
        symbolNodeId,
        dependencyManifest,
        auditManifest,
        nodes,
        edges,
      );

      // Process dependents
      this.processDependents(
        symbol,
        symbolNodeId,
        dependencyManifest,
        auditManifest,
        nodes,
        edges,
      );
    });

    return [...nodes, ...edges];
  }

  /**
   * Process dependencies of a symbol and create corresponding nodes and edges
   */
  private processDependencies(
    symbol: SymbolDependencyManifest,
    symbolNodeId: string,
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
    nodes: { data: NapiNodeData }[],
    edges: { data: NapiEdgeData }[],
  ) {
    Object.values(symbol.dependencies).forEach((dep) => {
      let depDependencyManifest: FileDependencyManifest | undefined;
      let depAuditManifest: FileAuditManifest | undefined;

      if (!dep.isExternal) {
        depDependencyManifest = dependencyManifest[dep.id];
        depAuditManifest = auditManifest[dep.id];
      }

      // For each symbol this depends on, create an edge
      Object.keys(dep.symbols).forEach((depSymbolName) => {
        const depSymbolNodeId = this.computeNodeId(dep.id, depSymbolName);

        // Check if node already exists
        const existingNode = nodes.find(
          (node) => node.data.id === depSymbolNodeId,
        );

        if (!existingNode) {
          let depSymbolType: SymbolType | "unknown" = "unknown";
          if (depDependencyManifest) {
            depSymbolType = depDependencyManifest.symbols[depSymbolName].type;
          }

          // Create label for dependency nodes
          const expandedLabel = getExpandedSymbolNodeLabel({
            currentFileId: dep.id,
            fileName: dep.id,
            symbolName: depSymbolName,
            symbolType: depSymbolType,
            symbolAuditManifest: depAuditManifest?.symbols[depSymbolName],
          });

          const metricsSeverity = getMetricsSeverityForNode(
            depAuditManifest?.symbols[depSymbolName],
          );

          const nodeData = this.createNodeData({
            id: depSymbolNodeId,
            fileName: dep.id,
            symbolName: depSymbolName,
            symbolType: depSymbolType,
            isExternal: dep.isExternal,
            metricsSeverity,
            expandedLabel,
            collapsedLabel: depSymbolName,
          });

          nodes.push({ data: nodeData });
        }

        // Add the edge
        const edgeId = `${depSymbolNodeId}->${symbolNodeId}`;
        edges.push({
          data: {
            id: edgeId,
            source: depSymbolNodeId,
            target: symbolNodeId,
            customData: {
              type: edgeTypeDependency,
            },
          },
        });
      });
    });
  }

  /**
   * Process dependents of a symbol and create corresponding nodes and edges
   */
  private processDependents(
    symbol: SymbolDependencyManifest,
    symbolNodeId: string,
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
    nodes: { data: NapiNodeData }[],
    edges: { data: NapiEdgeData }[],
  ) {
    Object.values(symbol.dependents).forEach((dep) => {
      const depDependencyManifest = dependencyManifest[dep.id];
      const depAuditManifest = auditManifest[dep.id];

      Object.keys(dep.symbols).forEach((depSymbolName) => {
        const depSymbolNodeId = this.computeNodeId(dep.id, depSymbolName);

        // Check if node already exists
        const existingNode = nodes.find(
          (node) => node.data.id === depSymbolNodeId,
        );

        if (!existingNode) {
          const depSymbolType =
            depDependencyManifest.symbols[depSymbolName].type;

          // Create label for dependent nodes
          const expandedLabel = getExpandedSymbolNodeLabel({
            currentFileId: dep.id,
            fileName: dep.id,
            symbolName: depSymbolName,
            symbolType: depSymbolType,
            symbolAuditManifest: depAuditManifest?.symbols[depSymbolName],
          });

          const metricsSeverity = getMetricsSeverityForNode(
            depAuditManifest?.symbols[depSymbolName],
          );

          const nodeData = this.createNodeData({
            id: depSymbolNodeId,
            fileName: dep.id,
            symbolName: depSymbolName,
            symbolType: depSymbolType,
            isExternal: false,
            metricsSeverity,
            expandedLabel,
            collapsedLabel: depSymbolName,
          });

          nodes.push({ data: nodeData });
        }

        // Add the edge
        const edgeId = `${symbolNodeId}->${depSymbolNodeId}`;
        edges.push({
          data: {
            id: edgeId,
            source: symbolNodeId,
            target: depSymbolNodeId,
            customData: {
              type: edgeTypeDependent,
            },
          },
        });
      });
    });
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
          label: "data(customData.collapsed.label)",
          "text-wrap": "wrap",
          color: tailwindConfig.theme.extend.colors.text[theme],
          "border-width": 4,
          "border-color": (node: NodeSingular) => {
            const data = node.data() as NapiNodeData;
            if (data.customData.isExternal) {
              return tailwindConfig.theme.extend.colors.border[theme];
            } else if (data.customData.fileName !== this.fileId) {
              return tailwindConfig.theme.extend.colors.secondary[theme];
            }

            if (this.targetMetric) {
              return getMetricLevelColor(
                this.theme,
                data.customData.metricsSeverity[this.targetMetric],
              );
            }

            return tailwindConfig.theme.extend.colors.primary[theme];
          },
          "background-color": (node: NodeSingular) => {
            const data = node.data() as NapiNodeData;

            if (data.customData.isExternal) {
              return tailwindConfig.theme.extend.colors.border[theme];
            }

            if (data.customData.fileName !== this.fileId) {
              return tailwindConfig.theme.extend.colors.secondary[theme];
            }

            if (this.targetMetric) {
              return getMetricLevelColor(
                this.theme,
                data.customData.metricsSeverity[this.targetMetric],
              );
            }

            return tailwindConfig.theme.extend.colors.primary[theme];
          },

          shape: (node: NodeSingular) => {
            const symbolTypeToShape = {
              [classSymbolType]: "hexagon",
              [functionSymbolType]: "ellipse",
              [variableSymbolType]: "diamond",
              [structSymbolType]: "hexagon",
              [enumSymbolType]: "triangle",
            };

            const fallbackShape = "octagon";

            const data = node.data() as NapiNodeData;

            return (
              symbolTypeToShape[data.customData.symbolType] || fallbackShape
            );
          },
          "background-opacity": 0.2,
          width: "data(customData.collapsed.width)",
          height: "data(customData.collapsed.height)",
          "text-valign": "center",
          "text-halign": "center",
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
          "border-width": 5,
          "z-index": 2000,
          width: "data(customData.expanded.width)",
          height: "data(customData.expanded.height)",
        },
      },
      {
        selector: "node.connected",
        style: {
          "border-width": 5,
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
          "line-opacity": 1,
          "target-arrow-color": tailwindConfig.theme.extend.colors.text[theme],
          "target-arrow-shape": "triangle",
          "curve-style": "straight",
          "arrow-scale": 1,
        },
      },
      {
        selector: `edge[customData.type = '${edgeTypeDependent}']`,
        style: {
          "line-color": tailwindConfig.theme.extend.colors.secondary[theme],
          "target-arrow-color":
            tailwindConfig.theme.extend.colors.secondary[theme],
        },
      },
      {
        selector: `edge[customData.type = '${edgeTypeDependency}']`,
        style: {
          "line-color": tailwindConfig.theme.extend.colors.primary[theme],
          "target-arrow-color":
            tailwindConfig.theme.extend.colors.primary[theme],
        },
      },
      {
        selector: "edge.background",
        style: {
          "line-opacity": 0.1,
        },
      },
      {
        selector: ".hidden",
        style: {
          display: "none",
        },
      },
    ] as StylesheetJson;
  }
}
