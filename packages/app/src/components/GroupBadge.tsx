import { Badge } from "@radix-ui/themes";

export default function GroupBadge(props: { name: string }) {
  return (
    <Badge
      radius="full"
      size="2"
      className="text-text-light dark:text-text-dark bg-[#FFFFFF1A] border border-primary-light dark:border-primary-dark"
    >
      {props.name}
    </Badge>
  );
}
