import ChangeThemeButton from "../components/ChangeThemeButton";

export default function ReactFlowLayout(props: {
  sideBarSlot?: React.ReactNode;
  chartSlot: React.ReactNode;
}) {

  return (
    <div className="h-screen grow flex gap-3 bg-background-light text-text-light dark:bg-background-dark dark:text-text-dark px-4 py-3">
      {props.sideBarSlot && (
        <div className="flex flex-col gap-2 bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-3xl px-2 py-2">
          {props.sideBarSlot}
        </div>
      )}
      <div className="flex w-full flex-col gap-2">
        <div className="bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-3xl flex justify-between items-center px-2 py-2 ">
          <a
            className="flex items-center gap-1 text-gray-light dark:text-gray-dark no-underline	"
            href="https://nanoapi.io"
            target="_blank"
          >
            <img src="/logo.png" alt="logo" className="w-8 h-8" />
            <span className="text-xl font-bold">NanoAPI</span>
          </a>
          <ChangeThemeButton />
        </div>
        <div className="relative grow bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-3xl overflow-hidden">
          {props.chartSlot}
        </div>
      </div>
    </div>
  );
}
