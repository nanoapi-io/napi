import {
  Button,
  Dialog,
} from "@radix-ui/themes";
import { useState } from "react";

export default function NewWorkspaceDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button className="text-md font-bold flex gap-x-2 bg-primary-light dark:bg-primary-dark hover:bg-primary-hoverLight dark:hover:bg-primary-hoverDark rounded-lg px-3 py-2.5 transition-all">
          <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="my-auto">
            <path d="M13 3C13 2.44772 12.5523 2 12 2C11.4477 2 11 2.44772 11 3V11H3C2.44772 11 2 11.4477 2 12C2 12.5523 2.44772 13 3 13H11V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V13H21C21.5523 13 22 12.5523 22 12C22 11.4477 21.5523 11 21 11H13V3Z" fill="currentColor"/>
          </svg>
          New Project
        </button>
      </Dialog.Trigger>
      <Dialog.Content className="bg-secondarySurface-light text-text-light dark:bg-secondarySurface-dark dark:text-text-dark border-0">
        <Dialog.Title>
          <div className="flex justify-end">
            <Dialog.Close>
              <Button variant="ghost" className="hover:bg-transparent cursor-pointer">
                <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.7071 7.20711C19.0976 6.81658 19.0976 6.18342 18.7071 5.79289C18.3166 5.40237 17.6834 5.40237 17.2929 5.79289L12 11.0858L6.70711 5.79289C6.31658 5.40237 5.68342 5.40237 5.29289 5.79289C4.90237 6.18342 4.90237 6.81658 5.29289 7.20711L10.5858 12.5L5.29289 17.7929C4.90237 18.1834 4.90237 18.8166 5.29289 19.2071C5.68342 19.5976 6.31658 19.5976 6.70711 19.2071L12 13.9142L17.2929 19.2071C17.6834 19.5976 18.3166 19.5976 18.7071 19.2071C19.0976 18.8166 19.0976 18.1834 18.7071 17.7929L13.4142 12.5L18.7071 7.20711Z" fill="currentColor"/>
                </svg>
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Title>
        <h1 className="text-3xl font-bold text-center p-4">New Project</h1>
        <p className="text-lg text-text-gray text-center pb-3">Create a new project</p>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col gap-y-4 p-4">
            {/* <TextField label="Project Name" placeholder="Enter project name" />
            <TextField label="Description" placeholder="Enter project description" />
            <TextField label="Tags" placeholder="Enter tags" /> */}
            <Button type="submit" className="bg-primary-light dark:bg-primary-dark hover:bg-primary-hoverLight dark:hover:bg-primary-hoverDark rounded-lg px-3 py-2.5 transition-all">
              Create Workspace
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}