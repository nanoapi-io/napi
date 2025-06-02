import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../shadcn/Tooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../../../shadcn/Dropdownmenu.tsx";
import { Button } from "../../../../shadcn/Button.tsx";
import { Settings2 } from "lucide-react";
import { Slider } from "../../../../shadcn/Slider.tsx";
import { Input } from "../../../../shadcn/Input.tsx";
import { Label } from "../../../../shadcn/Label.tsx";

export default function GraphDepthExtension(props: {
  busy: boolean;
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tempDependencyDepth !== dependencyState.depth) {
      dependencyState.setDepth(tempDependencyDepth);
    }
    if (tempDependentDepth !== dependentState.depth) {
      dependentState.setDepth(tempDependentDepth);
    }
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
              <Settings2 />
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col space-y-2 min-w-[200px] p-1"
          >
            <Label htmlFor="dependency-depth">Dependency Depth</Label>
            <div className="flex items-center space-x-2">
              <Slider
                min={0}
                max={20}
                step={1}
                value={[tempDependencyDepth]}
                disabled={props.busy}
                onValueChange={(value) => {
                  setTempDependencyDepth(value[0]);
                }}
              />
              <Input
                id="dependency-depth"
                type="number"
                value={tempDependencyDepth}
                min={0}
                step={1}
                onChange={(e) => {
                  setTempDependencyDepth(parseInt(e.target.value, 10));
                }}
                className="w-20"
              />
            </div>
            <Label htmlFor="dependent-depth">Dependent Depth</Label>
            <div className="flex items-center space-x-2">
              <Slider
                min={0}
                max={20}
                step={1}
                value={[tempDependentDepth]}
                disabled={props.busy}
                onValueChange={(value) => {
                  setTempDependentDepth(value[0]);
                }}
              />
              <Input
                id="dependent-depth"
                type="number"
                value={tempDependentDepth}
                min={0}
                step={1}
                onChange={(e) => {
                  setTempDependentDepth(parseInt(e.target.value, 10));
                }}
                disabled={props.busy}
                className="w-20"
              />
            </div>
            <Button
              type="submit"
              disabled={props.busy}
            >
              Apply
            </Button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>
        Set the depth of the dependencies shown on the graph.
      </TooltipContent>
    </Tooltip>
  );
}
