import { Button, Dialog } from "@radix-ui/themes";
import { useState } from "react";

import {
  redirectToBitbucketOAuth,
  redirectToGitHubOAuth,
  redirectToGitLabOAuth,
} from "../service/oauth";

export default function LoginDialog() {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <div className="flex bg-transparent hover:bg-hover-light dark:hover:bg-hover-dark rounded-lg border-[1px] border-primary-light dark:border-primary-dark transition-all">
          <button className="flex gap-x-3 items-center px-4 my-auto">
            <p className="text-primary-light dark:text-primary-dark">Log in</p>
          </button>
        </div>
      </Dialog.Trigger>
      <Dialog.Content className="bg-secondarySurface-light text-text-light dark:bg-secondarySurface-dark dark:text-text-dark border-0">
        <Dialog.Title>
          <div className="flex justify-between">
            <div>Log in</div>
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
        <h1 className="text-3xl font-bold text-center p-4">
          Select your Git Provider
        </h1>
        <p className="text-text-gray text-center pb-3">
          Choose a provider to login or create a new account.
        </p>
        <div className="flex justify-center gap-x-4 font-bold text-lg mt-5">
          <button
            onClick={() => redirectToGitHubOAuth()}
            className="flex justify-center bg-[#5848E80D] gap-x-1.5 p-3 rounded-md border-[1px] border-search-bgLight dark:border-search-bgDark hover:bg-hover-light dark:hover:bg-hover-dark transition-all grow"
          >
            <svg
              width="25"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="my-auto"
            >
              <path
                d="M12.833 2C11.5198 2 10.2194 2.25866 9.00617 2.7612C7.79292 3.26375 6.69053 4.00035 5.76194 4.92893C3.88658 6.8043 2.83301 9.34784 2.83301 12C2.83301 16.42 5.70301 20.17 9.67301 21.5C10.173 21.58 10.333 21.27 10.333 21V19.31C7.56301 19.91 6.97301 17.97 6.97301 17.97C6.51301 16.81 5.86301 16.5 5.86301 16.5C4.95301 15.88 5.93301 15.9 5.93301 15.9C6.93301 15.97 7.46301 16.93 7.46301 16.93C8.33301 18.45 9.80301 18 10.373 17.76C10.463 17.11 10.723 16.67 11.003 16.42C8.78301 16.17 6.45301 15.31 6.45301 11.5C6.45301 10.39 6.83301 9.5 7.48301 8.79C7.38301 8.54 7.03301 7.5 7.58301 6.15C7.58301 6.15 8.42301 5.88 10.333 7.17C11.123 6.95 11.983 6.84 12.833 6.84C13.683 6.84 14.543 6.95 15.333 7.17C17.243 5.88 18.083 6.15 18.083 6.15C18.633 7.5 18.283 8.54 18.183 8.79C18.833 9.5 19.213 10.39 19.213 11.5C19.213 15.32 16.873 16.16 14.643 16.41C15.003 16.72 15.333 17.33 15.333 18.26V21C15.333 21.27 15.493 21.59 16.003 21.5C19.973 20.16 22.833 16.42 22.833 12C22.833 10.6868 22.5744 9.38642 22.0718 8.17317C21.5693 6.95991 20.8327 5.85752 19.9041 4.92893C18.9755 4.00035 17.8731 3.26375 16.6598 2.7612C15.4466 2.25866 14.1462 2 12.833 2Z"
                fill="white"
              />
            </svg>
            <p>GitHub</p>
          </button>
          <button
            onClick={() => redirectToGitLabOAuth()}
            className="flex justify-center bg-[#5848E80D] gap-x-2 p-3 rounded-md border-[1px] border-search-bgLight dark:border-search-bgDark  hover:bg-hover-light dark:hover:bg-hover-dark transition-all grow"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="my-auto"
            >
              <g clip-path="url(#clip0_132_11260)">
                <path
                  d="M23.3915 9.63413L23.3584 9.54938L20.1506 1.17788C20.0853 1.01378 19.9697 0.874561 19.8204 0.780193C19.6711 0.687415 19.4968 0.642717 19.3213 0.65214C19.1457 0.661562 18.9772 0.724651 18.8387 0.832881C18.7018 0.944365 18.6025 1.09515 18.554 1.26488L16.3882 7.89151H7.61792L5.45192 1.26488C5.40484 1.09422 5.30526 0.942696 5.1673 0.831756C5.02873 0.723526 4.86028 0.660437 4.68471 0.651015C4.50913 0.641592 4.3349 0.68629 4.18555 0.779069C4.03659 0.873824 3.92111 1.01291 3.85536 1.17676L0.641609 9.54451L0.609734 9.62926C-0.338828 12.1078 0.466672 14.9153 2.58542 16.5135L2.59648 16.5221L2.62592 16.5429L7.51236 20.2022L9.9298 22.0318L11.4024 23.1437C11.5747 23.2745 11.785 23.3454 12.0013 23.3454C12.2176 23.3454 12.4279 23.2745 12.6002 23.1437L14.0728 22.0318L16.4902 20.2022L21.4061 16.5208L21.4183 16.5111C23.532 14.9124 24.3362 12.1101 23.3915 9.63413Z"
                  fill="#E24329"
                />
                <path
                  d="M23.3916 9.63407L23.3584 9.54932C21.7954 9.87021 20.3225 10.5323 19.0449 11.4883L12 16.8153C14.3991 18.6303 16.4876 20.2072 16.4876 20.2072L21.4035 16.5258L21.4157 16.5161C23.5328 14.9173 24.3381 12.1121 23.3916 9.63407Z"
                  fill="#FC6D26"
                />
                <path
                  d="M7.5127 20.2071L9.93013 22.0367L11.4028 23.1486C11.575 23.2794 11.7853 23.3502 12.0016 23.3502C12.2179 23.3502 12.4283 23.2794 12.6005 23.1486L14.0731 22.0367L16.4906 20.2071C16.4906 20.2071 14.3996 18.6253 12.0005 16.8152C10.5036 17.9446 9.00771 19.0752 7.5127 20.2071Z"
                  fill="#FCA326"
                />
                <path
                  d="M4.95373 11.4884C3.67733 10.5303 2.20476 9.8665 0.641609 9.54456L0.609734 9.62931C-0.338828 12.1079 0.466672 14.9153 2.58542 16.5136L2.59648 16.5222L2.62592 16.543L7.51236 20.2022L12 16.8104L4.95373 11.4884Z"
                  fill="#FC6D26"
                />
              </g>
              <defs>
                <clipPath id="clip0_132_11260">
                  <rect width="24" height="24" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <p>GitLab</p>
          </button>
          <button
            onClick={() => redirectToBitbucketOAuth()}
            className="flex justify-center bg-[#5848E80D] gap-x-1.5 p-3 rounded-md border-[1px] border-search-bgLight dark:border-search-bgDark  hover:bg-hover-light dark:hover:bg-hover-dark transition-all grow"
          >
            <svg
              width="25"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="my-auto"
            >
              <path
                d="M4.24402 3.75C3.8844 3.75 3.61496 4.07963 3.67421 4.40925L6.10233 19.2759C6.16233 19.6656 6.49177 19.935 6.8814 19.935H18.6301C18.9005 19.935 19.1401 19.725 19.2001 19.4554L21.6581 4.43925C21.7173 4.07963 21.4479 3.78 21.0883 3.78L4.24402 3.75ZM14.5543 14.4801H10.808L9.8184 9.17512H15.4837L14.5543 14.4801Z"
                fill="#2684FF"
              />
              <path
                d="M20.8482 9.17517H15.4535L14.5539 14.4801H10.8076L6.40137 19.7249C6.40137 19.7249 6.61137 19.905 6.91118 19.905H18.6599C18.9301 19.905 19.1697 19.695 19.2297 19.4254L20.8482 9.17517Z"
                fill="url(#paint0_linear_132_11270)"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_132_11270"
                  x1="22.1105"
                  y1="10.6695"
                  x2="13.1697"
                  y2="17.649"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0.176" stop-color="#0052CC" />
                  <stop offset="1" stop-color="#2684FF" />
                </linearGradient>
              </defs>
            </svg>
            <p>BitBucket</p>
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
