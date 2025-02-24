import { useEffect } from "react";

export default function WaterMarkRemover(props: { busy: boolean }) {
  useEffect(() => {
    if (!props.busy) {
      const element = document.querySelector(
        ".react-flow__panel",
      ) as HTMLElement;
      if (element) {
        element.style.display = "none";
      }
    }
  }, [props.busy]);

  return <></>;
}
