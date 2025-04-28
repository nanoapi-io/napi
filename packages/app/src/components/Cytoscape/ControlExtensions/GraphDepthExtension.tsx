import { useState } from "react";
import { Core } from "cytoscape";
import { Button, DropdownMenu, Slider, TextField } from "@radix-ui/themes";
import { MdTune } from "react-icons/md";
import { LuChevronUp } from "react-icons/lu";

export default function GraphDepthExtension(props: {
  busy: boolean;
  cy: Core;
  dependencyState: {
    depth: number;
    setDepth: (depth: number) => void;
  };
  dependentState: {
    depth: number;
    setDepth: (depth: number) => void;
  };
}) {
  const { dependencyState, dependentState } = props;
  const [tempDependencyDepth, setTempDependencyDepth] = useState(
    dependencyState.depth,
  );
  const [tempDependentDepth, setTempDependentDepth] = useState(
    dependentState.depth,
  );

  function checkFiltersSet() {
    if (!props.cy) return false;

    if (
      tempDependencyDepth > 1 ||
      tempDependentDepth > 1 ||
      tempDependencyDepth < 1 ||
      tempDependentDepth < 1
    ) {
      return true;
    }

    return false;
  }

  function applyChanges() {
    if (tempDependencyDepth !== dependencyState.depth) {
      dependencyState.setDepth(tempDependencyDepth);
    }
    if (tempDependentDepth !== dependentState.depth) {
      dependentState.setDepth(tempDependentDepth);
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          size="1"
          variant="ghost"
          color="violet"
          highContrast
          className={`${checkFiltersSet() && "bg-primary-light/20 dark:bg-primary-dark/20"}`}
          disabled={props.busy}
        >
          <MdTune
            className={`text-xl h-5 w-5 ${
              checkFiltersSet()
                ? "text-primary-light dark:text-primary-dark"
                : "text-gray-light dark:text-gray-dark"
            }`}
          />
          <LuChevronUp />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content color="violet" variant="soft">
        <DropdownMenu.Label>Dependency depth</DropdownMenu.Label>
        <div className="flex space-x-2 items-center min-w-52 mx-3">
          <Slider
            min={0}
            max={20}
            value={[tempDependencyDepth]}
            onValueChange={(value) => {
              setTempDependencyDepth(value[0]);
            }}
            className="grow"
          />
          <TextField.Root
            value={String(tempDependencyDepth)}
            onChange={(e) => {
              const parsedValue = parseInt(e.target.value, 10);
              if (!isNaN(parsedValue) && parsedValue >= 0) {
                setTempDependencyDepth(parsedValue);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === "Up" || e.key === "ArrowUp") {
                setTempDependencyDepth(tempDependencyDepth + 1);
              } else if (e.key === "Down" || e.key === "ArrowDown") {
                setTempDependencyDepth(
                  tempDependencyDepth === 0 ? 0 : tempDependencyDepth - 1,
                );
              }
            }}
            className="max-w-10"
          />
        </div>
        <DropdownMenu.Separator />
        <DropdownMenu.Label>Dependent depth</DropdownMenu.Label>
        <div className="flex space-x-2 items-center min-w-52 mx-3">
          <Slider
            min={0}
            max={20}
            value={[tempDependentDepth]}
            onValueChange={(value) => {
              setTempDependentDepth(value[0]);
            }}
            className="grow"
          />
          <TextField.Root
            value={String(tempDependentDepth)}
            onChange={(e) => {
              const parsedValue = parseInt(e.target.value, 10);
              if (!isNaN(parsedValue) && parsedValue >= 0) {
                setTempDependentDepth(parsedValue);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === "Up" || e.key === "ArrowUp") {
                setTempDependentDepth(tempDependentDepth + 1);
              } else if (e.key === "Down" || e.key === "ArrowDown") {
                setTempDependentDepth(
                  tempDependentDepth === 0 ? 0 : tempDependentDepth - 1,
                );
              }
            }}
            className="max-w-10"
          />
        </div>
        <Button
          color="violet"
          loading={props.busy}
          disabled={
            tempDependencyDepth === dependencyState.depth &&
            tempDependentDepth === dependentState.depth
          }
          onClick={() => applyChanges()}
          className="mx-3 mt-2"
        >
          Apply
        </Button>
        <DropdownMenu.Separator />
        <Button
          variant="ghost"
          color="violet"
          disabled={!checkFiltersSet()}
          onClick={() => {
            setTempDependencyDepth(1);
            dependencyState.setDepth(1);
            setTempDependentDepth(1);
            dependentState.setDepth(1);
          }}
          className="mx-3"
        >
          Reset depth
        </Button>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
