import { useEffect } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "@xyflow/react";
import { Button } from "@radix-ui/themes";
import { Endpoint } from "../../service/api/types";
import { layoutNodesAndEdges } from "../../service/dagree";
import { generateDarkColors } from "../../service/groupColor";
import MethodNodeContent from "./MethodNodeContent";
import GroupNodeContent from "./GroupNodeContent";

export default function ApiTree(props: {
  busy: boolean;
  endpoints: Endpoint[];
  onChangeEndpointGroup: (group: string, endpoint: Endpoint) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  useEffect(() => {
    computeNodesAndEdgesFromEndpoints(props.endpoints);
  }, [props.endpoints]);

  function computeNodesAndEdgesFromEndpoints(endpoints: Endpoint[]) {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    interface Tree {
      path: string;
      children: Tree[];
      endpoints: Endpoint[];
    }

    const tree: Tree = { path: "/", children: [], endpoints: [] };

    let colors = generateDarkColors(1000);
    const colorMap: Record<string, string> = {};

    // Build the tree structure
    endpoints.forEach((endpoint) => {
      const pathSegments = endpoint.path.split("/").filter(Boolean);
      let currentNode = tree;

      pathSegments.forEach((segment) => {
        let childNode = currentNode.children.find(
          (child) => child.path === segment,
        );
        if (!childNode) {
          childNode = { path: segment, children: [], endpoints: [] };
          currentNode.children.push(childNode);
        }
        currentNode = childNode;
      });

      // Add the method as a leaf node
      currentNode.endpoints.push(endpoint);
    });

    // Function to recursively create nodes and edges from the tree
    function createNodesAndEdges(tree: Tree, parentId: string) {
      const keys = tree.children;

      keys.forEach((child) => {
        const nodeId = parentId ? `${parentId}-${child.path}` : child.path;
        const node: Node = {
          id: nodeId,
          position: { x: 0, y: 0 }, // Initial position, will be updated by Dagre
          data: {
            label: <GroupNodeContent nodeId={nodeId} path={child.path} />,
          },
          type: "default",
        };
        newNodes.push(node);

        if (parentId) {
          newEdges.push({
            id: `e-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            type: "step",
          });
        }

        createNodesAndEdges(child, nodeId);
      });

      tree.endpoints.forEach((endpoint) => {
        const methodNodeId = `${parentId}-${endpoint.method}`;

        let color = "";
        if (endpoint.group) {
          if (colorMap[endpoint.group]) {
            color = colorMap[endpoint.group];
          } else {
            if (colors.length === 0) {
              // We ran out of colors, generate more
              colors = generateDarkColors(1000);
            }
            colorMap[endpoint.group] = colors.pop() as string;
            color = colorMap[endpoint.group];
          }
        } else {
          if (colors.length === 0) {
            // We ran out of colors, generate more
            colors = generateDarkColors(1000);
          }
          color = colors.pop() as string;
        }

        const methodNode: Node = {
          id: methodNodeId,
          position: { x: 0, y: 0 }, // Initial position, will be updated by layoutNodesAndEdges
          data: {
            label: (
              <MethodNodeContent
                busy={props.busy}
                endpoint={endpoint}
                onChangeGroup={(group) =>
                  props.onChangeEndpointGroup(group, endpoint)
                }
              />
            ),
          },
          type: "default",
          style: { backgroundColor: `${color}` },
        };
        newNodes.push(methodNode);
        newEdges.push({
          id: `e-${parentId}-${methodNodeId}`,
          source: parentId,
          target: methodNodeId,
          type: "step",
        });
      });
    }

    // Start creating nodes and edges from the root of the tree
    createNodesAndEdges(tree, "");

    // Apply Dagre layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodesAndEdges(
      newNodes,
      newEdges,
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }

  function handleReposition() {
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodesAndEdges(
      nodes,
      edges,
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }

  return (
    <div className="relative h-full">
      <Button
        className="absolute top-4 left-4 z-10"
        size="1"
        variant="outline"
        color="gray"
        disabled={props.busy}
        onClick={handleReposition}
      >
        Align
      </Button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        fitView
      />
    </div>
  );
}
