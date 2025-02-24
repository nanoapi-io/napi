import { Badge, BadgeProps } from "@radix-ui/themes";
import { useEffect, useState } from "react";

export default function InstanceTypeBadge(props: { type: string }) {
  const [color, setColor] = useState<BadgeProps["color"]>("gray");

  useEffect(() => {
    switch (props.type.toLowerCase()) {
      case "class":
        setColor("green");
        break;
      case "function":
        setColor("blue");
        break;
      case "assignement":
        setColor("gray");
        break;
      default:
        setColor("gray");
        break;
    }
  }, [props.type]);

  return (
    <Badge color={color} variant="solid" radius="full" size="1">
      {props.type}
    </Badge>
  );
}
