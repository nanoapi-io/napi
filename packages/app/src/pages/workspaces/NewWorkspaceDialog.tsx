import {
  Button,
  Dialog,
  // TextField
} from "@radix-ui/themes";
import { useState } from "react";

export default function NewWorkspaceDialog() {
  const [open, setOpen] = useState(false);
  // const [workspaceName, setWorkspaceName] = useState("");
  // const [workspaceDescription, setWorkspaceDescription] = useState("");

  // const createNewWorkspace = async (e: any) => {
  //   e.preventDefault();
  //   try {
  //     const response = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/workspaces`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${localStorage.getItem("jwt")}`,
  //       },
  //       body: JSON.stringify({
  //         name: workspaceName,
  //         description: workspaceDescription,
  //       }),
  //     });
  //     if (response.ok) {
  //       console.log("Workspace created successfully");
  //       setWorkspaceName("");
  //       setWorkspaceDescription("");
  //       setOpen(false);
  //       window.location.reload();
  //     } else {
  //       console.error("Failed to create workspace");
  //     }
  //   } catch (error) {
  //     console.error("Failed to create workspace", error);
  //   }
  // };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button className="text-md font-bold flex gap-x-2 text-white bg-primary-light dark:bg-primary-dark hover:bg-primary-hoverLight dark:hover:bg-primary-hoverDark rounded-lg px-3 py-2.5 transition-all">
          <svg
            width="20px"
            height="20px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="my-auto"
          >
            <path
              d="M13 3C13 2.44772 12.5523 2 12 2C11.4477 2 11 2.44772 11 3V11H3C2.44772 11 2 11.4477 2 12C2 12.5523 2.44772 13 3 13H11V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V13H21C21.5523 13 22 12.5523 22 12C22 11.4477 21.5523 11 21 11H13V3Z"
              fill="currentColor"
            />
          </svg>
          New Workspace
        </button>
      </Dialog.Trigger>
      <Dialog.Content className="bg-secondarySurface-light text-text-light dark:bg-secondarySurface-dark dark:text-text-dark border-0">
        <Dialog.Title>
          <div className="flex justify-end">
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
        <h1 className="text-3xl font-bold text-center p-4">👋 Hey there!</h1>
        <p className="text-xl text- text-center pb-5">
          Welcome to the NanoAPI live demo
        </p>
        <p className="text-lg text-text-gray dark:text-white text-center pb-5 px-5">
          This is a live demo prefilled with <b>static</b> data from one of our
          customer's projects, available for you to view and inspect to see how
          our tool works.
        </p>
        <p className="text-lg text-text-gray dark:text-white text-center pb-5 px-5">
          You may notice some functionality is disabled, which is intentional
          for the purpose of keeping this demo clean and clear.
        </p>
        <p className="text-lg text-text-gray dark:text-white text-center pb-5 px-5">
          If you'd like to see these views with your own projects, please reach
          out to our team to schedule a personalized demo at:{" "}
          <a
            href="mailto:info@nanoapi.io?subject=Request for Live Demo"
            target="_blank"
            className="text-primary-light dark:text-primary-dark underline"
          >
            info@nanoapi.io
          </a>
        </p>
        <div className="w-full flex justify-center">
          <Button
            type="submit"
            onClick={() => setOpen(false)}
            className="mt-5 text-lg w-full font-bold bg-primary-light dark:bg-primary-dark hover:bg-primary-hoverLight dark:hover:bg-primary-hoverDark rounded-lg cursor-pointer px-6 py-5 transition-all"
          >
            Continue
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
