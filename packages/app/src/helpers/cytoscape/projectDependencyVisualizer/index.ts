import cytoscape, {
  type Collection,
  type EdgeDefinition,
  type EdgeSingular,
  type ElementDefinition,
  type EventObjectNode,
  type NodeDefinition,
  type NodeSingular,
  type StylesheetJson,
} from "cytoscape";
import type { Core } from "cytoscape";
import fcose from "cytoscape-fcose";
import type { AuditManifest, DependencyManifest, Metric } from "@napi/shared";
import {
  getCollapsedFileNodeLabel,
  getExpandedFileNodeLabel,
  getNodeWidthAndHeightFromLabel,
} from "../label/index.ts";
import type { NapiNodeData } from "./types.ts";
import {
  getMetricLevelColor,
  getMetricsSeverityForNode,
} from "../metrics/index.ts";
import { mainLayout } from "../layout/index.ts";
import { getCssValue } from "../../css/index.ts";
/**
 * ProjectDependencyVisualizer creates an interactive graph of project-level dependencies.
 *
 * This visualization provides a comprehensive view of the project's architecture where:
 * - Nodes represent individual project files, sized according to complexity metrics
 * - Edges represent import/export relationships between files
 * - Colors indicate metrics severity (code size, complexity, dependency count)
 * - Interactive features allow exploration of dependency relationships
 *
 * Key features:
 * - Theme-aware visualization with optimized colors for light/dark modes
 * - Selectable metric visualization (LOC, character count, cyclomatic complexity)
 * - Interactive node selection with focus on direct dependencies
 * - Automatic layout using F-COSE algorithm for optimal readability
 * - Support for different node states (selected, connected, highlighted)
 * - Visual representation of audit alerts and warnings
 *
 * The visualization is designed to help developers understand project structure,
 * identify problematic dependencies, and analyze code complexity at the file level.
 */
export class ProjectDependencyVisualizer {
  public cy: Core;
  private theme: "light" | "dark";
  /** Layout configuration for organizing the dependency graph */
  private layout = mainLayout;
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

        this.cy.style(this.getCyStyleSheet(this.theme));
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

    this.cy.style(this.getCyStyleSheet(this.theme));
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
    const nodes = this.createNodes(dependencyManifest, auditManifest);
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
          color: getCssValue(`--color-text-${theme}`),
          "border-width": (node: NodeSingular) => {
            return this.highlightedNodeId === node.id() ? 10 : 6;
          },
          "border-color": (node: NodeSingular) => {
            if (this.highlightedNodeId === node.id()) {
              return "yellow";
            }

            if (this.targetMetric) {
              return getMetricLevelColor(
                this.theme,
                node.data().customData.metricsSeverity[this.targetMetric],
              );
            }
            return getCssValue(`--color-primary-${theme}`);
          },
          "background-color": (node: NodeSingular) => {
            const data = node.data() as NapiNodeData;
            if (this.targetMetric) {
              return getMetricLevelColor(
                this.theme,
                data.customData.metricsSeverity[this.targetMetric],
              );
            }
            return getCssValue(`--color-primary-${theme}`);
          },
          "background-opacity": 0.4,
          shape: "circle",
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
          "background-color": getCssValue(`--color-background-${theme}`),
          "border-color": getCssValue(`--color-primary-${theme}`),
          "z-index": 2000,
          shape: "roundrectangle",
          width: "data(customData.expanded.width)",
          height: "data(customData.expanded.height)",
        },
      },
      {
        selector: "node.connected",
        style: {
          label: "data(customData.collapsed.label)",
          "background-color": getCssValue(`--color-background-${theme}`),
          "z-index": 1000,
          shape: "roundrectangle",
          width: "data(customData.collapsed.width)",
          height: "data(customData.collapsed.height)",
        },
      },
      {
        selector: "edge",
        style: {
          width: 1,
          "line-color": getCssValue(`--color-primary-${theme}`),
          "target-arrow-color": getCssValue(`--color-primary-${theme}`),
          "target-arrow-shape": "triangle",
          "curve-style": "straight",
        },
      },
      {
        selector: "edge.dependency",
        style: {
          width: 2,
          "line-color": getCssValue(`--color-primary-${theme}`),
          "target-arrow-color": getCssValue(`--color-primary-${theme}`),
        },
      },
      {
        selector: "edge.dependent",
        style: {
          width: 2,
          "line-color": getCssValue(`--color-secondary-${theme}`),
          "target-arrow-color": getCssValue(`--color-secondary-${theme}`),
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
   * @returns Array of node definitions for Cytoscape
   */
  private createNodes(
    dependencyManifest: DependencyManifest,
    auditManifest: AuditManifest,
  ) {
    interface CustomNodeDefinition extends NodeDefinition {
      data: NapiNodeData & object;
    }

    const nodes: CustomNodeDefinition[] = [];

    Object.values(dependencyManifest).forEach((fileDependencyManifest) => {
      const fileAuditManifest = auditManifest[fileDependencyManifest.id];

      const expandedLabel = getExpandedFileNodeLabel({
        fileName: fileDependencyManifest.id,
        fileAuditManifest,
      });
      const { width: expandedWitdh, height: expandedHeight } =
        getNodeWidthAndHeightFromLabel(
          expandedLabel,
        );

      const collapsedLabel = getCollapsedFileNodeLabel({
        fileName: fileDependencyManifest.id,
        fileAuditManifest,
      });
      const { width: collapsedWidth, height: collapsedHeight } =
        getNodeWidthAndHeightFromLabel(
          collapsedLabel,
        );

      const metricsColors = getMetricsSeverityForNode(fileAuditManifest);

      const nodeElement: CustomNodeDefinition = {
        data: {
          id: fileDependencyManifest.id,
          // initial node position - will be updated by layout
          position: { x: 0, y: 0 },
          customData: {
            fileName: fileDependencyManifest.id,
            metricsSeverity: metricsColors,
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
}
