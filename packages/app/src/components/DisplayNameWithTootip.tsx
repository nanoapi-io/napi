import { Tooltip, TooltipContent, TooltipTrigger } from "./shadcn/Tooltip.tsx";

export default function DisplayNameWithTooltip(props: {
  name: string;
  maxChar?: number;
  truncateBefore?: boolean;
}) {
  const maxChar = props.maxChar || 30;

  if (props.name.length > maxChar) {
    let displayedName: string;

    if (props.truncateBefore) {
      displayedName = "..." + props.name.slice(0, maxChar);
    } else {
      displayedName = props.name.slice(0, maxChar) + "...";
    }

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
  } else {
    return <span>{props.name}</span>;
  }
}
