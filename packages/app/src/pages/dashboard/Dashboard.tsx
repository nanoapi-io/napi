import ChangeThemeButton from "../../components/ChangeThemeButton"
import DownloadReportDialog from "./DownloadReportDialog"
import AccountMenu from "../../components/AccountMenu"

export default function Dashboard() {


  return (
    <div className="w-full text-text-light dark:text-white bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl flex flex-col">
      {/* Top bar with project search on the left and the account icon on the right */}
      <div className="flex justify-between p-2 border-b-[1px] border-foreground-light dark:border-foreground-dark">
        <div></div>
        <div className="flex gap-x-2">
          <ChangeThemeButton />
          <DownloadReportDialog />
          <AccountMenu />
        </div>
      </div>
    </div>
  )
}