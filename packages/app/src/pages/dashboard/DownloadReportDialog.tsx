import {
  Button,
  Dialog,
} from "@radix-ui/themes";
import { useState } from "react";

export default function DownloadReportDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button className="text-md font-bold flex gap-x-2 text-white bg-primary-light dark:bg-primary-dark hover:bg-primary-hoverLight dark:hover:bg-primary-hoverDark rounded-lg px-3 py-2.5 transition-all">
          <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="my-auto">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M3 14C3.55228 14 4 14.4477 4 15V19C4 19.2652 4.10536 19.5196 4.29289 19.7071C4.48043 19.8946 4.73478 20 5 20H19C19.2652 20 19.5196 19.8946 19.7071 19.7071C19.8946 19.5196 20 19.2652 20 19V15C20 14.4477 20.4477 14 21 14C21.5523 14 22 14.4477 22 15V19C22 19.7957 21.6839 20.5587 21.1213 21.1213C20.5587 21.6839 19.7957 22 19 22H5C4.20435 22 3.44129 21.6839 2.87868 21.1213C2.31607 20.5587 2 19.7956 2 19V15C2 14.4477 2.44772 14 3 14Z" fill="currentColor"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M6.29289 9.29289C6.68342 8.90237 7.31658 8.90237 7.70711 9.29289L12 13.5858L16.2929 9.29289C16.6834 8.90237 17.3166 8.90237 17.7071 9.29289C18.0976 9.68342 18.0976 10.3166 17.7071 10.7071L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L6.29289 10.7071C5.90237 10.3166 5.90237 9.68342 6.29289 9.29289Z" fill="currentColor"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C12.5523 2 13 2.44772 13 3V15C13 15.5523 12.5523 16 12 16C11.4477 16 11 15.5523 11 15V3C11 2.44772 11.4477 2 12 2Z" fill="currentColor"/>
          </svg>
          Download Report
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
        <h1 className="text-3xl font-bold text-center p-4">Download Benchmark Report</h1>
        <p className="text-lg text-text-gray text-center pb-3">Create a new report</p>

      </Dialog.Content>
    </Dialog.Root>
  );
}