import {
  type AuditManifest,
  classSymbolType,
  delegateSymbolType,
  type DependencyManifest,
  enumSymbolType,
  functionSymbolType,
  interfaceSymbolType,
  type Metric,
  recordSymbolType,
  structSymbolType,
  variableSymbolType,
} from "@napi/shared";
import type {
  Collection,
  Core,
  EdgeSingular,
  EventObjectNode,
  NodeSingular,
} from "cytoscape";
import fcose from "cytoscape-fcose";
import type { SymbolNapiNodeData } from "../elements/types.ts";
import cytoscape from "cytoscape";
import { mainLayout } from "../layout/index.ts";
import { getCytoscapeStylesheet } from "../styles/index.ts";
import { computeNodeId, getSymbolElementsInFile } from "../elements/file.ts";

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
  /** Callback functions triggered by graph interactions */
  private externalCallbacks: {
    onAfterNodeClick: () => void;
    onAfterNodeDblClick: (filePath: string, symbolId: string) => void;
    onAfterNodeRightClick: (data: {
      position: { x: number; y: number };
      filePath: string;
      symbolId: string;
    }) => void;
  };

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
        filePath: string;
        symbolId: string;
      }) => void;
      onAfterNodeDblClick?: (filePath: string, symbolId: string) => void;
    },
  ) {
    this.fileId = fileId;

    const defaultOptions = {
      onAfterNodeClick: () => {},
      onAfterNodeDblClick: () => {},
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

    this.theme = mergedOptions.theme;

    cytoscape.use(fcose);
    this.cy = cytoscape();
    this.cy.mount(container);

    this.cy.batch(() => {
      const elements = getSymbolElementsInFile(
        fileId,
        dependencyManifest,
        auditManifest,
      );
      this.cy.add(elements);

      const allNodes = this.cy.nodes();

      const currentFileNode = allNodes.filter(
        `node[fileName="${this.fileId}"]`,
      );

      allNodes.addClass("symbol");
      currentFileNode.addClass("collapsed");

      const stylesheet = getCytoscapeStylesheet(
        this.targetMetric,
        this.theme,
      );
      this.cy.style(stylesheet);

      this.layoutGraph(this.cy);

      this.createEventListeners();
    });
  }

  /**
   * Updates the theme of the visualization between light and dark mode
   *
   * @param theme - The theme to switch to ("light" or "dark")
   */
  public updateTheme(theme: "light" | "dark") {
    this.theme = theme;
    const stylesheet = getCytoscapeStylesheet(
      this.targetMetric,
      this.theme,
    );
    this.cy.style(stylesheet);
  }

  /**
   * Highlights a specific node in the graph
   *
   * @param nodeId - The ID of the node to highlight
   */
  public highlightNode(ref: { filePath: string; symbolId?: string }) {
    if (ref.symbolId) {
      const nodeId = computeNodeId(ref.filePath, ref.symbolId);

      const highlightedNode = this.cy.nodes(`node[id="${nodeId}"]`);
      const allElements = this.cy.elements();
      const otherElements = allElements.difference(highlightedNode);

      otherElements.removeClass("highlighted");
      highlightedNode.addClass("highlighted");
    }
  }

  /**
   * Unhighlights all nodes in the graph
   */
  public unhighlightNodes() {
    const allElements = this.cy.elements();

    allElements.removeClass("highlighted");
  }

  /**
   * Changes the metric used for coloring nodes and updates the visualization
   *
   * @param metric - The new metric to use for node coloring
   */
  public setTargetMetric(metric: Metric | undefined) {
    this.targetMetric = metric;

    const stylesheet = getCytoscapeStylesheet(
      this.targetMetric,
      this.theme,
    );
    this.cy.style(stylesheet);
  }

  public filterNodes(
    showExternal: boolean,
    showVariables: boolean,
    showFunctions: boolean,
    showClasses: boolean,
    showStructs: boolean,
    showEnums: boolean,
    showInterfaces: boolean,
    showRecords: boolean,
    showDelegates: boolean,
  ) {
    const nodesToHide = this.cy.nodes().filter((node: NodeSingular) => {
      const data = node.data() as SymbolNapiNodeData;
      if (data.fileName === this.fileId) {
        // never hide symbols from the current file
        return false;
      }

      if (!showExternal && data.isExternal) {
        return true;
      }

      const symbolTypeFilters = {
        [variableSymbolType]: showVariables,
        [functionSymbolType]: showFunctions,
        [classSymbolType]: showClasses,
        [structSymbolType]: showStructs,
        [enumSymbolType]: showEnums,
        [interfaceSymbolType]: showInterfaces,
        [recordSymbolType]: showRecords,
        [delegateSymbolType]: showDelegates,
      };
      for (const [symbolType, show] of Object.entries(symbolTypeFilters)) {
        if (!show && data.symbolType === symbolType) {
          return true;
        }
      }

      return false;
    });

    const elementsToHide = nodesToHide.connectedEdges().union(nodesToHide);
    const otherElements = this.cy.elements().difference(elementsToHide);

    elementsToHide.addClass("hidden");
    otherElements.removeClass("hidden");
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
      const nodeData = evt.target.data() as SymbolNapiNodeData;
      const isAlreadySelected = this.selectedNodeId === nodeId;
      this.selectedNodeId = nodeId;

      const isCurrentFile = nodeData.fileName === this.fileId;
      if (!isCurrentFile) {
        // Only allow selection of nodes within the current file
        return;
      }

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
          "collapsed",
          "expanded",
          "selected",
          "background",
          "dependency",
          "dependent",
        ]);

        if (!isAlreadySelected) {
          backgroundElements.addClass("background");

          connectedNodes.addClass("collapsed");

          selectedNode.addClass("expanded");
          selectedNode.addClass("selected");

          dependencyEdges.addClass("dependency");
          dependentEdges.addClass("dependent");

          focusedElements.layout(this.layout).run();
        } else {
          this.selectedNodeId = undefined;

          const fileNodes = this.cy.nodes().filter(
            `node[fileName="${this.fileId}"]`,
          );
          fileNodes.addClass("collapsed");
        }
      });

      this.externalCallbacks.onAfterNodeClick();
    });

    this.cy.on("dbltap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const data = node.data() as SymbolNapiNodeData;

      // If the node is external, ignore it
      if (data.isExternal) return;

      this.externalCallbacks.onAfterNodeDblClick(
        data.fileName,
        data.symbolName,
      );
    });

    this.cy.on("cxttap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const data = node.data() as SymbolNapiNodeData;

      // If the node is external, ignore it
      if (data.isExternal) return;

      const { x, y } = node.renderedPosition();
      this.externalCallbacks.onAfterNodeRightClick({
        position: { x, y },
        filePath: data.fileName,
        symbolId: data.symbolName,
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
}
