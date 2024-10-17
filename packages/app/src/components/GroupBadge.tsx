import { Badge } from "@radix-ui/themes";

export default function GroupBadge(props: { name: string }) {
  return (
    <Badge color="gray" variant="solid" radius="none" size="1">
      {props.name}
    </Badge>
  );
}
