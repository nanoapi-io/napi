import { Badge } from "@radix-ui/themes";

export default function GroupBadge(props: { name: string }) {
  return (
    <Badge
      radius="full"
      size="2"
      className="text-text-dark bg-[#FFFFFF1A] border border-primary-dark"
    >
      {props.name}
    </Badge>
  );
}
