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
import { AuditFile, AuditMap } from "../../service/api/types";
import { useEffect, useState } from "react";
import AuditFileNode from "../../components/ReactFlow/Audit/AuditProject/AuditFileNode";
import { layoutNodesAndEdges } from "../../service/dagree";
import Controls from "../../components/ReactFlow/Controls";
import { useOutletContext } from "react-router";
import { ReactFlowSkeleton } from "../../components/ReactFlow/Skeleton";
import WaterMarkRemover from "../../components/ReactFlow/WaterMarkRemover";

export default function AuditPage() {
  const context = useOutletContext<{
    busy: boolean;
    auditMap: AuditMap;
    focusedPath: string | undefined;
    onNodeFocus: (path: string) => void;
    onNodeUnfocus: () => void;
  }>();

  const nodeTypes = {
    auditFileNode: AuditFileNode,
  };

  const reactFlow = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<
    Node<
      AuditFile & {
        isFocused: boolean;
      } & Record<string, unknown>
    >
  >([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const [direction, setDirection] = useState<"TB" | "LR">("TB");

  useEffect(() => {
    computeNodesAndEdgesFromFiles(context.auditMap);
  }, [context.auditMap]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === context.focusedPath
          ? { ...n, data: { ...n.data, isFocused: true } }
          : { ...n, data: { ...n.data, isFocused: false } },
      ),
    );
  }, [context.focusedPath]);

  function computeNodesAndEdgesFromFiles(auditMap: AuditMap) {
    const newNodes: Node<
      AuditFile & {
        isFocused: boolean;
      } & Record<string, unknown>
    >[] = [];
    const newEdges: Edge[] = [];

    Object.values(auditMap).forEach((file) => {
      const node: Node<
        AuditFile & {
          isFocused: boolean;
        } & Record<string, unknown>
      > = {
        id: file.path,
        position: { x: 0, y: 0 },
        data: {
          ...file,
          isFocused: false,
        },
        type: "auditFileNode",
      };
      newNodes.push(node);

      Object.values(file.dependenciesMap).forEach((dependency) => {
        if (dependency.isExternal) {
          return;
        }
        const id = `${file.path}-${dependency.fileId}`;
        if (newEdges.find((edge) => edge.id === id)) {
          return;
        }
        newEdges.push({
          id: `${file.path}-${dependency.fileId}`,
          source: file.path,
          target: dependency.fileId,
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
      nodes: Node<
        AuditFile & {
          isFocused: boolean;
        } & Record<string, unknown>
      >[];
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
      nodes: Node<
        AuditFile & {
          isFocused: boolean;
        } & Record<string, unknown>
      >[];
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

  function onNodeMouseEnter(_event: React.MouseEvent, node: Node) {
    context.onNodeFocus(node.id);
  }

  function onNodeMouseLeave() {
    context.onNodeUnfocus();
  }

  if (context.busy) {
    return <ReactFlowSkeleton />;
  }

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      fitView
    >
      <WaterMarkRemover busy={context.busy} />
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
