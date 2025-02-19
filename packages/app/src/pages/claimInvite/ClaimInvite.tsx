import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Dialog, Spinner } from "@radix-ui/themes";
import { Invite } from "../../types";

export default function ClaimInvite() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);
  const { inviteUuid } = useParams();

  const loadWorkspaceInviteDetails = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/invitations/${inviteUuid}`);

      if (!response.ok) {
        throw new Error("Failed to fetch invitation details");
      }

      const inviteJson = await response.json();
      console.log(invite);
      setInvite(inviteJson);
      setLoading(false);
      setOpen(true);
    } catch (error) {
      console.error("Failed to fetch invitation details", error);
    }
  }

  const claimWorkspaceInvite = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/invitations/${inviteUuid}/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to claim invitation");
      }

      console.log("Invitation claimed");
    } catch (error) {
      console.error("Failed to claim invitation", error);
    }
  }

  useEffect(() => {
    loadWorkspaceInviteDetails();
  }, []);

  return (
    <div className="flex flex-col gap-y-4 min-h-screen text-text-gray dark:text-white bg-background-light dark:bg-background-dark p-2 justify-center items-center">
      <h1 className="text-4xl font-bold">Workspace Invite</h1>
      <p className="text-text-gray">One moment while we load the workspace details...</p>
      <Spinner loading={loading}/>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Title>
            <div className="flex justify-between">
              <div>Workspace Invite</div>
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <p className="text-center pt-5">You are being invited to join a workspace:</p>
          </Dialog.Description>
          <div className="flex flex-col items-center gap-x-2">
            <h1 className="text-2xl font-bold my-5">{invite?.workspace?.name || "Test"}</h1>
            <p className="mb-3">{invite?.workspace?.users.length} workspace members</p>
            <div className="flex p-3 justify-center">
              {invite?.workspace?.users[0] && <img className="w-10 h-10 rounded-full border-[1px] border-secondaryBackground-light dark:border-foreground-dark" src={invite?.workspace.users[0].avatar} alt="Profile" />}
              {invite?.workspace?.users[1] && <img className="w-10 h-10 ml-[-6px] rounded-full border-[1px] border-foreground-light dark:border-foreground-dark" src={invite?.workspace.users[1].avatar} alt="Profile" />}
              {invite?.workspace?.users[2] && <img className="w-10 h-10 ml-[-6px] rounded-full border-[1px] border-foreground-light dark:border-foreground-dark" src={invite?.workspace.users[2].avatar} alt="Profile" />}
            </div>

            <div className='flex self-end gap-x-1'>
              <Button 
                variant="outline"
                type='button'
                className='cursor-pointer'
                onClick={() => navigate('/dashboard')}>Return home</Button>
              <Button
                type='button'
                loading={loading}
                className="cursor-pointer bg-primary-dark hover:bg-primary-hoverDark transition-all"
                onClick={() => claimWorkspaceInvite()}
              >
                Join
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}