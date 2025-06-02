import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { AuditManifest, DependencyManifest } from "@napi/shared";
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
  ScanEye,
  SearchCode,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "../../shadcn/Scrollarea.tsx";
import DisplayNameWithTooltip from "./DisplayNameWithTootip.tsx";

export interface ExplorerNodeData {
  id: string;
  displayName: string;
  fileId?: string;
  symbolId?: string;
  children: Map<string, ExplorerNodeData>;
}

export function FileExplorerSidebar(props: {
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  onHighlightInCytoscape: (node: ExplorerNodeData) => void;
  toDetails: (node: ExplorerNodeData) => string;
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
                  The search will find partial matches in both symbol names and
                  file paths.
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
              <div className="flex justify-between items-center">
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
                      View graph for this file
                    </TooltipContent>
                  </Tooltip>
                </div>
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
