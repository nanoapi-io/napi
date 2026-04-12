import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../shadcn/Tooltip.tsx";

export default function DisplayNameWithTooltip(props: {
  name: string;
  maxChar?: number;
  truncateBefore?: boolean;
}) {
  const maxChar = props.maxChar || 30;

  if (props.name.length > maxChar) {
    const displayedName = props.truncateBefore
      ? "..." + props.name.slice(0, maxChar)
      : props.name.slice(0, maxChar) + "...";

    return (
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <span>{displayedName}</span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">{props.name}</div>
        </TooltipContent>
      </Tooltip>
    );
  }
  return <span>{props.name}</span>;
}
