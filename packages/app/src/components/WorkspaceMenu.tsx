import { DropdownMenu } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
// import { NewWorkspaceDialog } from './NewWorkspaceDialog';

export default function WorkspaceMenu() {
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    const userData: string | null = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setWorkspaces(user.workspaces);
    }
  }, []);

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button className={`mt-auto flex gap-x-2 p-2 rounded-lg  text-gray-light dark:text-gray-dark bg-search-bgLight dark:bg-search-bgDark px-3 py-2.5 mb-2 border-[1px] border-search-bgLight dark:border-search-bgDark hover:bg-hover-dark dark:hover:bg-hover-light transition-all`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M5 4C4.73478 4 4.48043 4.10536 4.29289 4.29289C4.10536 4.48043 4 4.73478 4 5V19C4 19.2652 4.10536 19.5196 4.29289 19.7071C4.48043 19.8946 4.73478 20 5 20H9C9.55228 20 10 20.4477 10 21C10 21.5523 9.55228 22 9 22H5C4.20435 22 3.44129 21.6839 2.87868 21.1213C2.31607 20.5587 2 19.7956 2 19V5C2 4.20435 2.31607 3.44129 2.87868 2.87868C3.44129 2.31607 4.20435 2 5 2H9C9.55228 2 10 2.44772 10 3C10 3.55228 9.55228 4 9 4H5Z" fill="currentColor"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M15.2929 6.29289C15.6834 5.90237 16.3166 5.90237 16.7071 6.29289L21.7071 11.2929C22.0976 11.6834 22.0976 12.3166 21.7071 12.7071L16.7071 17.7071C16.3166 18.0976 15.6834 18.0976 15.2929 17.7071C14.9024 17.3166 14.9024 16.6834 15.2929 16.2929L19.5858 12L15.2929 7.70711C14.9024 7.31658 14.9024 6.68342 15.2929 6.29289Z" fill="currentColor"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M8 12C8 11.4477 8.44772 11 9 11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H9C8.44772 13 8 12.5523 8 12Z" fill="currentColor"/>
            </svg>
            <p className="text-md">Switch workspace</p>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content variant='soft' className='bg-foreground-light dark:bg-foreground-dark mt-1.5'>
          {workspaces.map((workspace: any) => (
            <DropdownMenu.Item key={workspace.id} className='hover:bg-hover-dark'>
              <button className='w-full text-left text-lg'>{workspace.name}</button>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator />
          <DropdownMenu.Item className='hover:bg-hover-dark'>
            <button className='w-full flex text-text-gray text-md gap-x-2' onClick={(e) => e.preventDefault()}>
              <svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="my-auto">
                <path d="M13 3C13 2.44772 12.5523 2 12 2C11.4477 2 11 2.44772 11 3V11H3C2.44772 11 2 11.4477 2 12C2 12.5523 2.44772 13 3 13H11V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V13H21C21.5523 13 22 12.5523 22 12C22 11.4477 21.5523 11 21 11H13V3Z" fill="currentColor"/>
              </svg>
              Manage Workspaces
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </>
  )
}