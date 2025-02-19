import { Button, Dialog } from '@radix-ui/themes';
import { LuTrash2, LuUser } from 'react-icons/lu';
import { Invite } from '../../types';
import { useState } from 'react';

export default function InviteRow(props: {
  invite: Invite;
}
) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { invite } = props;

  const deleteInvite = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/invitations/${invite.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete invite");
      }

      console.log("Invite deleted");
      setLoading(false);
      setOpen(false);
    }
    catch (error) {
      console.error("Failed to delete invite", error);
    }
  }

  return (
    <div key={invite.uuid} className="flex items-center justify-between gap-x-2 px-2 py-3 border-b-[1px] border-gray-200 dark:border-foreground-dark">
      <div className="flex items-center gap-x-2">
        <LuUser className="w-8 h-8 text-gray-500 dark:text-text-darkInfo"/>
        <p>{invite.email}</p>
      </div>
      <div className="flex gap-x-4">
        <div className="my-auto">
          <p className="text-gray-400 text-sm px-2">Invite sent</p>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger>
            <Button 
              variant="ghost" 
              size="3" 
              className="px-2 mr-1 my-auto text-red-600 hover:bg-hover-dark hover:cursor-pointer disabled:text-gray-400 dark:disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-default">
              <LuTrash2 className="w-5 h-5" />
            </Button>
          </Dialog.Trigger>
          <Dialog.Content className='bg-secondarySurface-light text-text-light dark:bg-secondarySurface-dark dark:text-text-dark border-0'>
          <Dialog.Title>
            <div className="flex justify-between">
              <div>Remove User</div>
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
            <Dialog.Description className='pb-7 pt-4'>
              Are you sure you want to delete the invite for {invite.email}?
            </Dialog.Description>
            <div className='flex justify-end gap-x-1'>
              <Button 
                variant="outline"
                type='button'
                className='cursor-pointer'
                onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                type='button'
                loading={loading}
                className="cursor-pointer bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 transition-all"
                onClick={() => deleteInvite()}
              >
                Remove
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </div>
  )
}