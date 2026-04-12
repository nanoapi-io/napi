import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DependencyManifest } from "../../../types/dependencyManifest.ts";
import type { AuditManifest } from "../../../types/auditManifest.ts";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
} from "../../shadcn/Sidebar.tsx";
import { Button } from "../../shadcn/Button.tsx";
import { Input } from "../../shadcn/Input.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../shadcn/Tooltip.tsx";
import {
  ChevronDown,
  ChevronRight,
  Code,
  File,
  FolderClosed,
  FolderOpen,
  ScanEye,
  Search,
  SearchCode,
  X,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "../../shadcn/Scrollarea.tsx";
import DisplayNameWithTooltip from "./DisplayNameWithTooltip.tsx";

export interface ExplorerNodeData {
  id: string;
  displayName: string;
  fileId?: string;
  symbolId?: string;
  children: Map<string, ExplorerNodeData>;
}

function buildExplorerTree(
  dependencyManifest: DependencyManifest,
  filteredSymbols: { fileId: string; symbolId: string }[],
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

  const filteredSymbolsSet = new Set(
    filteredSymbols.map((s) => `${s.fileId}#${s.symbolId}`),
  );

  const filesWithFilteredSymbols = new Set(
    filteredSymbols.map((s) => s.fileId),
  );

  const shouldShowAll = filteredSymbols.length === 0;

  let hasMatchingNodes = false;

  for (const fileDependencyManifest of Object.values(dependencyManifest)) {
    const filePath = fileDependencyManifest.filePath;

    const fileShouldBeIncluded = shouldShowAll ||
      filesWithFilteredSymbols.has(filePath);

    if (!fileShouldBeIncluded) {
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

    for (const instanceId of Object.keys(fileDependencyManifest.symbols)) {
      const symbolKey = `${filePath}#${instanceId}`;
      if (shouldShowAll || filteredSymbolsSet.has(symbolKey)) {
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

  if (!shouldShowAll && !hasMatchingNodes) {
    return undefined;
  }

  const flattenTree = (node: ExplorerNodeData): ExplorerNodeData => {
    if (node.children.size > 0) {
      const flattenedChildren = new Map<string, ExplorerNodeData>();

      const folders: Array<[string, ExplorerNodeData]> = [];
      const files: Array<[string, ExplorerNodeData]> = [];

      for (const [id, child] of node.children) {
        const flattenedChild = flattenTree(child);
        if (flattenedChild.fileId) {
          files.push([id, flattenedChild]);
        } else {
          folders.push([id, flattenedChild]);
        }
      }

      for (const [id, folder] of folders) {
        flattenedChildren.set(id, folder);
      }
      for (const [id, file] of files) {
        flattenedChildren.set(id, file);
      }

      node.children = flattenedChildren;
    }

    while (node.children.size === 1) {
      const childEntry = Array.from(node.children.entries())[0];
      const child = childEntry[1];

      if (child.fileId) {
        break;
      }

      node.displayName = `${node.displayName}/${child.displayName}`;
      node.id = child.id;
      node.children = child.children;
    }

    return node;
  };

  return flattenTree(root);
}

function computeFilteredSymbols(
  dependencyManifest: DependencyManifest,
  searchTerm: string,
): { fileId: string; symbolId: string }[] {
  const term = searchTerm.toLowerCase();
  const results: { fileId: string; symbolId: string }[] = [];

  for (const file of Object.values(dependencyManifest)) {
    const filePathMatch = file.filePath.toLowerCase().includes(term);

    for (const symbolId of Object.keys(file.symbols)) {
      if (filePathMatch || symbolId.toLowerCase().includes(term)) {
        results.push({ fileId: file.filePath, symbolId });
      }
    }
  }

  return results;
}

export function FileExplorerSidebar(props: {
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  onHighlightInCytoscape: (node: ExplorerNodeData) => void;
  toDetails: (node: ExplorerNodeData) => string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const filteredSymbols = useMemo(() => {
    if (!activeSearch) return [];
    return computeFilteredSymbols(props.dependencyManifest, activeSearch);
  }, [props.dependencyManifest, activeSearch]);

  const [explorerTree, setExplorerTree] = useState<ExplorerNodeData>();

  useEffect(() => {
    const tree = buildExplorerTree(props.dependencyManifest, filteredSymbols);
    setExplorerTree(tree);
  }, [props.dependencyManifest, filteredSymbols]);

  function onSubmitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchTerm.trim()) {
      setActiveSearch(searchTerm.trim());
    }
  }

  function onClearSearch() {
    setSearchTerm("");
    setActiveSearch("");
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <a
          href="https://nanoapi.io"
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-3"
        >
          <img src="/logo.png" alt="logo" className="h-10" />
          <div className="text-xl font-bold">NanoAPI</div>
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="flex h-full">
          <ScrollArea>
            <form
              onSubmit={onSubmitSearch}
              className="flex items-center gap-2"
            >
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files & symbols"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
              >
                <Search />
              </Button>
              {activeSearch && (
                <Button
                  onClick={onClearSearch}
                  variant="ghost"
                  size="icon"
                >
                  <X />
                </Button>
              )}
            </form>

            <div className="pt-2">
              {!explorerTree
                ? (
                  <div className="text-sm font-muted italic">
                    No matching files found
                  </div>
                )
                : (
                  <ExplorerNode
                    node={explorerTree}
                    level={0}
                    onHighlightInCytoscape={props.onHighlightInCytoscape}
                    toDetails={props.toDetails}
                  />
                )}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </SidebarGroup>
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
                {showChildren ? <FolderOpen /> : <FolderClosed />}
                <DisplayNameWithTooltip
                  name={props.node.displayName}
                  maxChar={Math.max(5, 30 - props.level * 2)}
                />
              </Button>
            );
          case "file":
            return (
              <div className="flex justify-between items-center gap-2">
                <div className="grow flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChildren(!showChildren)}
                    className="w-full justify-start"
                  >
                    {showChildren
                      ? <ChevronDown size={16} />
                      : <ChevronRight size={16} />}
                    <File />
                    <DisplayNameWithTooltip
                      name={props.node.displayName}
                      maxChar={Math.max(5, 30 - props.level * 2)}
                    />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          props.onHighlightInCytoscape(props.node)}
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
              </div>
            );
          case "symbol":
            return (
              <div className="flex justify-between items-center gap-2">
                <div className="grow flex items-center gap-2">
                  <Code size={12} />
                  <DisplayNameWithTooltip
                    name={props.node.displayName}
                    maxChar={Math.max(5, 30 - props.level * 2)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          props.onHighlightInCytoscape(props.node)}
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
