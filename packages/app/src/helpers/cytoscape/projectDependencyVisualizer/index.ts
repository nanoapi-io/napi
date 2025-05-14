import cytoscape, {
  type Collection,
  type EdgeSingular,
  type EventObjectNode,
} from "cytoscape";
import type { Core } from "cytoscape";
import fcose from "cytoscape-fcose";
import type { AuditManifest, DependencyManifest, Metric } from "@napi/shared";
import type { NapiNodeData } from "../elements/types.ts";
import { mainLayout } from "../layout/index.ts";
import { getCytoscapeStylesheet } from "../styles/index.ts";
import { getFileElementsInProject } from "../elements/project.ts";

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
  /** Callback functions triggered by graph interactions */
  private externalCallbacks: {
    onAfterNodeClick: () => void;
    onAfterNodeDblClick: (filePath: string) => void;
    onAfterNodeRightClick: (data: {
      position: { x: number; y: number };
      filePath: string;
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
        filePath: string;
      }) => void;
      onAfterNodeDblClick?: (filePath: string) => void;
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

    const elements = getFileElementsInProject(
      dependencyManifest,
      auditManifest,
    );
    this.cy.add(elements);

    const stylesheet = getCytoscapeStylesheet(
      this.targetMetric,
      this.theme,
    );
    this.cy.style(stylesheet);

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
    const nodeId = ref.filePath;

    const highlightedNode = this.cy.nodes(`node[id="${nodeId}"]`);
    const allElements = this.cy.elements();
    const otherElements = allElements.difference(highlightedNode);

    otherElements.removeClass("highlighted");
    highlightedNode.addClass("highlighted");
  }

  /**
   * Unhighlights all nodes in the graph
   */
  public unhighlightNodes() {
    const allElements = this.cy.elements();

    allElements.removeClass("highlighted");
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
          "file",
          "collapsed",
          "expanded",
          "selected",
          "dependency",
          "dependent",
          "background",
        ]);

        if (!isAlreadySelected) {
          backgroundElements.addClass("background");

          connectedNodes.addClass("collapsed");
          connectedNodes.addClass("file");

          selectedNode.addClass("expanded");
          selectedNode.addClass("selected");
          selectedNode.addClass("file");

          dependencyEdges.addClass("dependency");
          dependentEdges.addClass("dependent");

          // layout the closed neighborhood
          focusedElements.layout(this.layout).run();
        } else {
          this.selectedNodeId = undefined;
        }
      });

      this.externalCallbacks.onAfterNodeClick();
    });

    this.cy.on("dbltap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const data = node.data() as NapiNodeData;
      this.externalCallbacks.onAfterNodeDblClick(data.id);
    });

    this.cy.on("cxttap", "node", (evt: EventObjectNode) => {
      const node = evt.target;
      const { x, y } = node.renderedPosition();

      this.externalCallbacks.onAfterNodeRightClick({
        position: { x, y },
        filePath: node.id(),
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

    const stylesheet = getCytoscapeStylesheet(
      this.targetMetric,
      this.theme,
    );
    this.cy.style(stylesheet);
  }
}
