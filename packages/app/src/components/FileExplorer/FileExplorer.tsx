import { useEffect, useState } from "react";
import { SimpleTreeData, Tree } from "react-arborist";
import FileNode from "../Arborist/FileNode";

export default function FileExplorer(props: {
  height: number;
  files: {
    path: string;
    isFocused: boolean;
    isSelected: boolean;
  }[];
}) {
  const [data, setData] = useState<SimpleTreeData[]>([]);

  useEffect(() => {
    const root: SimpleTreeData = { id: "", name: "", children: [] };

    props.files.forEach((file) => {
      const parts = file.path.split("/");

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
  }, [props.files]);

  return (
    <Tree
      data={data}
      openByDefault={true}
      disableEdit={true}
      disableDrag={true}
      disableDrop={true}
      width={300}
      height={props.height}
      rowHeight={30}
      className="overflow-x-hidden"
    >
      {FileNode}
    </Tree>
  );
}
