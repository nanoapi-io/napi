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
import { Endpoint } from "../../service/api/types";
import { layoutNodesAndEdges } from "../../service/dagree";
import { generateDarkColors } from "../../service/groupColor";
import GroupNode from "./GroupNode";
import EndpointNode from "./EndpointNode";
import CustomEdge from "./Edge";

export default function ApiTree(props: {
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
    customEdge: CustomEdge,
  };

  const reactFlow = useReactFlow();

  const [currentZoom, setCurrentZoom] = useState<number>(reactFlow.getZoom());

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
            path: child.path,
          },
          type: "groupNode",
        };
        newNodes.push(node);

        if (parentId) {
          newEdges.push({
            id: `e-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            type: "customEdge",
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
          },
          type: "endpointNode",
        };
        newNodes.push(methodNode);
        newEdges.push({
          id: `e-${parentId}-${methodNodeId}`,
          source: parentId,
          target: methodNodeId,
          type: "step",
          animated: false,
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

  function handleFitView() {
    reactFlow.fitView();
    updateZoom();
  }

  function updateZoom() {
    setCurrentZoom(reactFlow.getZoom());
  }

  useEffect(() => {
    const element = document.querySelector(".react-flow__panel") as HTMLElement;
    if (element) {
      element.style.display = "none";
    }
  }, []);

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      fitView
      onViewportChange={updateZoom}
    >
      <div className="absolute bottom-6 inset-x-4 z-10 flex justify-around">
        <div className="flex gap-3 items-center">
          <div className="bg-background-light dark:bg-background-dark flex gap-4 pt-2 pb-1 px-3 rounded-lg">
            <Button
              size="1"
              variant="ghost"
              highContrast
              disabled={props.busy}
              onClick={props.onSync}
              className="rounded-md"
            >
              {props.isOutOfSynced ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 15 15"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[orange]"
                >
                  <path d="M1.90321 7.29677C1.90321 10.341 4.11041 12.4147 6.58893 12.8439C6.87255 12.893 7.06266 13.1627 7.01355 13.4464C6.96444 13.73 6.69471 13.9201 6.41109 13.871C3.49942 13.3668 0.86084 10.9127 0.86084 7.29677C0.860839 5.76009 1.55996 4.55245 2.37639 3.63377C2.96124 2.97568 3.63034 2.44135 4.16846 2.03202L2.53205 2.03202C2.25591 2.03202 2.03205 1.80816 2.03205 1.53202C2.03205 1.25588 2.25591 1.03202 2.53205 1.03202L5.53205 1.03202C5.80819 1.03202 6.03205 1.25588 6.03205 1.53202L6.03205 4.53202C6.03205 4.80816 5.80819 5.03202 5.53205 5.03202C5.25591 5.03202 5.03205 4.80816 5.03205 4.53202L5.03205 2.68645L5.03054 2.68759L5.03045 2.68766L5.03044 2.68767L5.03043 2.68767C4.45896 3.11868 3.76059 3.64538 3.15554 4.3262C2.44102 5.13021 1.90321 6.10154 1.90321 7.29677ZM13.0109 7.70321C13.0109 4.69115 10.8505 2.6296 8.40384 2.17029C8.12093 2.11718 7.93465 1.84479 7.98776 1.56188C8.04087 1.27898 8.31326 1.0927 8.59616 1.14581C11.4704 1.68541 14.0532 4.12605 14.0532 7.70321C14.0532 9.23988 13.3541 10.4475 12.5377 11.3662C11.9528 12.0243 11.2837 12.5586 10.7456 12.968L12.3821 12.968C12.6582 12.968 12.8821 13.1918 12.8821 13.468C12.8821 13.7441 12.6582 13.968 12.3821 13.968L9.38205 13.968C9.10591 13.968 8.88205 13.7441 8.88205 13.468L8.88205 10.468C8.88205 10.1918 9.10591 9.96796 9.38205 9.96796C9.65819 9.96796 9.88205 10.1918 9.88205 10.468L9.88205 12.3135L9.88362 12.3123C10.4551 11.8813 11.1535 11.3546 11.7585 10.6738C12.4731 9.86976 13.0109 8.89844 13.0109 7.70321Z" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 15 15"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[green]"
                >
                  <path d="M7.49991 0.877045C3.84222 0.877045 0.877075 3.84219 0.877075 7.49988C0.877075 11.1575 3.84222 14.1227 7.49991 14.1227C11.1576 14.1227 14.1227 11.1575 14.1227 7.49988C14.1227 3.84219 11.1576 0.877045 7.49991 0.877045ZM1.82708 7.49988C1.82708 4.36686 4.36689 1.82704 7.49991 1.82704C10.6329 1.82704 13.1727 4.36686 13.1727 7.49988C13.1727 10.6329 10.6329 13.1727 7.49991 13.1727C4.36689 13.1727 1.82708 10.6329 1.82708 7.49988ZM10.1589 5.53774C10.3178 5.31191 10.2636 5.00001 10.0378 4.84109C9.81194 4.68217 9.50004 4.73642 9.34112 4.96225L6.51977 8.97154L5.35681 7.78706C5.16334 7.59002 4.84677 7.58711 4.64973 7.78058C4.45268 7.97404 4.44978 8.29061 4.64325 8.48765L6.22658 10.1003C6.33054 10.2062 6.47617 10.2604 6.62407 10.2483C6.77197 10.2363 6.90686 10.1591 6.99226 10.0377L10.1589 5.53774Z"></path>
                </svg>
              )}
            </Button>
            <Button
              size="1"
              variant="ghost"
              highContrast
              disabled={props.busy}
              onClick={handleFitView}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="text-text-light dark:text-text-dark"
              >
                <path d="M15.8334 19.9999H14.1667C13.9457 19.9999 13.7337 19.9121 13.5775 19.7558C13.4212 19.5996 13.3334 19.3876 13.3334 19.1666C13.3334 18.9456 13.4212 18.7336 13.5775 18.5773C13.7337 18.421 13.9457 18.3333 14.1667 18.3333H15.8334C16.4964 18.3333 17.1323 18.0699 17.6011 17.601C18.07 17.1322 18.3334 16.4963 18.3334 15.8333V14.1666C18.3334 13.9456 18.4212 13.7336 18.5775 13.5773C18.7337 13.421 18.9457 13.3333 19.1667 13.3333C19.3877 13.3333 19.5997 13.421 19.756 13.5773C19.9122 13.7336 20 13.9456 20 14.1666V15.8333C19.9987 16.9379 19.5593 17.997 18.7782 18.7781C17.9971 19.5592 16.938 19.9986 15.8334 19.9999Z" />
                <path d="M0.833333 6.66667C0.61232 6.66667 0.400358 6.57887 0.244078 6.42259C0.0877974 6.26631 0 6.05435 0 5.83333V4.16667C0.00132321 3.062 0.440735 2.00296 1.22185 1.22185C2.00296 0.440735 3.062 0.00132321 4.16667 0L5.83333 0C6.05435 0 6.26631 0.0877974 6.42259 0.244078C6.57887 0.400358 6.66667 0.61232 6.66667 0.833333C6.66667 1.05435 6.57887 1.26631 6.42259 1.42259C6.26631 1.57887 6.05435 1.66667 5.83333 1.66667H4.16667C3.50363 1.66667 2.86774 1.93006 2.3989 2.3989C1.93006 2.86774 1.66667 3.50363 1.66667 4.16667V5.83333C1.66667 6.05435 1.57887 6.26631 1.42259 6.42259C1.26631 6.57887 1.05435 6.66667 0.833333 6.66667Z" />
                <path d="M5.83333 19.9999H4.16667C3.062 19.9986 2.00296 19.5592 1.22185 18.7781C0.440735 17.997 0.00132321 16.9379 0 15.8333L0 14.1666C0 13.9456 0.0877974 13.7336 0.244078 13.5773C0.400358 13.421 0.61232 13.3333 0.833333 13.3333C1.05435 13.3333 1.26631 13.421 1.42259 13.5773C1.57887 13.7336 1.66667 13.9456 1.66667 14.1666V15.8333C1.66667 16.4963 1.93006 17.1322 2.3989 17.601C2.86774 18.0699 3.50363 18.3333 4.16667 18.3333H5.83333C6.05435 18.3333 6.26631 18.421 6.42259 18.5773C6.57887 18.7336 6.66667 18.9456 6.66667 19.1666C6.66667 19.3876 6.57887 19.5996 6.42259 19.7558C6.26631 19.9121 6.05435 19.9999 5.83333 19.9999Z" />
                <path d="M19.1667 6.66667C18.9457 6.66667 18.7337 6.57887 18.5775 6.42259C18.4212 6.26631 18.3334 6.05435 18.3334 5.83333V4.16667C18.3334 3.50363 18.07 2.86774 17.6011 2.3989C17.1323 1.93006 16.4964 1.66667 15.8334 1.66667H14.1667C13.9457 1.66667 13.7337 1.57887 13.5775 1.42259C13.4212 1.26631 13.3334 1.05435 13.3334 0.833333C13.3334 0.61232 13.4212 0.400358 13.5775 0.244078C13.7337 0.0877974 13.9457 0 14.1667 0L15.8334 0C16.938 0.00132321 17.9971 0.440735 18.7782 1.22185C19.5593 2.00296 19.9987 3.062 20 4.16667V5.83333C20 6.05435 19.9122 6.26631 19.756 6.42259C19.5997 6.57887 19.3877 6.66667 19.1667 6.66667Z" />
              </svg>
            </Button>
            <Button
              size="1"
              variant="ghost"
              highContrast
              disabled={props.busy}
              onClick={handleReposition}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="text-text-light dark:text-text-dark"
              >
                <path d="M15 3c.552 0 1 .448 1 1v4c0 .552-.448 1-1 1h-2v2h4c.552 0 1 .448 1 1v3h2c.552 0 1 .448 1 1v4c0 .552-.448 1-1 1h-6c-.552 0-1-.448-1-1v-4c0-.552.448-1 1-1h2v-2H8v2h2c.552 0 1 .448 1 1v4c0 .552-.448 1-1 1H4c-.552 0-1-.448-1-1v-4c0-.552.448-1 1-1h2v-3c0-.552.448-1 1-1h4V9H9c-.552 0-1-.448-1-1V4c0-.552.448-1 1-1h6zM9 17H5v2h4v-2zm10 0h-4v2h4v-2zM14 5h-4v2h4V5z"></path>{" "}
              </svg>
            </Button>
            <Button
              size="1"
              variant="ghost"
              highContrast
              disabled={props.busy}
              onClick={() => reactFlow.zoomOut()}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="text-text-light dark:text-text-dark"
              >
                <path d="M19.7559 18.5774L14.7817 13.6033C16.1373 11.9454 16.8037 9.83002 16.6433 7.69458C16.4828 5.55913 15.5077 3.56705 13.9197 2.13037C12.3317 0.693699 10.2522 -0.0776494 8.11143 -0.0241229C5.97064 0.0294036 3.93232 0.90371 2.41807 2.41795C0.903832 3.93219 0.0295257 5.97052 -0.0240008 8.11131C-0.0775274 10.2521 0.693821 12.3316 2.1305 13.9196C3.56717 15.5076 5.55926 16.4827 7.6947 16.6431C9.83014 16.8036 11.9456 16.1371 13.6034 14.7816L18.5776 19.7558C18.7347 19.9076 18.9452 19.9916 19.1637 19.9897C19.3822 19.9878 19.5912 19.9001 19.7457 19.7456C19.9003 19.5911 19.9879 19.3821 19.9898 19.1636C19.9917 18.9451 19.9077 18.7346 19.7559 18.5774ZM8.3334 14.9999C7.01485 14.9999 5.72592 14.6089 4.62959 13.8764C3.53327 13.1439 2.67878 12.1027 2.1742 10.8845C1.66961 9.66632 1.53759 8.32588 1.79483 7.03267C2.05206 5.73947 2.687 4.55158 3.61935 3.61923C4.5517 2.68688 5.73959 2.05194 7.03279 1.79471C8.326 1.53747 9.66644 1.66949 10.8846 2.17408C12.1028 2.67866 13.144 3.53314 13.8765 4.62947C14.6091 5.7258 15.0001 7.01473 15.0001 8.33327C14.9981 10.1008 14.2951 11.7953 13.0452 13.0451C11.7954 14.2949 10.1009 14.998 8.3334 14.9999Z" />
                <path d="M10.8333 7.5H5.83333C5.61232 7.5 5.40036 7.5878 5.24408 7.74408C5.0878 7.90036 5 8.11232 5 8.33333C5 8.55435 5.0878 8.76631 5.24408 8.92259C5.40036 9.07887 5.61232 9.16667 5.83333 9.16667H10.8333C11.0543 9.16667 11.2663 9.07887 11.4226 8.92259C11.5789 8.76631 11.6667 8.55435 11.6667 8.33333C11.6667 8.11232 11.5789 7.90036 11.4226 7.74408C11.2663 7.5878 11.0543 7.5 10.8333 7.5Z" />
              </svg>
            </Button>
            <div>{(currentZoom * 100).toFixed(0)}%</div>
            <Button
              size="1"
              variant="ghost"
              highContrast
              disabled={props.busy}
              onClick={() => reactFlow.zoomIn()}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="text-text-light dark:text-text-dark"
              >
                <path d="M19.7559 18.5774L14.7817 13.6033C16.1373 11.9454 16.8037 9.83002 16.6433 7.69458C16.4828 5.55913 15.5077 3.56705 13.9197 2.13037C12.3317 0.693699 10.2522 -0.0776494 8.11143 -0.0241229C5.97064 0.0294036 3.93232 0.90371 2.41807 2.41795C0.903832 3.93219 0.0295257 5.97052 -0.0240008 8.11131C-0.0775274 10.2521 0.693821 12.3316 2.1305 13.9196C3.56717 15.5076 5.55926 16.4827 7.6947 16.6431C9.83014 16.8036 11.9456 16.1371 13.6034 14.7816L18.5776 19.7558C18.7347 19.9076 18.9452 19.9916 19.1637 19.9897C19.3822 19.9878 19.5912 19.9001 19.7457 19.7456C19.9003 19.5911 19.9879 19.3821 19.9898 19.1636C19.9917 18.9451 19.9077 18.7346 19.7559 18.5774ZM8.3334 14.9999C7.01485 14.9999 5.72592 14.6089 4.62959 13.8764C3.53327 13.1439 2.67878 12.1027 2.1742 10.8845C1.66961 9.66632 1.53759 8.32588 1.79483 7.03267C2.05206 5.73947 2.687 4.55158 3.61935 3.61923C4.5517 2.68688 5.73959 2.05194 7.03279 1.79471C8.326 1.53747 9.66644 1.66949 10.8846 2.17408C12.1028 2.67866 13.144 3.53314 13.8765 4.62947C14.6091 5.7258 15.0001 7.01473 15.0001 8.33327C14.9981 10.1008 14.2951 11.7953 13.0452 13.0451C11.7954 14.2949 10.1009 14.998 8.3334 14.9999Z" />
                <path d="M10.8333 7.5H9.16667V5.83333C9.16667 5.61232 9.07887 5.40036 8.92259 5.24408C8.76631 5.0878 8.55435 5 8.33333 5C8.11232 5 7.90036 5.0878 7.74408 5.24408C7.5878 5.40036 7.5 5.61232 7.5 5.83333V7.5H5.83333C5.61232 7.5 5.40036 7.5878 5.24408 7.74408C5.0878 7.90036 5 8.11232 5 8.33333C5 8.55435 5.0878 8.76631 5.24408 8.92259C5.40036 9.07887 5.61232 9.16667 5.83333 9.16667H7.5V10.8333C7.5 11.0543 7.5878 11.2663 7.74408 11.4226C7.90036 11.5789 8.11232 11.6667 8.33333 11.6667C8.55435 11.6667 8.76631 11.5789 8.92259 11.4226C9.07887 11.2663 9.16667 11.0543 9.16667 10.8333V9.16667H10.8333C11.0543 9.16667 11.2663 9.07887 11.4226 8.92259C11.5789 8.76631 11.6667 8.55435 11.6667 8.33333C11.6667 8.11232 11.5789 7.90036 11.4226 7.74408C11.2663 7.5878 11.0543 7.5 10.8333 7.5Z" />
              </svg>
            </Button>
          </div>
          <Button
            color="pink"
            variant="solid"
            size="3"
            onClick={props.onSplit}
            disabled={props.busy || props.isOutOfSynced}
            className={"max-h-9 px-2 py-0 rounded-lg"}
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
            Build
          </Button>
        </div>
      </div>
      <Background variant={BackgroundVariant.Dots} className="rounded-3xl" />
    </ReactFlow>
  );
}
