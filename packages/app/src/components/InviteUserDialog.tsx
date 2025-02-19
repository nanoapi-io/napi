import {
  Button,
  Dialog,
  TextField,
  ScrollArea,
  DropdownMenu,
  Spinner
} from "@radix-ui/themes";
import { LuTrash2, LuUser } from "react-icons/lu"
import { useState, useContext, useEffect } from "react";
import { StoreContext } from "../contexts/StoreContext";
import { User } from "../types";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

type UsersAndInvites = User & { uuid: string };

export default function InviteUserDialog(props: {
  type: "sidebar" | "workspace";
}) {
  const { state } = useContext(StoreContext);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState<UsersAndInvites[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UsersAndInvites[]>([]);

  const loadWorkspaceUsers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/users/workspace/${state.activeWorkspace?.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch workspace users");
      }

      // Takes the shape of { users, invites }
      const usersData = await response.json();
      setUsers([...usersData.users, ...usersData.invites]);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch workspace users", error);
    }
  }

  const sendWorkspaceInvite = async (e: any, email: string) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: JSON.stringify({ 
          email,
          workspaceId: state.activeWorkspace?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send workspace invite");
      }

      console.log("Workspace invite sent successfully");
    }
    catch (error) {
      console.error("Failed to send workspace invite", error);
    }
  }

  useEffect(() => {
    if (userSearch === "") {
      setFilteredUsers(users);
      return;
    }

    const filteredUsers = users.filter((user) =>
      user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    setFilteredUsers(filteredUsers);
  }, [userSearch, users]);

  useEffect(() => {
    if (state.activeWorkspace && open) {
      loadWorkspaceUsers();
    }
  }, [state.activeWorkspace, open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        {props.type === "sidebar" && <button className="flex text-text-gray w-full mt-2 p-2 gap-x-2 rounded-lg hover:bg-gray-300 dark:hover:bg-hover-dark transition-all">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M6.35861 12.7691C4.92484 11.6727 4 9.94433 4 8C4 4.68629 6.68629 2 10 2C13.3137 2 16 4.68629 16 8C16 9.94433 15.0752 11.6727 13.6414 12.7691C14.479 13.1397 15.2595 13.6379 15.9535 14.25C16.3677 14.6153 16.4073 15.2473 16.0419 15.6615C15.6766 16.0756 15.0447 16.1152 14.6305 15.7499C13.6202 14.8587 12.3741 14.278 11.0419 14.0775C10.7144 14.0282 10.3851 14.0024 10.0564 13.9997L10 14L9.94361 13.9997C8.97355 14.0076 8.01151 14.217 7.12002 14.6194C5.89211 15.1737 4.85024 16.0705 4.11943 17.2023C3.38862 18.3341 2.99993 19.6527 3 20.9999C3.00003 21.5522 2.55234 21.9999 2.00005 22C1.44777 22 1.00003 21.5523 1 21C0.999905 19.2679 1.49965 17.5725 2.43926 16.1174C3.37888 14.6622 4.71843 13.5092 6.29717 12.7965L6.35861 12.7691ZM6 8C6 5.79086 7.79086 4 10 4C12.2091 4 14 5.79086 14 8C14 10.1917 12.2374 11.9716 10.0524 11.9997C10.0175 11.9995 9.98255 11.9995 9.94766 11.9997C7.76264 11.9716 6 10.1917 6 8Z" fill="currentColor"/>
            <path d="M19 15C19.5523 15 20 15.4477 20 16V18H22C22.5523 18 23 18.4477 23 19C23 19.5523 22.5523 20 22 20H20V22C20 22.5523 19.5523 23 19 23C18.4477 23 18 22.5523 18 22V20H16C15.4477 20 15 19.5523 15 19C15 18.4477 15.4477 18 16 18H18V16C18 15.4477 18.4477 15 19 15Z" fill="currentColor"/>
          </svg>
          <p className="text-md">Invite teammates</p>
        </button>}
      </Dialog.Trigger>
      <Dialog.Content className="bg-secondarySurface-light text-text-light dark:bg-secondarySurface-dark dark:text-text-dark border-0">
        <Dialog.Title>
          <div className="flex justify-between">
            <div>Manage Users</div>
            <Dialog.Close>
              <Button
                variant="ghost"
                className="hover:bg-transparent cursor-pointer"
              >
                <svg
                  width="24"
                  height="25"
                  viewBox="0 0 24 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.7071 7.20711C19.0976 6.81658 19.0976 6.18342 18.7071 5.79289C18.3166 5.40237 17.6834 5.40237 17.2929 5.79289L12 11.0858L6.70711 5.79289C6.31658 5.40237 5.68342 5.40237 5.29289 5.79289C4.90237 6.18342 4.90237 6.81658 5.29289 7.20711L10.5858 12.5L5.29289 17.7929C4.90237 18.1834 4.90237 18.8166 5.29289 19.2071C5.68342 19.5976 6.31658 19.5976 6.70711 19.2071L12 13.9142L17.2929 19.2071C17.6834 19.5976 18.3166 19.5976 18.7071 19.2071C19.0976 18.8166 19.0976 18.1834 18.7071 17.7929L13.4142 12.5L18.7071 7.20711Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Title>
          <div className="w-full flex gap-x-1">
            <TextField.Root 
              id="projectName"
              size="3" 
              placeholder="Type name to search or email to invite..." 
              value={userSearch} 
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full">
              <TextField.Slot>
                <svg width="20px" height="20px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none" className="my-auto">
                  <path fill="currentColor" fill-rule="evenodd" d="M4 9a5 5 0 1110 0A5 5 0 014 9zm5-7a7 7 0 104.2 12.6.999.999 0 00.093.107l3 3a1 1 0 001.414-1.414l-3-3a.999.999 0 00-.107-.093A7 7 0 009 2z"/>
                </svg>
              </TextField.Slot>
              <TextField.Slot>
                <Button 
                  size="1" 
                  className={`cursor-pointer disabled:cursor-default disabled:text-gray-400 bg-primary-dark hover:bg-primary-hoverDark disabled:bg-gray-300 dark:bg-primary-dark dark:hover:bg-primary-hoverDark dark:disabled:bg-transparent`}
                  disabled={
                    filteredUsers.length > 0 || !EMAIL_REGEX.test(userSearch)
                  }
                  onClick={(e) => sendWorkspaceInvite(e, userSearch)}>
                  Invite
                </Button>
              </TextField.Slot>
            </TextField.Root>
          </div>
          <ScrollArea type="hover" scrollbars="vertical" className="h-[300px] pt-1">
            {/* List of users */}
            <Spinner loading={loading}>
              {filteredUsers.map((user) => {

                if (user.uuid) return (
                  <div key={user.uuid} className="flex items-center justify-between gap-x-2 px-2 py-3 border-b-[1px] border-gray-200 dark:border-foreground-dark">
                    <div className="flex items-center gap-x-2">
                      <LuUser className="w-8 h-8 text-gray-500 dark:text-text-darkInfo"/>
                      <p>{user.email}</p>
                    </div>
                    <div className="flex gap-x-4">
                      <div className="my-auto">
                        <p className="text-gray-400 text-sm px-2">Invite sent</p>
                      </div>
                      <Button variant="ghost" size="3" className="px-2 mr-1 my-auto text-red-600 hover:bg-hover-dark hover:cursor-pointer">
                        <LuTrash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )
                
                return (
                <div key={user.id} className="flex items-center justify-between gap-x-2 px-2 py-3 border-b-[1px] border-gray-200 dark:border-foreground-dark">
                  <div className="flex items-center gap-x-2">
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                    <p>{user.name}</p>
                  </div>
                  <div className="flex gap-x-4">
                    <div className="my-auto">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                          <button className="flex border-none text-primary-dark dark:text-purple-400 hover:bg-hover-dark text-sm px-2 rounded-md">
                            Admin
                            <DropdownMenu.TriggerIcon className="ml-1 mt-1" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content variant='soft' className='bg-foreground-light dark:bg-foreground-dark mt-1.5' size='2'>
                          <DropdownMenu.Item>ADMIN</DropdownMenu.Item>
                          <DropdownMenu.Item>USER</DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="3" 
                      disabled={user.userWorkspaceRole?.isOwner}
                      className="px-2 mr-1 my-auto text-red-600 hover:bg-hover-dark hover:cursor-pointer">
                      <LuTrash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )})}
            </Spinner>
          </ScrollArea>
      </Dialog.Content>
    </Dialog.Root>
  );
}