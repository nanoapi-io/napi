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
  Position,
} from "@xyflow/react";
import Controls from "../../../components/ReactFlow/Controls";
import WaterMarkRemover from "../../../components/ReactFlow/WaterMarkRemover";
import Elk, { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk.bundled.js";
import ContainerReferencesNode from "../../../components/ReactFlow/AuditTree/ContainerReferencesNode";
import ContainerFileNode from "../../../components/ReactFlow/AuditTree/ContainerFileNode";
import InstanceNode from "../../../components/ReactFlow/AuditTree/InstanceNode";

export default function AuditFilePage() {
  const params = useParams<{ file: string }>();

  const context = useOutletContext<{
    busy: boolean;
    auditMap: AuditMap;
    // More here, but we do not need it
  }>();

  const nodeTypes = {
    ContainerReferencesNode,
    ContainerFileNode,
    InstanceNode,
  };

  const reactFlow = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const [direction, setDirection] = useState<"RIGHT" | "DOWN">("DOWN");

  const joinChar = "|";

  useEffect(() => {
    async function run() {
      const { nodes, edges } = await computeNodesAndEdgesFromFiles(direction);

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
    const currentInstanceHeight = 150;
    const referenceInstanceHeight = 120;

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
    const currentFileId = `current${joinChar}${auditFile.path}`;
    const currentFileElkNode = {
      id: currentFileId,
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
      const currentInstanceId = `${currentFileId}|${instance.id}`;
      const currentInstanceElkNode = {
        id: currentInstanceId,
        width: instanceWidth,
        height: currentInstanceHeight,
      };

      currentFileElkNode.children.push(currentInstanceElkNode);

      // Gather all dependencies in map to create nodes later
      // And create all the edges now
      Object.values(instance.dependenciesMap).forEach((dependency) => {
        const targetFileId = `dependency${joinChar}${dependency.fileId}`;

        let dependencyNode = dependenciesNodeMap.get(targetFileId);
        if (!dependencyNode) {
          dependencyNode = new Map<string, string>();
        }

        Object.values(dependency.instanceIds).forEach((instanceId) => {
          const targetInstanceId = `${targetFileId}${joinChar}${instanceId}`;
          dependencyNode.set(targetInstanceId, targetInstanceId);

          // Add edge to graph to link dependency instance to the current instance
          graph.edges.push({
            id: `${targetInstanceId}${joinChar}${currentInstanceId}`,
            sources: [targetInstanceId],
            targets: [currentInstanceId],
          });
        });

        dependenciesNodeMap.set(targetFileId, dependencyNode);
      });

      // Gather all dependents in map to create nodes later
      // And create all the edges now
      Object.values(instance.dependentsMap).forEach((dependent) => {
        const targetFileId = `dependent${joinChar}${dependent.fileId}`;

        let dependentNode = dependentsNodeMap.get(targetFileId);
        if (!dependentNode) {
          dependentNode = new Map<string, string>();
        }

        Object.values(dependent.instanceIds).forEach((instanceId) => {
          const targetInstanceId = `${targetFileId}|${instanceId}`;
          dependentNode.set(targetInstanceId, targetInstanceId);

          // Add edge to graph to link dependent instance to the current instance
          graph.edges.push({
            id: `${currentInstanceId}${joinChar}${targetInstanceId}`,
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
          height: referenceInstanceHeight,
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
          height: referenceInstanceHeight,
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

  function getNodeTypeFromId(id: string) {
    const parts = id.split(joinChar);
    if (parts.length === 1) return "ContainerReferencesNode";

    if (parts.length === 2) return "ContainerFileNode";

    return "InstanceNode";
  }

  function getNodeDataFromId(id: string, auditFile: AuditFile) {
    const data: Record<string, unknown> = {
      id,
    };

    const parts = id.split(joinChar);

    if (parts.length === 1) {
      data["containerType"] = id as "dependencies" | "dependents";
      return data;
    }

    const fileName = parts[1];
    data["fileName"] = fileName;

    if (parts.length === 2) {
      return data;
    }

    const instanceName = parts[2];
    data["instanceName"] = instanceName;

    if (parts[0] === "current") {
      const instance = auditFile.instances[instanceName];
      data["instanceType"] = instance.type;
      data["analysis"] = instance.analysis;
      return data;
    }

    if (parts[0] === "dependency") {
      const dependency = auditFile.dependenciesMap[parts[1]];
      const isExternal = dependency.isExternal;
      data["isExternal"] = isExternal;

      if (!isExternal) {
        const targetFile = context.auditMap[fileName];
        const targetInstance = targetFile.instances[instanceName];
        data["instanceType"] = targetInstance.type;
      }
    }

    if (parts[0] === "dependent") {
      const targetFile = context.auditMap[fileName];
      const targetInstance = targetFile.instances[instanceName];
      data["instanceType"] = targetInstance.type;
    }

    return data;
  }

  async function computeNodesAndEdgesFromFiles(direction: "RIGHT" | "DOWN") {
    if (!params.file) return { nodes: [], edges: [] };

    const auditFile = context.auditMap[params.file];

    if (!auditFile) return { nodes: [], edges: [] };

    const elkGraph = await generateElkGraph(direction, auditFile);

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    function traverse(
      elkNode: ElkNode,
      parentId: string | undefined = undefined,
    ) {
      const { id, x = 0, y = 0, width, height, children } = elkNode;

      const data = getNodeDataFromId(id, auditFile);
      const type = getNodeTypeFromId(id);

      const node: Node = {
        id,
        position: { x, y },
        width,
        height,
        data,
        targetPosition: direction === "RIGHT" ? Position.Left : Position.Top,
        sourcePosition:
          direction === "RIGHT" ? Position.Right : Position.Bottom,
        type,
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
      nodeTypes={nodeTypes}
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
