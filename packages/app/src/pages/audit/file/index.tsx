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
import ContainerNode from "../../../components/ReactFlow/Audit/AuditFile/ContainerNode";
import FileNode from "../../../components/ReactFlow/Audit/AuditFile/FileNode";
import CurrentInstanceNode from "../../../components/ReactFlow/Audit/AuditFile/CurrentInstanceNode";
import InternalReferenceInstanceNode from "../../../components/ReactFlow/Audit/AuditFile/InternalReferenceInstanceNode";
import ExternalReferenceInstanceNode from "../../../components/ReactFlow/Audit/AuditFile/ExternalReferenceInstanceNode";

export default function AuditFilePage() {
  const params = useParams<{ file: string }>();

  const context = useOutletContext<{
    busy: boolean;
    auditMap: AuditMap;
    // More here, but we do not need it
  }>();

  const nodeTypes = {
    ContainerNode,
    FileNode,
    CurrentInstanceNode,
    InternalReferenceInstanceNode,
    ExternalReferenceInstanceNode,
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
        "org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers": "25",
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

        const dependentInstancesIds = Object.values(dependent.instanceIds);

        if (dependentInstancesIds.length === 0) {
          // Add edge to graph to link dependent file to the current instance
          graph.edges.push({
            id: `${currentInstanceId}${joinChar}${targetFileId}`,
            sources: [currentInstanceId],
            targets: [targetFileId],
          });
        } else {
          dependentInstancesIds.forEach((instanceId) => {
            const targetInstanceId = `${targetFileId}|${instanceId}`;
            dependentNode.set(targetInstanceId, targetInstanceId);

            // Add edge to graph to link dependent instance to the current instance
            graph.edges.push({
              id: `${currentInstanceId}${joinChar}${targetInstanceId}`,
              sources: [currentInstanceId],
              targets: [targetInstanceId],
            });
          });
        }

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
        width: instanceWidth,
        height: referenceInstanceHeight,
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

  function getReactNodeFromElkNode(
    elkNode: ElkNode,
    parentId: string | undefined,
    direction: "RIGHT" | "DOWN",
    currentAuditFile: AuditFile,
  ): Node {
    const { id, x = 0, y = 0, width, height } = elkNode;

    const node: Node = {
      id,
      position: { x, y },
      width,
      height,
      data: {
        id,
      } as Record<string, unknown>,
      targetPosition: direction === "RIGHT" ? Position.Left : Position.Top,
      sourcePosition: direction === "RIGHT" ? Position.Right : Position.Bottom,
      type: "ContainerNode" as keyof typeof nodeTypes,
      parentId,
    };

    const parts = id.split(joinChar);
    if (parts.length === 1) {
      node.type = "ContainerNode";
      node.draggable = false;
    }

    if (parts.length === 2) {
      node.type = "FileNode";
      const fileName = parts[1];
      node.data.fileName = fileName;
    }

    if (parts.length === 3) {
      const prefix = parts[0];
      const fileName = parts[1];
      const instanceName = parts[2];

      node.extent = "parent";
      node.draggable = false;

      node.data.fileName = fileName;
      node.data.instanceName = instanceName;

      if (prefix === "dependency") {
        const dependency = currentAuditFile.dependenciesMap[fileName];
        const isExternal = dependency.isExternal;
        if (isExternal) {
          node.type = "ExternalReferenceInstanceNode";
          node.data.referenceName = dependency.path;
        } else {
          node.type = "InternalReferenceInstanceNode";
          const auditFile = context.auditMap[fileName];
          const instance = auditFile.instances[instanceName];
          node.data.instanceType = instance.type;
        }
      }

      if (prefix === "dependent") {
        node.type = "InternalReferenceInstanceNode";
        const auditFile = context.auditMap[fileName];
        const instance = auditFile.instances[instanceName];
        node.data.instanceType = instance.type;
      }

      if (prefix === "current") {
        node.type = "CurrentInstanceNode";
        const instance = currentAuditFile.instances[instanceName];
        node.data.instanceType = instance.type;
        node.data.auditResult = instance.auditResults;
      }
    }

    return node;
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
      const node = getReactNodeFromElkNode(
        elkNode,
        parentId,
        direction,
        auditFile,
      );

      nodes.push(node);

      elkNode.children?.forEach((child) => {
        traverse(child, elkNode.id);
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

    console.log(1111, nodes);
    console.log(2222, edges);

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

  if (context.busy) {
    return <ReactFlowSkeleton />;
  }

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
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
