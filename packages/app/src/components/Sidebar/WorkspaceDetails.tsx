import { useContext, useEffect, useState } from "react";
import InviteUserDialog from "../InviteUserDialog";
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
      <InviteUserDialog type="sidebar" />
    </div>
  )
}