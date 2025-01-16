import { useEffect, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Background,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import { Button } from "@radix-ui/themes";
import { Endpoint } from "../../../service/api/types";
import { layoutNodesAndEdges } from "../../../service/dagree";
import { generateDarkColors } from "../../../service/groupColor";
import GroupNode from "./GroupNode";
import EndpointNode from "./EndpointNode";
import SmoothEdge from "../SmoothEdge";
import Controls from "../Controls";
import { ReactFlowSkeleton } from "../Skeleton";

export default function SplitConfigureTree(props: {
  loading: boolean;
  busy: boolean;
  endpoints: Endpoint[];
  isOutOfSynced: boolean;
  onChangeEndpointGroup: (group: string, endpoint: Endpoint) => void;
  onSync: () => void;
  onSplit: () => void;
}) {
  const nodeTypes = {
    groupNode: GroupNode,
    endpointNode: EndpointNode,
  };

  const edgeTypes = {
    smoothEdge: SmoothEdge,
  };

  const reactFlow = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const [direction, setDirection] = useState<"TB" | "LR">("TB");

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
      // Need to add an empty string to the beginning to make sure the index node is created "/"
      const pathSegments = ["", ...endpoint.path.split("/").filter(Boolean)];
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
            path: child.path,
            isBeingDragged: false,
          },
          type: "groupNode",
        };
        newNodes.push(node);

        if (parentId) {
          newEdges.push({
            id: `e-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            type: "smoothEdge",
            animated: false,
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
            busy: props.busy,
            endpoint: endpoint,
            onChangeGroup: (group: string) =>
              props.onChangeEndpointGroup(group, endpoint),
            groupColor: color,
            isBeingDragged: false,
          },
          type: "endpointNode",
        };
        newNodes.push(methodNode);
        newEdges.push({
          id: `e-${parentId}-${methodNodeId}`,
          source: parentId,
          target: methodNodeId,
          type: "smoothEdge",
          animated: false,
        });
      });
    }

    // Start creating nodes and edges from the root of the tree
    createNodesAndEdges(tree, "index");

    // Apply Dagre layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodesAndEdges(
      newNodes,
      newEdges,
      direction,
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }

  function handleReposition(direction: "TB" | "LR") {
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodesAndEdges(
      nodes,
      edges,
      direction,
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }

  function handleChangeDirection() {
    const newDirection = direction === "TB" ? "LR" : "TB";
    setDirection(newDirection);
    handleReposition(newDirection);
  }

  useEffect(() => {
    if (!props.loading) {
      const element = document.querySelector(
        ".react-flow__panel",
      ) as HTMLElement;
      if (element) {
        element.style.display = "none";
      }
    }
  }, [props.loading]);

  function onNodeDragStart(_event: React.MouseEvent, node: Node) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id
          ? { ...n, data: { ...n.data, isBeingDragged: true } }
          : n,
      ),
    );
  }

  function onNodeDragStop(_event: React.MouseEvent, node: Node) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id
          ? { ...n, data: { ...n.data, isBeingDragged: false } }
          : n,
      ),
    );
  }

  if (props.loading) {
    return <ReactFlowSkeleton />;
  }

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      fitView
    >
      <Controls
        busy={props.busy}
        reactFlow={reactFlow}
        onHandleReposition={() => handleReposition(direction)}
        onHandleChangeDirection={handleChangeDirection}
      >
        {props.isOutOfSynced ? (
          <Button
            color="orange"
            variant="solid"
            size="2"
            disabled={props.busy}
            onClick={props.onSync}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 15 15"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M1.90321 7.29677C1.90321 10.341 4.11041 12.4147 6.58893 12.8439C6.87255 12.893 7.06266 13.1627 7.01355 13.4464C6.96444 13.73 6.69471 13.9201 6.41109 13.871C3.49942 13.3668 0.86084 10.9127 0.86084 7.29677C0.860839 5.76009 1.55996 4.55245 2.37639 3.63377C2.96124 2.97568 3.63034 2.44135 4.16846 2.03202L2.53205 2.03202C2.25591 2.03202 2.03205 1.80816 2.03205 1.53202C2.03205 1.25588 2.25591 1.03202 2.53205 1.03202L5.53205 1.03202C5.80819 1.03202 6.03205 1.25588 6.03205 1.53202L6.03205 4.53202C6.03205 4.80816 5.80819 5.03202 5.53205 5.03202C5.25591 5.03202 5.03205 4.80816 5.03205 4.53202L5.03205 2.68645L5.03054 2.68759L5.03045 2.68766L5.03044 2.68767L5.03043 2.68767C4.45896 3.11868 3.76059 3.64538 3.15554 4.3262C2.44102 5.13021 1.90321 6.10154 1.90321 7.29677ZM13.0109 7.70321C13.0109 4.69115 10.8505 2.6296 8.40384 2.17029C8.12093 2.11718 7.93465 1.84479 7.98776 1.56188C8.04087 1.27898 8.31326 1.0927 8.59616 1.14581C11.4704 1.68541 14.0532 4.12605 14.0532 7.70321C14.0532 9.23988 13.3541 10.4475 12.5377 11.3662C11.9528 12.0243 11.2837 12.5586 10.7456 12.968L12.3821 12.968C12.6582 12.968 12.8821 13.1918 12.8821 13.468C12.8821 13.7441 12.6582 13.968 12.3821 13.968L9.38205 13.968C9.10591 13.968 8.88205 13.7441 8.88205 13.468L8.88205 10.468C8.88205 10.1918 9.10591 9.96796 9.38205 9.96796C9.65819 9.96796 9.88205 10.1918 9.88205 10.468L9.88205 12.3135L9.88362 12.3123C10.4551 11.8813 11.1535 11.3546 11.7585 10.6738C12.4731 9.86976 13.0109 8.89844 13.0109 7.70321Z" />
            </svg>
            Sync
          </Button>
        ) : (
          <Button
            color="pink"
            variant="solid"
            size="2"
            onClick={props.onSplit}
            disabled={props.busy}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20 3.33333V5C20 5.46083 19.6275 5.83333 19.1666 5.83333C18.7058 5.83333 18.3333 5.46083 18.3333 5V3.33333C18.3333 2.41417 17.5858 1.66667 16.6666 1.66667H15C14.5391 1.66667 14.1666 1.29417 14.1666 0.833333C14.1666 0.3725 14.5391 0 15 0H16.6666C18.505 0 20 1.495 20 3.33333ZM19.1666 10C18.7058 10 18.3333 10.3725 18.3333 10.8333V12.5C18.3333 13.4192 17.5858 14.1667 16.6666 14.1667H15C14.5391 14.1667 14.1666 14.5392 14.1666 15C14.1666 15.4608 14.5391 15.8333 15 15.8333H16.6666C18.505 15.8333 20 14.3383 20 12.5V10.8333C20 10.3725 19.6275 10 19.1666 10ZM4.99996 5.83333C5.4608 5.83333 5.8333 5.46083 5.8333 5V3.33333C5.8333 2.41417 6.5808 1.66667 7.49996 1.66667H9.16663C9.62746 1.66667 9.99996 1.29417 9.99996 0.833333C9.99996 0.3725 9.62746 0 9.16663 0H7.49996C5.66163 0 4.16663 1.495 4.16663 3.33333V5C4.16663 5.46083 4.53913 5.83333 4.99996 5.83333ZM15.7616 10.66C15.8966 10.3692 15.8358 10.0242 15.6091 9.79667L13.9875 8.175L15.0241 5.99C15.1566 5.7 15.095 5.3575 14.8691 5.13167C14.6433 4.90583 14.3008 4.84417 14.0108 4.97667L11.8258 6.01333L10.2041 4.39167C9.97746 4.165 9.6333 4.10417 9.34246 4.23833C9.05163 4.3725 8.8758 4.67417 8.90163 4.99417L9.1408 7.325L7.00163 8.44667C6.71413 8.59667 6.55246 8.91167 6.5983 9.23333C6.62246 9.40083 6.69996 9.55083 6.81413 9.665C6.91913 9.77 7.05413 9.84417 7.2058 9.87417L8.65746 10.1617L0.244131 18.5775C-0.0817025 18.9033 -0.0817025 19.43 0.244131 19.7558C0.406631 19.9183 0.619964 20 0.833297 20C1.04663 20 1.25996 19.9183 1.42246 19.7558L9.85496 11.3233L10.17 12.8167C10.2375 13.1333 10.4975 13.3742 10.82 13.4167C11.1425 13.4583 11.4558 13.2925 11.6016 13.0017L12.6833 10.8617L15.0033 11.0983C15.3233 11.1258 15.6266 10.9508 15.7616 10.66Z" />
            </svg>
            Split
          </Button>
        )}
      </Controls>
      <Background variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}
