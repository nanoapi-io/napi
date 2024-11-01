import { Node, Edge, Position } from "@xyflow/react";
import dagre from "@dagrejs/dagre";

function getNodeHeight(node: Node, isHorizontal: boolean) {
  if (isHorizontal) {
    if (node.type === "groupNode") {
      return 80;
    }
    if (node.type === "endpointNode") {
      return 150;
    }
  }

  if (node.type === "groupNode") {
    return 80;
  } else if (node.type === "endpointNode") {
    return 150;
  }

  return 100;
}

function getNodeWidth(isHorizontal: boolean) {
  if (isHorizontal) {
    return 350;
  }
  return 300;
}

export function layoutNodesAndEdges(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB",
) {
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: getNodeWidth(isHorizontal),
      height: getNodeHeight(node, isHorizontal),
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
      width: 300,
      position: {
        x: nodeWithPosition.x - getNodeWidth(isHorizontal) / 2,
        y: nodeWithPosition.y - getNodeHeight(node, isHorizontal) / 2,
      },
    };

    return newNode;
  });

  return { nodes, edges };
}
