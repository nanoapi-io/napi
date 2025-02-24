import { useOutletContext, useParams } from "react-router";
import { AuditFile, AuditMap } from "../../../service/api/types";
import { ReactFlowSkeleton } from "../../../components/ReactFlow/Skeleton";
import { useEffect, useState } from "react";
import {
  Node,
  Edge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import Controls from "../../../components/ReactFlow/Controls";
import WaterMarkRemover from "../../../components/ReactFlow/WaterMarkRemover";
import Elk, { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk.bundled.js";

export default function AuditFilePage() {
  const params = useParams<{ file: string }>();

  const context = useOutletContext<{
    busy: boolean;
    auditMap: AuditMap;
    // More here, but we do not need it
  }>();

  const reactFlow = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const [direction, setDirection] = useState<"RIGHT" | "DOWN">("DOWN");

  useEffect(() => {
    async function run() {
      if (!params.file) {
        setNodes([]);
        setEdges([]);
        return;
      }

      const currentFile = context.auditMap[params.file];

      if (!currentFile) {
        setNodes([]);
        setEdges([]);
        return;
      }

      const { nodes, edges } = await computeNodesAndEdgesFromFiles(
        currentFile,
        direction,
      );

      setNodes(nodes);
      setEdges(edges);
    }

    run();
  }, [context.auditMap, params.file]);

  async function generateElkGraph(
    direction: "RIGHT" | "DOWN",
    auditFile: AuditFile,
  ) {
    const graphDirection = direction;
    const containerDirection = direction === "RIGHT" ? "DOWN" : "RIGHT";

    const instanceWidth = 300;
    const instanceHeight = 100;

    // build ELk graph
    const graph = {
      id: "root",
      layoutOptions: {
        "org.eclipse.elk.algorithm": "layered",
        "org.eclipse.elk.direction": graphDirection,
        "org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers": "50",
        "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
        "org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      },
      children: [] as ElkNode[],
      edges: [] as ElkExtendedEdge[],
    };

    // Dependency container node
    const dependenciesElkNode = {
      id: "dependencies",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": containerDirection,
      },
      children: [] as ElkNode[],
    };

    // Current file node
    const currentFileElkNode = {
      id: "currentFile",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": containerDirection,
      },
      children: [] as ElkNode[],
      edges: [] as ElkExtendedEdge[],
    };

    // Dependent container node
    const dependentsElkNode = {
      id: "dependents",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": containerDirection,
      },
      children: [] as ElkNode[],
    };

    // map to keep track of the nodes created and avoid duplicates
    const dependenciesNodeMap = new Map<string, Map<string, string>>();
    const dependentsNodeMap = new Map<string, Map<string, string>>();

    Object.values(auditFile.instances).forEach((instance) => {
      // Current instance node
      const currentInstanceId = `${auditFile.path}-${instance.id}`;
      const currentInstanceElkNode = {
        id: currentInstanceId,
        width: instanceWidth,
        height: instanceHeight,
      };

      currentFileElkNode.children.push(currentInstanceElkNode);

      // Gather all dependencies in map to create nodes later
      // And create all the edges now
      Object.values(instance.dependenciesMap).forEach((dependency) => {
        const targetFileId = `dependency-${dependency.fileId}`;

        let dependencyNode = dependenciesNodeMap.get(targetFileId);
        if (!dependencyNode) {
          dependencyNode = new Map<string, string>();
        }

        Object.values(dependency.instanceIds).forEach((instanceId) => {
          const targetInstanceId = `${targetFileId}-${instanceId}`;
          dependencyNode.set(targetInstanceId, targetInstanceId);

          // Add edge to graph to link dependency instance to the current instance
          graph.edges.push({
            id: `dependency-${targetInstanceId}-${currentInstanceId}`,
            sources: [targetInstanceId],
            targets: [currentInstanceId],
          });
        });

        dependenciesNodeMap.set(targetFileId, dependencyNode);
      });

      // Gather all dependents in map to create nodes later
      // And create all the edges now
      Object.values(instance.dependentsMap).forEach((dependent) => {
        const targetFileId = `dependent-${dependent.fileId}`;

        let dependentNode = dependentsNodeMap.get(targetFileId);
        if (!dependentNode) {
          dependentNode = new Map<string, string>();
        }

        Object.values(dependent.instanceIds).forEach((instanceId) => {
          const targetInstanceId = `${targetFileId}-${instanceId}`;
          dependentNode.set(targetInstanceId, targetInstanceId);

          // Add edge to graph to link dependent instance to the current instance
          graph.edges.push({
            id: `dependent-${currentInstanceId}-${targetInstanceId}`,
            sources: [currentInstanceId],
            targets: [targetInstanceId],
          });
        });

        dependentsNodeMap.set(targetFileId, dependentNode);
      });
    });

    // Create nodes for dependencies
    dependenciesNodeMap.forEach((instances, fileId) => {
      const dependencyElkNode = {
        id: fileId,
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": containerDirection,
        },
        children: [] as ElkNode[],
      };

      instances.forEach((instanceId) => {
        const instanceElkNode = {
          id: instanceId,
          width: instanceWidth,
          height: instanceHeight,
        };

        dependencyElkNode.children.push(instanceElkNode);
      });

      dependenciesElkNode.children.push(dependencyElkNode);
    });

    // Create nodes for dependents
    dependentsNodeMap.forEach((instances, fileId) => {
      const dependentElkNode = {
        id: fileId,
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": containerDirection,
        },
        children: [] as ElkNode[],
      };

      instances.forEach((instanceId) => {
        const instanceElkNode = {
          id: instanceId,
          width: instanceWidth,
          height: instanceHeight,
        };

        dependentElkNode.children.push(instanceElkNode);
      });

      dependentsElkNode.children.push(dependentElkNode);
    });

    // First, add the dependencies container
    if (dependenciesElkNode.children.length > 0)
      graph.children.push(dependenciesElkNode);

    // Second, add the current file
    graph.children.push(currentFileElkNode);

    // Third, add the dependents container
    if (dependentsElkNode.children.length > 0)
      graph.children.push(dependentsElkNode);

    const elk = new Elk();

    const layoutedGraph = await elk.layout(graph);

    return layoutedGraph;
  }

  async function computeNodesAndEdgesFromFiles(
    auditFile: AuditFile,
    direction: "RIGHT" | "DOWN",
  ) {
    const elkGraph = await generateElkGraph(direction, auditFile);

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    function traverse(
      elkNode: ElkNode,
      parentId: string | undefined = undefined,
    ) {
      const { id, x, y, width, height, children } = elkNode;

      const node: Node = {
        id,
        position: { x: x || 0, y: y || 0 },
        width,
        height,
        data: {
          label: id,
        },
        parentId,
        extent: "parent",
      };

      nodes.push(node);

      children?.forEach((child) => {
        traverse(child, id);
      });
    }

    elkGraph.children?.forEach((child) => {
      traverse(child);
    });

    elkGraph.edges?.forEach((e) => {
      const edge: Edge = {
        id: e.id,
        source: e.sources[0],
        target: e.targets[0],
        type: "straight",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 30,
          height: 30,
        },
        animated: false,
      };

      edges.push(edge);
    });

    return { nodes, edges };
  }

  async function handleReposition(direction: "RIGHT" | "DOWN") {
    if (!params.file) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const auditFile = context.auditMap[params.file];

    if (!auditFile) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { nodes, edges } = (await computeNodesAndEdgesFromFiles(
      auditFile,
      direction,
    )) as {
      nodes: Node[];
      edges: Edge[];
    };
    setNodes(nodes);
    setEdges(edges);
  }

  function handleChangeDirection() {
    const newDirection = direction === "RIGHT" ? "DOWN" : "RIGHT";
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

  if (context.busy) {
    return <ReactFlowSkeleton />;
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
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
