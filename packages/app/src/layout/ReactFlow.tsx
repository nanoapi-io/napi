export default function ReactFlowLayout(props: {
  sideBarSlot?: React.ReactNode;
  chartSlot: React.ReactNode;
}) {

  return (
    <div className="grow flex gap-3 bg-background-light text-text-light dark:bg-background-dark dark:text-text-dark rounded-xl px-4 py-3">
      {props.sideBarSlot && (
        props.sideBarSlot
      )}
      <div className="flex w-full flex-col">
        <div className="relative grow bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl overflow-hidden">
          {props.chartSlot}
        </div>
      </div>
    </div>
  );
}
