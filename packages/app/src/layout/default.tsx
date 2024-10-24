export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background-dark text-text-dark">
      <div className="px-5 flex items-center gap-5">
        <a
          className="flex items-center gap-1 text-gray-dark no-underline	"
          href="https://nanoapi.io"
          target="_blank"
        >
          <img src="/logo.png" alt="logo" className="w-20 h-20" />
          <span className="text-3xl">NanoAPI</span>
        </a>
        <a
          href="https://nanoapi.io/docs"
          target="_blank"
          className="text-gray-dark no-underline hover:underline"
        >
          Documentation
        </a>
        <a
          href="https://nanoapi.io/docs/faqs"
          target="_blank"
          className="text-gray-dark no-underline hover:underline"
        >
          Help
        </a>
      </div>
      <div className="flex-grow px-5">{children}</div>
    </div>
  );
}
