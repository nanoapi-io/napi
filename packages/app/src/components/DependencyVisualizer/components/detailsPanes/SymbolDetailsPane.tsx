import type {
  FileAuditManifest,
  FileDependencyManifest,
  SymbolAuditManifest,
  SymbolDependencyManifest,
} from "@napi/shared";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../../shadcn/Sheet.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shadcn/Card.tsx";
import { Code, File, Pickaxe, SearchCode } from "lucide-react";
import { ScrollArea } from "../../../shadcn/Scrollarea.tsx";
import { Button } from "../../../shadcn/Button.tsx";
import { Link, useSearchParams } from "react-router";
import DisplayNameWithTooltip from "../DisplayNameWithTootip.tsx";
import Metrics from "./Metrics.tsx";
import AlertBadge from "./AlertBadge.tsx";

export default function SymbolDetailsPane(props: {
  context: {
    fileDependencyManifest: FileDependencyManifest;
    symbolDependencyManifest: SymbolDependencyManifest;
    fileAuditManifest: FileAuditManifest;
    symbolAuditManifest: SymbolAuditManifest;
  } | undefined;
  onClose: () => void;
  onAddSymbolsForExtraction: (filePath: string, symbolIds: string[]) => void;
}) {
  const [searchParams] = useSearchParams();

  function markSymbolForExtraction(symbolId: string) {
    if (!props.context?.fileDependencyManifest) {
      return;
    }

    props.onAddSymbolsForExtraction(
      props.context.fileDependencyManifest.filePath,
      [symbolId],
    );
  }

  function getToSymbolLink(filePath: string, symbolId: string) {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("fileId", filePath);
    newSearchParams.set("instanceId", symbolId);
    return `?${newSearchParams.toString()}`;
  }

  return (
    <div className="absolute z-50">
      <Sheet
        open={props.context !== undefined}
        onOpenChange={() => props.onClose()}
      >
        <SheetTrigger />
        <SheetContent className="flex flex-col space-y-2">
          <SheetHeader>
            <SheetTitle className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <Code />
                <DisplayNameWithTooltip
                  name={`${props.context?.symbolDependencyManifest.id} (${props.context?.symbolDependencyManifest.type})`}
                  maxChar={30}
                  truncateBefore
                />
              </div>
              <div className="flex items-center space-x-2">
                <File />
                <DisplayNameWithTooltip
                  name={props.context?.fileDependencyManifest.filePath || ""}
                  maxChar={30}
                />
              </div>
            </SheetTitle>
            <Button
              asChild
              variant="secondary"
              size="sm"
              onClick={props.onClose}
            >
              <Link
                to={getToSymbolLink(
                  props.context?.fileDependencyManifest.filePath || "",
                  props.context?.symbolDependencyManifest.id || "",
                )}
              >
                <SearchCode />
                View graph for this symbol
              </Link>
            </Button>
            <Button
              onClick={() =>
                props.context?.symbolDependencyManifest.id &&
                markSymbolForExtraction(
                  props.context?.symbolDependencyManifest.id,
                )}
              variant="secondary"
              size="sm"
            >
              <Pickaxe />
              Mark symbol for extraction
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              onClick={props.onClose}
            >
              <Link
                to={`/${
                  encodeURIComponent(
                    props.context?.fileDependencyManifest.filePath || "",
                  )
                }`}
              >
                <SearchCode />
                View graph for this file
              </Link>
            </Button>
          </SheetHeader>
          <ScrollArea>
            <div className="flex flex-col space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Code />
                      <div>Symbol Metrics</div>
                    </div>
                    <AlertBadge
                      count={Object.keys(
                        props.context?.symbolAuditManifest.alerts || {},
                      ).length || 0}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Metrics
                    dependencyManifest={props.context?.symbolDependencyManifest}
                    auditManifest={props.context?.symbolAuditManifest}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <File />
                      <div>File Metrics</div>
                    </div>
                    <AlertBadge
                      count={Object.keys(
                        props.context?.fileAuditManifest.alerts || {},
                      ).length || 0}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Metrics
                    dependencyManifest={props.context?.fileDependencyManifest}
                    auditManifest={props.context?.fileAuditManifest}
                  />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
