import { Button, ScrollArea, TextField, Tooltip } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { FileExplorerSkeleton } from "./Skeleton";
import {
  LuChevronRight,
  LuChevronDown,
  LuCornerDownRight,
  LuEye,
  LuPackageSearch,
} from "react-icons/lu";
import languageIcon from "./languageIcons";

interface TreeData {
  id: string;
  level: number;
  name: string;
  matchesSearch: boolean;
  children?: TreeData[]; // Only for non leaf nodes
  isSymbol?: boolean; // Only for leaf nodes
}

export interface FileExplorerFile {
  path: string;
  symbols: string[];
}

export default function FileExplorer(props: {
  busy: boolean;
  files: FileExplorerFile[];
  context: {
    highlightedNodeId: string | null;
    actions: {
      setHighlightedNodeId: (node: string | null) => void;
    };
  };
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [treeData, setTreeData] = useState<TreeData[]>([]);

  function nodeMatchesSearch(name: string, symbols: string[]): boolean {
    return (
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      symbols.some((symbol) =>
        symbol.toLowerCase().includes(search.toLowerCase()),
      )
    );
  }

  function addFileToTree(
    currentLevel: TreeData[],
    segments: string[],
    cumulativePath: string,
    symbols: string[],
  ): boolean {
    const [segment, ...remainingSegments] = segments;
    const nodeId = cumulativePath ? `${cumulativePath}/${segment}` : segment;
    let existingNode = currentLevel.find((node) => node.name === segment);

    if (!existingNode) {
      existingNode = {
        id: nodeId,
        level: 0,
        name: segment,
        matchesSearch: false,
        children: [],
      };
      currentLevel.push(existingNode);
    }

    const matchesCurrentNode = nodeMatchesSearch(segment, symbols);

    if (remainingSegments.length > 0) {
      const childMatches = addFileToTree(
        existingNode.children as TreeData[],
        remainingSegments,
        nodeId,
        symbols,
      );
      existingNode.matchesSearch = existingNode.matchesSearch || childMatches;
    } else {
      existingNode.matchesSearch =
        existingNode.matchesSearch || matchesCurrentNode;

      // ADD SYMBOLS AS CHILDREN HERE
      if (symbols.length > 0) {
        existingNode.children = symbols.map((symbol) => ({
          id: `${nodeId}#${symbol}`,
          level: existingNode.level + 1,
          name: symbol,
          matchesSearch:
            !search || symbol.toLowerCase().includes(search.toLowerCase()),
          isSymbol: true,
        }));

        // Update matchesSearch if symbol matches
        existingNode.matchesSearch =
          existingNode.matchesSearch ||
          existingNode.children.some((child) => child.matchesSearch);
      }
    }

    return existingNode.matchesSearch;
  }

  function buildTreeData(files: FileExplorerFile[]): TreeData[] {
    let rootNodes: TreeData[] = [];

    files.forEach((file) => {
      // Filter out elements that don't match the search
      // on either the filename or the symbols
      if (!nodeMatchesSearch(file.path, file.symbols)) {
        return;
      }

      const segments = file.path.split("/");

      // Add the file to the tree structure
      addFileToTree(rootNodes, segments, "", file.symbols);
    });

    rootNodes = rootNodes.map(flattenNode);
    rootNodes = setLevels(rootNodes);

    return rootNodes;
  }

  // Recursive helper that flattens a single node
  function flattenNode(node: TreeData): TreeData {
    // Recursively flatten all children
    if (node.children) {
      node.children = node.children.map(flattenNode);
    }

    // As long as the node has exactly one child, merge them
    while (
      node.children &&
      node.children.length === 1 &&
      !node.children[0].isSymbol
    ) {
      const [child] = node.children;

      // Merge child's name into parent
      node.name = `${node.name}/${child.name}`;
      // Update the parent's id to child's id (which is already the full path)
      node.id = child.id;
      // Optionally inherit the child's level if needed
      node.level = child.level;
      // Replace parent's children with child's children
      node.children = child.children;

      // Continue merging in case the new "flattened" node also has exactly one child
    }

    return node;
  }

  function setLevels(nodes: TreeData[], currentLevel = 0): TreeData[] {
    return nodes.map((node) => {
      // Assign the current level
      node.level = currentLevel;

      // Recursively set levels for children
      if (node.children && node.children.length > 0) {
        node.children = setLevels(node.children, currentLevel + 1);
      }

      return node;
    });
  }

  useEffect(() => {
    setTreeData(buildTreeData(props.files));
  }, [props.files, search]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between">
        {isOpen && (
          <a
            className="flex items-center space-x-1 pl-3 text-gray-light dark:text-gray-dark no-underline	"
            href="https://nanoapi.io"
            target="_blank"
          >
            <img src="/logo.png" alt="logo" className="w-8 h-8" />
            <span className="text-xl font-bold">NanoAPI</span>
          </a>
        )}
        <Button
          className="text-text-light dark:text-text-dark p-0 mx-2 my-1"
          size="1"
          onClick={() => setIsOpen(!isOpen)}
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
            {isOpen ? (
              <path d="M15 6L9 12L15 18" />
            ) : (
              <path d="M9 6L15 12L9 18" />
            )}
          </svg>
        </Button>
      </div>

      <div
        style={{ width: isOpen ? "300px" : "0px" }}
        className="grow flex flex-col gap-4 overflow-hidden transition-all duration-300 my-2"
      >
        {props.busy ? (
          <FileExplorerSkeleton />
        ) : (
          <>
            <TextField.Root
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`transition-all duration-300 overflow-hidden ${!isOpen && "w-0"}`}
            >
              <TextField.Slot>
                <svg
                  width="20px"
                  height="20px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15.7955 15.8111L21 21M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" />
                </svg>
              </TextField.Slot>
            </TextField.Root>
            <ScrollArea scrollbars="vertical">
              <ListElement
                nodes={treeData}
                search={search}
                hlNodeId={props.context.highlightedNodeId}
                setHLNodeId={props.context.actions.setHighlightedNodeId}
              />
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}

function ListElement(props: {
  nodes: TreeData[];
  search: string;
  hlNodeId: string | null;
  setHLNodeId: (node: string | null) => void;
}) {
  return (
    <ul>
      {props.nodes.map((node) => {
        return (
          <NodeElement
            key={node.id}
            node={node}
            search={props.search}
            hlNodeId={props.hlNodeId}
            setHLNodeId={props.setHLNodeId}
          />
        );
      })}
    </ul>
  );
}

function NodeElement(props: {
  node: TreeData;
  search: string;
  hlNodeId: string | null;
  setHLNodeId: (node: string | null) => void;
}) {
  const params = useParams<{ file?: string }>();

  const [isOpen, setIsOpen] = useState(false);

  const shouldAutoExpand = props.search.length > 0 && props.node.matchesSearch;
  const isHighlighted = props.hlNodeId === props.node.id;

  const toggleHighlight = (id: string) => {
    if (isHighlighted) {
      props.setHLNodeId(null);
    } else {
      props.setHLNodeId(id);
    }
  };

  useEffect(() => {
    setIsOpen(shouldAutoExpand);
  }, [shouldAutoExpand]);

  const handleToggle = () => {
    setIsOpen((value) => !value);
  };

  return (
    <li
      className="pr-1 w-full"
      style={{ paddingLeft: `${props.node.level * 10}px` }}
    >
      <div className="flex items-center space-x-2">
        {props.node.children &&
        props.node.children.length > 0 &&
        !props.node.children[0].isSymbol ? (
          <Button
            variant="ghost"
            className="w-full py-1 my-0.5 text-text-light dark:text-text-dark cursor-pointer"
            onClick={handleToggle}
          >
            <div className="w-full flex items-center space-x-2">
              {isOpen ? (
                <LuChevronDown className="text-lg text-gray-light dark:text-gray-dark" />
              ) : (
                <LuChevronRight className="text-lg text-gray-light dark:text-gray-dark" />
              )}
              <DisplayedPath node={props.node} />
            </div>
          </Button>
        ) : (
          <>
            {!props.node.isSymbol ? (
              <div className="flex justify-between w-full items-center">
                <div className="grow">
                  <Button
                    variant="ghost"
                    className="w-full text-text-light dark:text-text-dark cursor-pointer justify-start pr-0"
                    onClick={handleToggle}
                  >
                    <div className="flex space-x-2 items-center overflow-hidden">
                      {languageIcon(props.node.name.split(".").pop() || "txt")}
                      <DisplayedPath node={props.node} />
                    </div>
                  </Button>
                </div>
                <div className="flex space-x-2 items-center">
                  <Button
                    variant="ghost"
                    className={`text-xl py-1.5 text-text-light dark:text-text-dark my-auto ${
                      isHighlighted
                        ? "bg-focus-light dark:bg-focus-dark bg-opacity-20"
                        : ""
                    }`}
                    onClick={() => toggleHighlight(props.node.id)}
                  >
                    <LuEye className="text-gray-light dark:text-gray-dark" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xl py-1.5 text-text-light dark:text-text-dark my-auto"
                  >
                    <Link
                      to={
                        params.file === props.node.id
                          ? "/audit"
                          : encodeURIComponent(props.node.id)
                      }
                      className="w-full"
                    >
                      <LuPackageSearch className="text-gray-light dark:text-gray-dark" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className={`w-full text-text-light dark:text-text-dark ${params.file === props.node.id && "bg-surface-light dark:bg-surface-dark"}`}
                variant="ghost"
              >
                <div className="w-full flex items-center space-x-2">
                  <LuCornerDownRight className="text-gray-light dark:text-gray-dark" />
                  <DisplayedPath node={props.node} />
                </div>
              </Button>
            )}
          </>
        )}
      </div>
      {isOpen && props.node.children && (
        <ListElement
          nodes={props.node.children || []}
          search={props.search}
          hlNodeId={props.hlNodeId}
          setHLNodeId={props.setHLNodeId}
        />
      )}
    </li>
  );
}

function DisplayedPath({ node }: { node: TreeData }) {
  const maxPathLength = 35 - 2 * node.level;

  if (node.name.length > maxPathLength) {
    return (
      <Tooltip content={node.name}>
        <div className="overflow-ellipsis">{`...${node.name.slice(-maxPathLength)}`}</div>
      </Tooltip>
    );
  }

  return <div>{node.name}</div>;
}
