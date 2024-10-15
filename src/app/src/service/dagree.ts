import { Node, Edge, Position } from "@xyflow/react";
import dagre from "@dagrejs/dagre";

export function layoutNodesAndEdges(
  nodes: Node[],
  edges: Edge[],
  options: {
    nodeWidth: number;
    nodeHeight: number;
  } = { nodeWidth: 300, nodeHeight: 100 }
) {
  const direction: string = "TB";

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: options.nodeWidth,
      height: options.nodeHeight,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode: Node = {
      ...node,
      targetPosition: isHorizontal ? ("left" as Position) : ("top" as Position),
      sourcePosition: isHorizontal
        ? ("right" as Position)
        : ("bottom" as Position),
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      width: options.nodeWidth,
      position: {
        x: nodeWithPosition.x - options.nodeWidth / 2,
        y: nodeWithPosition.y - options.nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes, edges };
}
