import { useEffect, useState } from "react";
import { Table } from "@radix-ui/themes";

import AccountMenu from "../../components/AccountMenu";
import NewWorkspaceDialog from "./NewWorkspaceDialog";
import ChangeThemeButton from "../../components/ChangeThemeButton";
import { Workspace } from "../../types";
import WorkspaceRow from "./WorkspaceRow";

export default function WorkspacesList() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const getWorkspaces = async () => {
    // Fetch workspaces
    const workspaceRes = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/workspaces`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwt")}`,
      },
    });
    const workspacesPages = await workspaceRes.json();

    const wsData = workspacesPages.data;

    setWorkspaces(wsData);
    setLoading(false);
  }

  useEffect(() => {
    getWorkspaces();
  }, []);

  // Filter the projects based on the search text
  useEffect(() => {
    
  }, [searchText]);

  return (
    <div className="w-full text-text-light dark:text-white bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl flex flex-col">
      {/* Top bar with project search on the left and the account icon on the right */}
      <div className="flex justify-between p-2 border-b-[1px] border-foreground-light dark:border-foreground-dark">
        <div className="flex text-gray-light dark:text-gray-dark bg-search-bgLight dark:bg-search-bgDark rounded-lg px-3 py-2.5 gap-x-2 border-[1px] border-search-bgLight dark:border-search-bgDark dark:focus-within:border-borderDarkHighlight focus-within:border-borderLightHighlight">
          <svg width="20px" height="20px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none" className="my-auto">
            <path fill="currentColor" fill-rule="evenodd" d="M4 9a5 5 0 1110 0A5 5 0 014 9zm5-7a7 7 0 104.2 12.6.999.999 0 00.093.107l3 3a1 1 0 001.414-1.414l-3-3a.999.999 0 00-.107-.093A7 7 0 009 2z"/>
          </svg>
          <input 
            type="text" 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search for projects"
            className="bg-[#2C2C50] min-w-72 focus:ring-0 focus:outline-none" />
        </div>
        <div className="flex gap-x-2">
          <ChangeThemeButton />
          <NewWorkspaceDialog />
          <AccountMenu />
        </div>
      </div>
      <div className="grow flex flex-col p-4">
        <div className="flex flex-col gap-y-2">
          <h1 className="text-2xl font-bold">My Workspaces</h1>
          <p className="text-text-gray">View and manage workspaces you have access to</p>
        </div>
        <div className="pt-4 pb-3">
          <div><p>All | Oldest | Latest</p></div>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : workspaces.length > 0 || searchText ? (
          <Table.Root size="3" variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Members</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Projects</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Settings</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {workspaces.map((ws: Workspace) => (
                <WorkspaceRow key={ws.id} workspace={ws} />
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          <div className="w-full h-max flex flex-col justify-center items-center gap-y-3 grow">
            <img src="/svg/empty-projects.svg" alt="" />
            <h1 className="text-2xl font-semibold">You have no workspaces yet...</h1>
            <p className="text-text-gray pb-2">Create a workspace to get started</p>
            <NewWorkspaceDialog />
          </div>
        )}
      </div>
    </div>
  );
}