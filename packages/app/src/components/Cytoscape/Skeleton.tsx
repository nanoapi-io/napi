import { Skeleton } from "@radix-ui/themes";

export function CytoscapeSkeleton() {
  return (
    <div className="h-full flex flex-col justify-center items-center gap-5">
      <Skeleton width="200px" height="75px" />
      <div className="flex gap-5">
        <Skeleton width="200px" height="75px" />
        <Skeleton width="200px" height="75px" />
      </div>
      <div className="flex gap-5">
        <Skeleton width="200px" height="75px" />
        <Skeleton width="200px" height="75px" />
        <Skeleton width="200px" height="75px" />
        <Skeleton width="200px" height="75px" />
      </div>
    </div>
  );
}
