import { Check, TriangleAlert } from "lucide-react";

export default function AlertBadge(props: { count: number }) {
  return (
    <div className="flex items-center space-x-2">
      {props.count > 0
        ? (
          <>
            <TriangleAlert color="red" />
            {props.count}
          </>
        )
        : <Check color="green" />}
    </div>
  );
}
