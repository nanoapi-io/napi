import { Button } from "@radix-ui/themes";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 bg-[#6C5CE7] flex items-center justify-between drop-shadow-lg">
        <a
          className="flex items-center gap-1"
          href="https://nanoapi.io"
          target="_blank"
        >
          <img src="/logo.png" alt="logo" className="w-20 h-20" />
          <span className="text-3xl text-white">NanoAPI</span>
        </a>
        <a href="https://docs.nanoapi.io" target="_blank">
          <Button color="plum">Documentation</Button>
        </a>
      </div>
      <div className="flex-grow bg-[#F5F5F5] px-5 py-3">{children}</div>
    </div>
  );
}
