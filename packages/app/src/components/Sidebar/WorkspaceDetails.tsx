import { useContext, useEffect, useState } from "react";
import { StoreContext } from "../../contexts/StoreContext";
import { Workspace } from "../../types";

export default function WorkspaceDetails() {
  const { state } = useContext(StoreContext);

  const [workspace, setWorkspace] = useState<Workspace>({ 
    name: "Default", 
    users: [] ,
    id: 0,
    projects: [],
    settings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    const userData = state.user;
    if (!userData) {
      return;
    }

    if (state.activeWorkspace) {
      setWorkspace(state.activeWorkspace);
    }
  }, [state.activeWorkspace, state.user]);

  return (
    <div className="px-4 py-4 bg-gray-200 dark:bg-[#212047] rounded-lg mt-4 border-[1px] border-gray-300 dark:border-[#35345B]">
      <h2 className="font-bold text-gray-500 dark:text-white">{workspace.name} Workspace</h2>
      <div className="flex gap-x-2 border-b-[1px] border-gray-300 dark:border-[#2B2A51] pt-2 pb-3">
        {/* IMG */}
        <div className="flex">
          {workspace.users[0] && <img className="w-6 h-6 rounded-full border-[1px] border-secondaryBackground-light dark:border-foreground-dark" src={workspace.users[0].avatar} alt="Profile" />}
          {workspace.users[1] && <img className="w-6 h-6 ml-[-6px] rounded-full border-[1px] border-foreground-light dark:border-foreground-dark" src={workspace.users[1].avatar} alt="Profile" />}
          {workspace.users[2] && <img className="w-6 h-6 ml-[-6px] rounded-full border-[1px] border-foreground-light dark:border-foreground-dark" src={workspace.users[2].avatar} alt="Profile" />}
        </div>
        <p className="text-text-lightInfo dark:text-text-darkInfo text-sm">{workspace.users.length} {workspace.users.length === 1 ? "member" : "members"}</p>
      </div>

      {/* Invite teammates */}
      <button className="flex text-text-gray w-full mt-2 p-2 gap-x-2 rounded-lg hover:bg-gray-300 dark:hover:bg-hover-dark transition-all">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M6.35861 12.7691C4.92484 11.6727 4 9.94433 4 8C4 4.68629 6.68629 2 10 2C13.3137 2 16 4.68629 16 8C16 9.94433 15.0752 11.6727 13.6414 12.7691C14.479 13.1397 15.2595 13.6379 15.9535 14.25C16.3677 14.6153 16.4073 15.2473 16.0419 15.6615C15.6766 16.0756 15.0447 16.1152 14.6305 15.7499C13.6202 14.8587 12.3741 14.278 11.0419 14.0775C10.7144 14.0282 10.3851 14.0024 10.0564 13.9997L10 14L9.94361 13.9997C8.97355 14.0076 8.01151 14.217 7.12002 14.6194C5.89211 15.1737 4.85024 16.0705 4.11943 17.2023C3.38862 18.3341 2.99993 19.6527 3 20.9999C3.00003 21.5522 2.55234 21.9999 2.00005 22C1.44777 22 1.00003 21.5523 1 21C0.999905 19.2679 1.49965 17.5725 2.43926 16.1174C3.37888 14.6622 4.71843 13.5092 6.29717 12.7965L6.35861 12.7691ZM6 8C6 5.79086 7.79086 4 10 4C12.2091 4 14 5.79086 14 8C14 10.1917 12.2374 11.9716 10.0524 11.9997C10.0175 11.9995 9.98255 11.9995 9.94766 11.9997C7.76264 11.9716 6 10.1917 6 8Z" fill="currentColor"/>
          <path d="M19 15C19.5523 15 20 15.4477 20 16V18H22C22.5523 18 23 18.4477 23 19C23 19.5523 22.5523 20 22 20H20V22C20 22.5523 19.5523 23 19 23C18.4477 23 18 22.5523 18 22V20H16C15.4477 20 15 19.5523 15 19C15 18.4477 15.4477 18 16 18H18V16C18 15.4477 18.4477 15 19 15Z" fill="currentColor"/>
        </svg>
        <p className="text-md">Invite teammates</p>

      </button>
    </div>
  )
}