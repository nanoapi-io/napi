import { Node, Edge, Position } from "@xyflow/react";
import dagre from "@dagrejs/dagre";

function getNodeHeight(node: Node) {
  if (node.type === "groupNode") {
    return 100;
  }
  if (node.type === "endpointNode") {
    return 200;
  }
  return 100;
}

export function layoutNodesAndEdges(nodes: Node[], edges: Edge[]) {
  const nodeWidth = 300;

  const direction = "TB";

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  // @ts-expect-error ignore ts(2367)
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: getNodeHeight(node),
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
      width: nodeWidth,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - getNodeHeight(node) / 2,
      },
    };

    return newNode;
  });

  return { nodes, edges };
}
