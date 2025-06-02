import { type MouseEvent, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../shadcn/Tooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../shadcn/Dropdownmenu.tsx";
import { Button } from "../../../../shadcn/Button.tsx";
import { Funnel } from "lucide-react";

export default function FiltersExtension(props: {
  busy: boolean;
  currentFileName?: string;
  onFilterChange: (
    showExternal: boolean,
    showVariables: boolean,
    showFunctions: boolean,
    showClasses: boolean,
    showStructs: boolean,
    showEnums: boolean,
    showInterfaces: boolean,
    showRecords: boolean,
    showDelegates: boolean,
  ) => void;
}) {
  const [showExternal, setShowExternal] = useState(true);
  const [showVariables, setShowVariables] = useState(true);
  const [showFunctions, setShowFunctions] = useState(true);
  const [showClasses, setShowClasses] = useState(true);
  const [showStructs, setShowStructs] = useState(true);
  const [showEnums, setShowEnums] = useState(true);
  const [showInterfaces, setShowInterfaces] = useState(true);
  const [showRecords, setShowRecords] = useState(true);
  const [showDelegates, setShowDelegates] = useState(true);

  useEffect(() => {
    props.onFilterChange(
      showExternal,
      showVariables,
      showFunctions,
      showClasses,
      showStructs,
      showEnums,
      showInterfaces,
      showRecords,
      showDelegates,
    );
  }, [
    showExternal,
    showVariables,
    showFunctions,
    showClasses,
    showStructs,
    showEnums,
    showInterfaces,
    showRecords,
    showDelegates,
  ]);

  function handleFilterClick(
    e: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
    set: React.Dispatch<React.SetStateAction<boolean>>,
  ) {
    e.preventDefault();
    set((prev) => !prev);
  }

  return (
    <Tooltip delayDuration={500}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              disabled={props.busy}
            >
              <Funnel />
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuSeparator />
          {[
            {
              label: "Show external",
              checked: showExternal,
              set: setShowExternal,
            },
            {
              label: "Show variables",
              checked: showVariables,
              set: setShowVariables,
            },
            {
              label: "Show functions",
              checked: showFunctions,
              set: setShowFunctions,
            },
            {
              label: "Show classes",
              checked: showClasses,
              set: setShowClasses,
            },
            {
              label: "Show structs",
              checked: showStructs,
              set: setShowStructs,
            },
            { label: "Show enums", checked: showEnums, set: setShowEnums },
            {
              label: "Show interfaces",
              checked: showInterfaces,
              set: setShowInterfaces,
            },
            {
              label: "Show records",
              checked: showRecords,
              set: setShowRecords,
            },
            {
              label: "Show delegates",
              checked: showDelegates,
              set: setShowDelegates,
            },
          ].map(({ label, checked, set }) => (
            <DropdownMenuCheckboxItem
              key={label}
              checked={checked}
              onClick={(e) => handleFilterClick(e, set)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>
        Hide or show specific elements in the graph.
      </TooltipContent>
    </Tooltip>
  );
}
