import { Badge, BadgeProps } from "@radix-ui/themes";
import { useEffect, useState } from "react";

export default function MethodBadge(props: { method: string }) {
  const [color, setColor] = useState<BadgeProps["color"]>("gray");

  useEffect(() => {
    switch (props.method.toLowerCase()) {
      case "get":
        setColor("green");
        break;
      case "post":
        setColor("blue");
        break;
      case "put":
        setColor("yellow");
        break;
      case "patch":
        setColor("orange");
        break;
      case "delete":
        setColor("red");
        break;
      default:
        setColor("gray");
        break;
    }
  }, [props.method]);

  return (
    <Badge color={color} variant="solid" radius="full" size="1">
      {props.method.toUpperCase()}
    </Badge>
  );
}
