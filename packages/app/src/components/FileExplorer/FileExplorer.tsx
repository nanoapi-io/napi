import {
  Button,
  Checkbox,
  IconButton,
  ScrollArea,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import { ExtractionNode } from "@nanoapi.io/shared";
import { FileExplorerSkeleton } from "./Skeleton.js";
import { LuSearchCode, LuX } from "react-icons/lu";
import languageIcon from "./languageIcons.js";
import {
  MdSearch,
  MdOutlineRemoveRedEye,
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
  MdOutlineKeyboardArrowDown,
  MdSubdirectoryArrowRight,
  MdDragHandle,
  MdVerticalAlignTop,
  MdVerticalAlignBottom,
} from "react-icons/md";
import { runExtraction } from "../../service/api/index.js";
import { toast } from "react-toastify";
import { extname, sep } from "path-browserify";

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
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  search: string;
  setIsSearch: (search: string) => void;
  highlightedNodeId: string | null;
  setHighlightedNodeId: (node: string | null) => void;
  extractionState: {
    extractionNodes: Record<string, ExtractionNode>;
    updateExtractionNodes: (
      filePath: string,
      symbols: string[],
      action: "add" | "remove",
    ) => void;
  };
}) {
  const [treeData, setTreeData] = useState<TreeData[]>([]);
  const [extractionPanelSize, setExtractionPanelSize] = useState(0);
  const extractionPanelRef = useRef<ImperativePanelHandle>(null);

  function nodeMatchesSearch(name: string, symbols: string[]): boolean {
    return (
      !props.search ||
      name.toLowerCase().includes(props.search.toLowerCase()) ||
      symbols.some((symbol) =>
        symbol.toLowerCase().includes(props.search.toLowerCase()),
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
            !props.search ||
            symbol.toLowerCase().includes(props.search.toLowerCase()),
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

      const segments = file.path.split(sep);

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

  function handleResize(size: number) {
    setExtractionPanelSize(size);
  }

  function handleExpandAndCollapse() {
    if (extractionPanelRef.current) {
      if (extractionPanelSize > 0) {
        extractionPanelRef.current.resize(0);
        setExtractionPanelSize(0);
      } else {
        extractionPanelRef.current.resize(50);
        setExtractionPanelSize(50);
      }
    }
  }

  useEffect(() => {
    // Use setTimeout to ensure the panel is resized after the DOM has updated
    // IF WE DON'T DO THIS, the panel will not resize correctly when forcing
    // the sidebar to open if it was closed.
    // This is a side effect of the way we do the sidebar and state management
    setTimeout(() => {
      if (extractionPanelRef.current) {
        extractionPanelRef.current.resize(50);
      }
    }, 50);
  }, [props.extractionState.extractionNodes]);

  useEffect(() => {
    setTreeData(buildTreeData(props.files));
  }, [props.files, props.search]);

  return (
    <PanelGroup direction="vertical" className="h-full">
      <Panel id="explorer" order={1} minSize={20}>
        <div className="h-full flex flex-col">
          <div className="flex justify-between">
            {props.isOpen && (
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
              onClick={() => props.setIsOpen(!props.isOpen)}
              variant="ghost"
              color="violet"
              radius="full"
            >
              {props.isOpen ? (
                <MdOutlineKeyboardArrowLeft className="h-8 w-8" />
              ) : (
                <MdOutlineKeyboardArrowRight className="h-8 w-8" />
              )}
            </Button>
          </div>

          <div
            style={{ width: props.isOpen ? "325px" : "0px" }}
            className="grow flex flex-col gap-4 overflow-hidden transition-all duration-300 my-2"
          >
            {props.busy ? (
              <FileExplorerSkeleton />
            ) : (
              <>
                <TextField.Root
                  color="violet"
                  placeholder="Search"
                  value={props.search}
                  onChange={(e) => props.setIsSearch(e.target.value)}
                  className={`min-h-8 transition-all duration-300 overflow-hidden ${!props.isOpen && "w-0"}`}
                >
                  <TextField.Slot>
                    <MdSearch className="h-6 w-6 my-auto" />
                  </TextField.Slot>
                  {props.search.length > 0 && (
                    <TextField.Slot>
                      <IconButton
                        variant="ghost"
                        size="1"
                        className="text-text-light dark:text-text-dark"
                        onClick={() => props.setIsSearch("")}
                      >
                        <LuX />
                      </IconButton>
                    </TextField.Slot>
                  )}
                </TextField.Root>
                <ScrollArea scrollbars="both">
                  <ListElement
                    nodes={treeData}
                    search={props.search}
                    hlNodeId={props.highlightedNodeId}
                    setHLNodeId={props.setHighlightedNodeId}
                  />
                </ScrollArea>
              </>
            )}
          </div>
        </div>
      </Panel>
      {props.isOpen && (
        <>
          <div className="flex w-full items-center space-x-2 cursor-pointer">
            {extractionPanelSize > 0 ? (
              <MdVerticalAlignBottom
                onClick={() => handleExpandAndCollapse()}
                className="text-xl text-gray-light dark:text-gray-dark"
              />
            ) : (
              <MdVerticalAlignTop
                onClick={() => handleExpandAndCollapse()}
                className="text-xl text-gray-light dark:text-gray-dark"
              />
            )}
            <PanelResizeHandle className="grow flex justify-between bg-surface-light dark:bg-surface-dark rounded-sm px-1">
              <span>Symbol Extraction</span>
              <MdDragHandle className="text-2xl text-gray-light dark:text-gray-dark" />
            </PanelResizeHandle>
          </div>
          <Panel
            id="extraction"
            collapsible
            order={2}
            minSize={0}
            defaultSize={0}
            onResize={handleResize}
            ref={extractionPanelRef}
          >
            <ExtractionPanel
              extractionNodes={props.extractionState.extractionNodes}
              updateExtractionNodes={
                props.extractionState.updateExtractionNodes
              }
            />
          </Panel>
        </>
      )}
    </PanelGroup>
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

  function toggleHighlight(id: string) {
    if (isHighlighted) {
      props.setHLNodeId(null);
    } else {
      props.setHLNodeId(id);
    }
  }

  useEffect(() => {
    setIsOpen(shouldAutoExpand);
  }, [shouldAutoExpand]);

  function handleToggle() {
    setIsOpen((value) => !value);
  }

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
            color="violet"
            variant="ghost"
            className="w-full py-1 my-0.5 text-text-light dark:text-text-dark"
            onClick={handleToggle}
          >
            <div className="w-full flex items-center space-x-2">
              {isOpen ? (
                <MdOutlineKeyboardArrowDown className="text-lg text-gray-light dark:text-gray-dark" />
              ) : (
                <MdOutlineKeyboardArrowRight className="text-lg text-gray-light dark:text-gray-dark" />
              )}
              <DisplayedPath node={props.node} search={props.search} />
            </div>
          </Button>
        ) : (
          <>
            {!props.node.isSymbol ? (
              <div className="flex justify-between w-full items-center">
                <div className="grow">
                  <Button
                    variant="ghost"
                    color="violet"
                    className="w-full text-text-light dark:text-text-dark cursor-pointer justify-start pr-0"
                    onClick={handleToggle}
                  >
                    <div className="flex space-x-2 items-center overflow-hidden">
                      {languageIcon(
                        extname(
                          props.node.name.split(".").pop() || "txt",
                        ).slice(1) || "txt",
                      )}
                      <DisplayedPath node={props.node} search={props.search} />
                    </div>
                  </Button>
                </div>
                <div className="flex space-x-2 items-center">
                  <Tooltip content="Highlight this node">
                    <Button
                      variant="ghost"
                      color="violet"
                      className={`text-xl py-1.5 text-text-light dark:text-text-dark my-auto ${
                        isHighlighted
                          ? "bg-focus-light dark:bg-focus-dark bg-opacity-20"
                          : ""
                      }`}
                      onClick={() => toggleHighlight(props.node.id)}
                    >
                      <MdOutlineRemoveRedEye className="text-gray-light dark:text-gray-dark" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="View details">
                    <Link to={`/audit/${encodeURIComponent(props.node.id)}`}>
                      <Button
                        variant="ghost"
                        color="violet"
                        className="text-xl py-1.5 text-text-light dark:text-text-dark my-auto"
                      >
                        <LuSearchCode className="text-gray-light dark:text-gray-dark" />
                      </Button>
                    </Link>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <Button
                className={`w-full text-text-light dark:text-text-dark ${params.file === props.node.id && "bg-background-light dark:bg-background-dark"}`}
                variant="ghost"
                color="violet"
              >
                <div className="w-full flex items-center space-x-2">
                  <MdSubdirectoryArrowRight className="text-gray-light dark:text-gray-dark" />
                  <DisplayedPath node={props.node} search={props.search} />
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

function DisplayedPath({
  node,
  search = "",
}: {
  node: TreeData;
  search: string;
}) {
  const maxPathLength = 35 - 2 * node.level;
  let foundInSearch = false;
  if (search.length > 2) {
    foundInSearch = node.name.toLowerCase().includes(search.toLowerCase());
  }

  if (node.name.length > maxPathLength) {
    return (
      <Tooltip content={node.name}>
        <div
          className={`overflow-ellipsis ${foundInSearch ? "bg-yellow-400/40 px-1 rounded-md" : ""}`}
        >{`...${node.name.slice(-maxPathLength)}`}</div>
      </Tooltip>
    );
  }

  return (
    <div
      className={`${foundInSearch ? "bg-yellow-400/40 px-1 rounded-md" : ""}`}
    >
      {node.name}
    </div>
  );
}

enum EditMode {
  NONE = "none", // Nothing has been edited
  EDITING = "editing", // The user is currently editing
  CANCELLED = "cancelled", // The user has cancelled the edit
  COMPLETED = "completed", // The user has completed the edit
}

function ExtractionPanel(props: {
  extractionNodes: Record<string, ExtractionNode>;
  updateExtractionNodes: (
    filePath: string,
    symbols: string[],
    action: "add" | "remove",
  ) => void;
}) {
  const [editMode, setEditMode] = useState<EditMode>(EditMode.NONE);
  const [extractionLoading, setExtractionLoading] = useState(false);

  async function runExtractionViaAPI() {
    setExtractionLoading(true);

    const extractionNodes = Object.values(props.extractionNodes);
    const response = await runExtraction(extractionNodes);

    if (response && response.success) {
      toast.success(
        "Extraction completed successfully. You'll find the extracted files in the output directory.",
      );
    } else {
      toast.error("Extraction failed. Please check the logs for more details.");
    }

    setExtractionLoading(false);
  }

  return (
    <div className="flex flex-col h-full justify-between">
      <ScrollArea className="flex flex-col h-full mt-3">
        {Object.keys(props.extractionNodes).map((key) => {
          const node = props.extractionNodes[key];
          return (
            <ExtractionElement
              key={key}
              node={node}
              updateExtractionNodes={props.updateExtractionNodes}
              editMode={editMode}
            />
          );
        })}
      </ScrollArea>
      <div className="w-full flex justify-between items-center space-x-2">
        {editMode !== EditMode.EDITING && (
          <>
            <Tooltip content="Remove elements from the current extraction">
              <Button
                variant="ghost"
                color="violet"
                className="w-[48%]"
                onClick={() => {
                  setEditMode(EditMode.EDITING);
                }}
              >
                Edit
              </Button>
            </Tooltip>
            <Tooltip content="Extract the above symbols into a separate codebase">
              <Button
                color="violet"
                loading={extractionLoading}
                className="w-[48%]"
                onClick={runExtractionViaAPI}
              >
                Extract
              </Button>
            </Tooltip>
          </>
        )}
        {editMode === EditMode.EDITING && (
          <>
            <Button
              variant="ghost"
              color="violet"
              className="w-[48%]"
              onClick={() => {
                setEditMode(EditMode.CANCELLED);
              }}
            >
              Cancel
            </Button>
            <Button
              color="violet"
              className="w-[48%]"
              onClick={() => setEditMode(EditMode.COMPLETED)}
            >
              Update
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ExtractionElement(props: {
  node: ExtractionNode;
  updateExtractionNodes: (
    filePath: string,
    symbols: string[],
    action: "add" | "remove",
  ) => void;
  editMode?: EditMode;
}) {
  type CheckedState = boolean | "indeterminate";

  const symbolMap = new Map<string, boolean>();
  props.node.symbols.forEach((symbol) => {
    symbolMap.set(symbol, true);
  });

  const [fileChecked, setFileChecked] = useState<CheckedState>(true);
  const [checkedSymbols, setCheckedSymbols] = useState(symbolMap);
  const maxPathLength = 20;

  function getDisplayedPath(name: string) {
    if (name.length > maxPathLength) {
      return (
        <Tooltip content={name}>
          <div className="overflow-ellipsis">{`...${name.slice(
            -maxPathLength,
          )}`}</div>
        </Tooltip>
      );
    }
    return <div>{name}</div>;
  }

  function resolveFileCheckedState(symbolMap: Map<string, boolean>) {
    const allChecked = props.node.symbols.every((symbol) => {
      return symbolMap.get(symbol) === true;
    });
    const allUnchecked = props.node.symbols.every((symbol) => {
      return symbolMap.get(symbol) === false;
    });
    if (allChecked) {
      return true;
    }
    if (allUnchecked) {
      return false;
    }
    return "indeterminate";
  }

  function handleSymbolCheck(symbol: string, checked: boolean) {
    let newMap: Map<string, boolean>;
    setCheckedSymbols((prev) => {
      newMap = new Map(prev);
      newMap.set(symbol, checked);
      return newMap;
    });

    setFileChecked(resolveFileCheckedState(newMap));
  }

  useEffect(() => {
    if (props.editMode === EditMode.COMPLETED) {
      // Check if any of the symbols are unchecked, and remove them from the extraction
      const uncheckedSymbols = Array.from(checkedSymbols.entries())
        .filter(([, checked]) => !checked)
        .map(([symbol]) => symbol);
      if (uncheckedSymbols.length > 0) {
        props.updateExtractionNodes(
          props.node.filePath,
          uncheckedSymbols,
          "remove",
        );
      }

      // If a file is unchecked, remove all symbols from the extraction
      if (fileChecked === false) {
        props.updateExtractionNodes(
          props.node.filePath,
          props.node.symbols,
          "remove",
        );
      }

      //Finally, update the checkedSymbols to remove the unchecked symbols
      setCheckedSymbols((prev) => {
        const newMap = new Map<string, boolean>();
        props.node.symbols.forEach((symbol) => {
          if (prev.get(symbol) !== false) {
            newMap.set(symbol, true);
          }
        });
        return newMap;
      });
      setFileChecked(true);
    }

    if (props.editMode === EditMode.CANCELLED) {
      // Reset the checked state to the original state
      // by setting everything to true
      setFileChecked(true);
      setCheckedSymbols(() => {
        const newMap = new Map<string, boolean>();
        props.node.symbols.forEach((symbol) => {
          newMap.set(symbol, true);
        });
        return newMap;
      });
    }
  }, [props.editMode]);

  return (
    <div className="flex flex-col space-y-2 ml-5">
      <div className="flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2">
          {languageIcon(extname(props.node.filePath).slice(1) || "txt")}
          {getDisplayedPath(props.node.filePath)}
        </div>
        {props.editMode === EditMode.EDITING && (
          <Tooltip content="Include this file in the extraction?">
            <div>
              <Checkbox
                variant="surface"
                checked={fileChecked}
                className="border-[1px] border-gray-light dark:border-gray-dark"
                onCheckedChange={(checked) => {
                  setFileChecked(Boolean(checked));
                  for (const symbol of props.node.symbols) {
                    if (checked) {
                      checkedSymbols.set(symbol, true);
                    } else {
                      checkedSymbols.set(symbol, false);
                    }
                  }
                }}
              ></Checkbox>
            </div>
          </Tooltip>
        )}
      </div>
      {props.node.symbols.map((symbol) => (
        <div
          key={symbol}
          className="flex items-center justify-between space-x-2 ml-8"
        >
          <div className="flex items-center space-x-2">
            <MdSubdirectoryArrowRight className="text-gray-light dark:text-gray-dark" />
            {getDisplayedPath(symbol)}
          </div>
          {props.editMode === EditMode.EDITING && (
            <Tooltip content="Include this symbol in the extraction?">
              <div>
                <Checkbox
                  variant="surface"
                  checked={checkedSymbols.get(symbol) || false}
                  onCheckedChange={(checked) => {
                    handleSymbolCheck(symbol, Boolean(checked));
                  }}
                ></Checkbox>
              </div>
            </Tooltip>
          )}
        </div>
      ))}
    </div>
  );
}
