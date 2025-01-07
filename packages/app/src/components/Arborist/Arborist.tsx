import { Tree, SimpleTreeData } from "react-arborist";
import { useEffect, useRef, useState } from "react";
import { Button } from "@radix-ui/themes";
import { Node } from "@xyflow/react";
import FileNode from "./FileNode";

export default function Arborist(props: {
  nodes: Node<{
    path: string;
    isBeingDragged: boolean;
    isFocused: boolean;
  }>[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const [data, setData] = useState<SimpleTreeData[]>([]);

  useEffect(() => {
    if (containerRef.current) {
      const computedHeight = window.getComputedStyle(
        containerRef.current,
      ).height;

      setHeight(parseInt(computedHeight, 10));
    }
  }, []);

  useEffect(() => {
    const root: SimpleTreeData = { id: "", name: "", children: [] };

    props.nodes.forEach((node) => {
      const parts = node.data.path.split("/");

      let currentLevel = root;

      parts.forEach((part, index) => {
        if (!currentLevel.children) {
          currentLevel.children = [];
        }

        let existingNode = currentLevel.children.find(
          (child) => child.name === part,
        );

        if (!existingNode) {
          existingNode = {
            id: parts.slice(0, index + 1).join("/"),
            name: part,
          };
          currentLevel.children.push(existingNode);
        }

        currentLevel = existingNode;
      });
    });

    function mergeSingleChildFolders(node: SimpleTreeData): SimpleTreeData {
      while (
        node.children &&
        node.children.length === 1 &&
        node.children[0].children &&
        node.children[0].children.length > 0
      ) {
        node = {
          ...node.children[0],
          name: `${node.name}/${node.children[0].name}`,
        };
      }

      if (node.children) {
        node.children = node.children.map(mergeSingleChildFolders);
      }

      return node;
    }

    const data = root.children
      ? root.children.map(mergeSingleChildFolders)
      : [];

    setData(data);
  }, [props.nodes]);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="relative h-full ">
      <div
        className={`bg-secondaryBackground-light dark:bg-secondaryBackground-dark shadow-lg absolute top-0 left-0 z-10 h-full pl-2 py-2  transition-transform duration-300 ${isCollapsed ? "-translate-x-full" : "translate-x-0"}`}
        ref={containerRef}
      >
        <Button
          className="absolute text-text-light dark:text-text-dark top-5 right-0 p-0 translate-x-full z-20"
          onClick={toggleSidebar}
          variant="ghost"
          radius="full"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isCollapsed ? (
              <path d="M9 6L15 12L9 18" />
            ) : (
              <path d="M15 6L9 12L15 18" />
            )}
          </svg>
        </Button>
        <Tree
          data={data}
          openByDefault={true}
          disableEdit={true}
          disableDrag={true}
          disableDrop={true}
          width={300}
          height={height}
          rowHeight={30}
        >
          {FileNode}
        </Tree>
      </div>
    </div>
  );
}
