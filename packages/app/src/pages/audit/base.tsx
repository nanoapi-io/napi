import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router";
import {
  getAuditManifest,
  getDependencyManifest,
  runExtraction,
} from "../../service/api/index.ts";
import type {
  AuditManifest,
  DependencyManifest,
  SymbolsToExtract,
} from "@napi/shared";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "../../components/shadcn/Sidebar.tsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "../../components/shadcn/Breadcrumb.tsx";
import { Button } from "../../components/shadcn/Button.tsx";
import { Skeleton } from "../../components/shadcn/Skeleton.tsx";
import { Input } from "../../components/shadcn/Input.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/shadcn/Tooltip.tsx";
import {
  ChevronDown,
  ChevronRight,
  CircleMinus,
  Code,
  File,
  Loader,
  Moon,
  Pickaxe,
  ScanEye,
  SearchCode,
  Sun,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../components/shadcn/Resizable.tsx";
import { ScrollArea, ScrollBar } from "../../components/shadcn/Scrollarea.tsx";
import { useToast } from "../../components/shadcn/hooks/use-toast.tsx";
import { useTheme } from "../../contexts/ThemeProvider.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/Card.tsx";
import DisplayNameWithTooltip from "../../components/DisplayNameWithTootip.tsx";

export interface AuditContext {
  busy: boolean;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedCytoscapeRef: {
    filePath: string;
    symbolId: string | undefined;
  } | undefined;
  onAddSymbolsForExtraction: (
    filePath: string,
    symbolIds: string[],
  ) => void;
}

export default function BaseAuditPage() {
  const { theme, setTheme } = useTheme();

  const { file, instance } = useParams();

  const { toast } = useToast();

  const [busy, setBusy] = useState<boolean>(true);

  const [auditManifest, setAuditManifest] = useState<AuditManifest>({});
  const [dependencyManifest, setDependencyManifest] = useState<
    DependencyManifest
  >({});

  const [highlightedCytoscapeRef, setHighlightedCytoscapeRef] = useState<
    {
      filePath: string;
      symbolId: string | undefined;
    } | undefined
  >(undefined);

  const [symbolsToExtract, setSymbolsToExtract] = useState<SymbolsToExtract>(
    [],
  );

  async function extractSymbols() {
    setBusy(true);
    const extractionToast = toast({
      title: "Extracting symbols",
      description: "This may take a while...",
    });
    try {
      await runExtraction(symbolsToExtract);
      extractionToast.update({
        id: extractionToast.id,
        description: "Symbols extracted successfully",
      });
    } catch (_error) {
      extractionToast.update({
        id: extractionToast.id,
        description: "Failed to extract symbols",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    async function handleOnLoad() {
      setBusy(true);
      const allPromiseToast = toast({
        title: "Loading manifests",
        description: "This may take a while...",
      });
      try {
        const dependencyManifestPromise = getDependencyManifest();
        const auditManifestPromise = getAuditManifest();

        const allPromise = Promise.all([
          dependencyManifestPromise,
          auditManifestPromise,
        ]);

        const [dependencyManifest, auditManifest] = await allPromise;

        setDependencyManifest(dependencyManifest);
        setAuditManifest(auditManifest);

        allPromiseToast.update({
          id: allPromiseToast.id,
          description: "Manifests loaded successfully",
        });
      } catch (_error) {
        allPromiseToast.update({
          id: allPromiseToast.id,
          description: "Failed to load manifests",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    }

    handleOnLoad();
  }, []);

  return (
    <SidebarProvider
      defaultOpen
      className="h-screen w-screen"
      style={{ "--sidebar-width": "30rem" } as React.CSSProperties}
    >
      <FileExplorerSidebar
        busy={busy}
        dependencyManifest={dependencyManifest}
        auditManifest={auditManifest}
        onHighlightInCytoscape={(node) => {
          if (!node.fileId) return;
          const newRef = {
            filePath: node.fileId,
            symbolId: node.symbolId,
          };
          // If the new ref is the same as the current ref, we un set it (unhighlight)
          if (
            highlightedCytoscapeRef?.filePath === newRef.filePath &&
            highlightedCytoscapeRef?.symbolId === newRef.symbolId
          ) {
            setHighlightedCytoscapeRef(undefined);
          } else {
            setHighlightedCytoscapeRef(newRef);
          }
        }}
        toDetails={(node: ExplorerNodeData) => {
          if (node.symbolId && node.fileId) {
            return `/audit/${encodeURIComponent(node.fileId)}/${
              encodeURIComponent(node.symbolId)
            }`;
          } else if (node.fileId) {
            return `/audit/${encodeURIComponent(node.fileId)}`;
          } else {
            return "/audit";
          }
        }}
        symbolsToExtract={symbolsToExtract}
        onUpdateSymbolsToExtract={setSymbolsToExtract}
        onExtractSymbols={extractSymbols}
      />
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div className="flex items-center py-2 justify-between">
          <div className="flex items-center gap-2 ml-2">
            <SidebarTrigger />
            <BreadcrumbNav
              toProjectLink={() => "/audit"}
              fileId={file}
              toFileIdLink={(fileId) => `/audit/${encodeURIComponent(fileId)}`}
              instanceId={instance}
              toInstanceIdLink={(fileId, instanceId) =>
                `/audit/${encodeURIComponent(fileId)}/${
                  encodeURIComponent(instanceId)
                }`}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="mr-2"
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
        </div>
        <div className="grow w-full border-t">
          <Outlet
            context={{
              busy,
              dependencyManifest,
              auditManifest,
              highlightedCytoscapeRef,
              onAddSymbolsForExtraction: (filePath, symbolIds) => {
                const newSymbolsToExtract = [...symbolsToExtract];
                for (const symbolId of symbolIds) {
                  // Check if there's an existing entry for this file
                  const existingIndex = newSymbolsToExtract.findIndex(
                    (s) => s.filePath === filePath,
                  );

                  if (existingIndex === -1) {
                    // No existing entry for this file, create a new one
                    newSymbolsToExtract.push({ filePath, symbols: [symbolId] });
                  } else {
                    // File exists, check if symbol is already included
                    if (
                      !newSymbolsToExtract[existingIndex].symbols.includes(
                        symbolId,
                      )
                    ) {
                      newSymbolsToExtract[existingIndex].symbols.push(symbolId);
                    }
                  }
                }
                setSymbolsToExtract(newSymbolsToExtract);
              },
            } as AuditContext}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}

function BreadcrumbNav(props: {
  toProjectLink: () => string;
  fileId: string | undefined;
  toFileIdLink: (fileId: string) => string;
  instanceId: string | undefined;
  toInstanceIdLink: (fileId: string, instanceId: string) => string;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={props.toProjectLink()}>Project</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {props.fileId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={props.toFileIdLink(props.fileId)}>
                  {props.fileId}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {props.instanceId && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to={props.toInstanceIdLink(
                        props.fileId,
                        props.instanceId,
                      )}
                    >
                      {props.instanceId}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

interface ExplorerNodeData {
  id: string;
  displayName: string;
  fileId?: string;
  symbolId?: string;
  children: Map<string, ExplorerNodeData>;
}

function FileExplorerSidebar(props: {
  busy: boolean;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  onHighlightInCytoscape: (node: ExplorerNodeData) => void;
  toDetails: (node: ExplorerNodeData) => string;
  symbolsToExtract: SymbolsToExtract;
  onUpdateSymbolsToExtract: (symbolsToExtract: SymbolsToExtract) => void;
  onExtractSymbols: () => void;
}) {
  const [search, setSearch] = useState<string>("");

  const [explorerTree, setExplorerTree] = useState<ExplorerNodeData>();

  // Build the explorer tree when the dependency manifest changes
  useEffect(() => {
    const tree = buildExplorerTree(props.dependencyManifest, search);
    setExplorerTree(tree);
  }, [props.dependencyManifest, search]);

  function buildExplorerTree(
    dependencyManifest: DependencyManifest,
    search: string,
  ): ExplorerNodeData | undefined {
    const getExplorerNodeId = (filePath: string, instanceId?: string) => {
      if (instanceId) {
        return `${filePath}#${instanceId}`;
      }
      return filePath;
    };

    const root: ExplorerNodeData = {
      id: "root",
      displayName: "Project",
      children: new Map(),
    };

    // Filter function to check if a string matches the search term
    const matchesSearch = (text: string): boolean => {
      if (!search) return true;
      return text.toLowerCase().includes(search.toLowerCase());
    };

    // Track if any nodes match the search to avoid empty results
    let hasMatchingNodes = false;

    for (const fileDependencyManifest of Object.values(dependencyManifest)) {
      const filePath = fileDependencyManifest.filePath;
      const fileName = filePath.split("/").pop() || "";
      const fileMatchesSearch = matchesSearch(fileName);

      // Check if any symbols match the search
      const matchingSymbols = Object.keys(fileDependencyManifest.symbols)
        .filter(
          (symbolId) => matchesSearch(symbolId),
        );

      // Skip this file if neither the file nor any symbols match the search
      if (search && !fileMatchesSearch && matchingSymbols.length === 0) {
        continue;
      }

      hasMatchingNodes = true;

      const parts = filePath.split("/");
      let currentNode: ExplorerNodeData = root;
      for (const part of parts) {
        const id = getExplorerNodeId(part);
        if (!currentNode.children.has(id)) {
          currentNode.children.set(id, {
            id: id,
            displayName: part,
            children: new Map(),
          });
        }
        currentNode = currentNode.children.get(id)!;
      }
      currentNode.fileId = getExplorerNodeId(filePath);

      // Only add symbols that match the search or if no search is provided
      for (const instanceId of Object.keys(fileDependencyManifest.symbols)) {
        if (!search || matchesSearch(instanceId)) {
          const id = getExplorerNodeId(filePath, instanceId);
          currentNode.children.set(id, {
            id: id,
            displayName: instanceId,
            fileId: filePath,
            symbolId: instanceId,
            children: new Map(),
          });
        }
      }
    }

    // If no nodes match the search, return an empty tree
    if (search && !hasMatchingNodes) {
      return undefined;
    }

    const flattenTree = (node: ExplorerNodeData): ExplorerNodeData => {
      // First recursively flatten all children
      if (node.children.size > 0) {
        const flattenedChildren = new Map<string, ExplorerNodeData>();
        for (const [id, child] of node.children) {
          const flattenedChild = flattenTree(child);
          flattenedChildren.set(id, flattenedChild);
        }
        node.children = flattenedChildren;
      }

      // Then check if this node has exactly one child that can be merged
      while (node.children.size === 1) {
        const childEntry = Array.from(node.children.entries())[0];
        const child = childEntry[1];

        // Skip if the child has symbols (is a leaf node)
        if (child.fileId) {
          break;
        }

        // Merge child's name into parent
        node.displayName = `${node.displayName}/${child.displayName}`;
        // Update the parent's id to child's id
        node.id = child.id;
        // Replace parent's children with child's children
        node.children = child.children;
      }

      return node;
    };

    // Flatten nodes that have only one child
    return flattenTree(root);
  }

  function removeSymbolsFromExtraction(filePath: string, symbolIds: string[]) {
    const newSymbolsToExtract = props.symbolsToExtract.map(
      (symbolToExtract) => {
        if (symbolToExtract.filePath === filePath) {
          // Only filter out the specific symbol IDs from this file's symbols array
          return {
            ...symbolToExtract,
            symbols: symbolToExtract.symbols.filter(
              (symbolId) => !symbolIds.includes(symbolId),
            ),
          };
        }
        return symbolToExtract;
      },
    ).filter((symbolToExtract) => symbolToExtract.symbols.length > 0); // Remove entries with no symbols left

    props.onUpdateSymbolsToExtract(newSymbolsToExtract);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          to="https://nanoapi.io"
          target="_blank"
          className="flex items-center space-x-3"
        >
          <img src="/logo.png" alt="logo" className="h-10" />
          <div className="text-xl font-bold">NanoAPI</div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {props.busy
          ? (
            <SidebarGroup className="flex flex-col space-y-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="w-full h-6" />
              ))}
            </SidebarGroup>
          )
          : (
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel>
                <SidebarGroup className="flex h-full">
                  <ScrollArea>
                    <Tooltip delayDuration={500}>
                      <TooltipTrigger asChild>
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          Search for a file or symbol.
                          <br />
                          The search will find partial matches in both symbol
                          names and file paths.
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    <div className="pt-2">
                      {!explorerTree
                        ? (
                          <div className="text-sm font-muted italic">
                            No Matching files found
                          </div>
                        )
                        : (
                          <ExplorerNode
                            node={explorerTree}
                            level={0}
                            onHighlightInCytoscape={props
                              .onHighlightInCytoscape}
                            toDetails={props.toDetails}
                          />
                        )}
                    </div>
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                </SidebarGroup>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={20} minSize={5}>
                <SidebarGroup className="flex h-full">
                  <ScrollArea>
                    <SidebarGroupLabel className="flex items-center space-x-2">
                      <Pickaxe />
                      <div className="text-lg font-bold">Symbol Extraction</div>
                    </SidebarGroupLabel>
                    <div className="flex flex-col space-y-2 pt-2">
                      {props.symbolsToExtract.length === 0
                        ? (
                          <div className="text-sm font-muted italic">
                            No symbols marked for extraction yet
                          </div>
                        )
                        : (
                          <div className="flex flex-col space-y-2">
                            {props.symbolsToExtract.map((symbolToExtract) => (
                              <Card key={symbolToExtract.filePath}>
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center space-x-2 text-xs">
                                      <File size={20} />
                                      <DisplayNameWithTooltip
                                        name={symbolToExtract.filePath}
                                        maxChar={30}
                                      />
                                    </CardTitle>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeSymbolsFromExtraction(
                                          symbolToExtract.filePath,
                                          symbolToExtract.symbols,
                                        )}
                                    >
                                      <CircleMinus color="red" />
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="flex flex-col space-y-1">
                                    {symbolToExtract.symbols.map((symbol) => (
                                      <div className="flex items-center justify-between">
                                        <div
                                          key={symbol}
                                          className="flex items-center gap-1 text-xs"
                                        >
                                          <Code size={12} />
                                          <DisplayNameWithTooltip
                                            name={symbol}
                                            maxChar={30}
                                          />
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            removeSymbolsFromExtraction(
                                              symbolToExtract.filePath,
                                              [symbol],
                                            )}
                                        >
                                          <CircleMinus color="red" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            <Button
                              disabled={props.busy}
                              size="sm"
                              onClick={props.onExtractSymbols}
                            >
                              {props.busy
                                ? <Loader className="animate-spin" />
                                : <Pickaxe />}
                              Extract symbols
                            </Button>
                          </div>
                        )}
                    </div>
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                </SidebarGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function ExplorerNode(props: {
  node: ExplorerNodeData;
  level: number;
  onHighlightInCytoscape: (node: ExplorerNodeData) => void;
  toDetails: (node: ExplorerNodeData) => string;
}) {
  const [showChildren, setShowChildren] = useState<boolean>(false);

  const type: "folder" | "file" | "symbol" = props.node.symbolId
    ? "symbol"
    : props.node.fileId
    ? "file"
    : "folder";

  return (
    <div
      className="w-full space-y-1"
      style={{ paddingLeft: `${props.level / 2}rem` }}
    >
      {(() => {
        switch (type) {
          case "folder":
            return (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChildren(!showChildren)}
                className="w-full justify-start"
              >
                {showChildren ? <ChevronDown /> : <ChevronRight />}
                <DisplayNameWithTooltip
                  name={props.node.displayName}
                  maxChar={Math.max(5, 30 - props.level * 2)}
                />
              </Button>
            );
          case "file":
            return (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChildren(!showChildren)}
                  className="w-full justify-start"
                >
                  <File />
                  <DisplayNameWithTooltip
                    name={props.node.displayName}
                    maxChar={Math.max(5, 30 - props.level * 2)}
                  />
                </Button>
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => props.onHighlightInCytoscape(props.node)}
                    >
                      <ScanEye />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Highlight in graph
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <Button asChild variant="secondary" size="sm">
                      <Link to={props.toDetails(props.node)}>
                        <SearchCode />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    View graph for this file
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          case "symbol":
            return (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1">
                  <Code size={12} />
                  <DisplayNameWithTooltip
                    name={props.node.displayName}
                    maxChar={Math.max(5, 30 - props.level * 2)}
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => props.onHighlightInCytoscape(props.node)}
                      >
                        <ScanEye />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Highlight in graph
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <Button asChild variant="secondary" size="sm">
                        <Link to={props.toDetails(props.node)}>
                          <SearchCode />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      View graph for this symbol
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
        }
      })()}
      {showChildren &&
        Array.from(props.node.children.values()).map((child) => (
          <ExplorerNode
            key={child.id}
            node={child}
            level={props.level + 1}
            onHighlightInCytoscape={props.onHighlightInCytoscape}
            toDetails={props.toDetails}
          />
        ))}
    </div>
  );
}
