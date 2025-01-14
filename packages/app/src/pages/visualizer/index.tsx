import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Background,
  BackgroundVariant,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import { VisualizerFile } from "../../service/api/types";
import { useEffect, useState } from "react";
import FileNode from "../../components/ReactFlow/VisualizerTree/FileNode";
import { layoutNodesAndEdges } from "../../service/dagree";
import Controls from "../../components/ReactFlow/Controls";
import { useOutletContext } from "react-router";

export default function Visualizer() {
  const context = useOutletContext<{
    busy: boolean;
    files: VisualizerFile[];
    focusedPath: string | undefined;
    onNodeFocus: (path: string) => void;
    onNodeUnfocus: () => void;
  }>();

  const nodeTypes = {
    fileNode: FileNode,
  };

  const reactFlow = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<
    Node<{ path: string; isBeingDragged: boolean; isFocused: boolean }>
  >([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const [direction, setDirection] = useState<"TB" | "LR">("TB");

  useEffect(() => {
    const element = document.querySelector(".react-flow__panel") as HTMLElement;
    if (element) {
      element.style.display = "none";
    }
  }, []);

  useEffect(() => {
    computeNodesAndEdgesFromFiles(context.files);
  }, [context.files]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === context.focusedPath
          ? { ...n, data: { ...n.data, isFocused: true } }
          : { ...n, data: { ...n.data, isFocused: false } },
      ),
    );
  }, [context.focusedPath]);

  function computeNodesAndEdgesFromFiles(files: VisualizerFile[]) {
    const newNodes: Node<{
      path: string;
      isBeingDragged: boolean;
      isFocused: boolean;
    }>[] = [];
    const newEdges: Edge[] = [];

    files.forEach((file) => {
      const node: Node<{
        path: string;
        isBeingDragged: boolean;
        isFocused: boolean;
      }> = {
        id: file.path,
        position: { x: 0, y: 0 },
        data: {
          path: file.path,
          isBeingDragged: false,
          isFocused: false,
        },
        type: "fileNode",
      };
      newNodes.push(node);

      file.importSources.forEach((importSource) => {
        const id = `${file.path}-${importSource}`;
        if (newEdges.find((edge) => edge.id === id)) {
          return;
        }
        newEdges.push({
          id: `${file.path}-${importSource}`,
          source: file.path,
          target: importSource,
          type: "straight",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 30,
            height: 30,
          },
          animated: false,
        });
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodesAndEdges(
      newNodes,
      newEdges,
      direction,
    ) as {
      nodes: Node<{
        path: string;
        isBeingDragged: boolean;
        isFocused: boolean;
      }>[];
      edges: Edge[];
    };

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }

  function handleReposition(direction: "TB" | "LR") {
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodesAndEdges(
      nodes,
      edges,
      direction,
    ) as {
      nodes: Node<{
        path: string;
        isBeingDragged: boolean;
        isFocused: boolean;
      }>[];
      edges: Edge[];
    };
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }

  function handleChangeDirection() {
    const newDirection = direction === "TB" ? "LR" : "TB";
    setDirection(newDirection);
    handleReposition(newDirection);
  }

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

  function onNodeMouseEnter(_event: React.MouseEvent, node: Node) {
    context.onNodeFocus(node.id);
  }

  function onNodeMouseLeave() {
    context.onNodeUnfocus();
  }

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      fitView
    >
      <Controls
        busy={context.busy}
        reactFlow={reactFlow}
        onHandleReposition={() => handleReposition(direction)}
        onHandleChangeDirection={handleChangeDirection}
      />
      <Background variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}
