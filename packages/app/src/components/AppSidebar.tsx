

export default function AppSidebar() {
  return (
    <div className="bg-[#15143D] w-64 p-4 rounded-xl">
      {/* Header */}
      <div className="flex justify-between">
        <div className="flex gap-x-3">
          <h1 className="text-xl font-bold">NanoAPI</h1>
        </div>
      </div>

      {/* Workspace info */}
      <div className="px-4 py-4 bg-[#212047] rounded-lg mt-4">
        <h2 className="font-bold">Alex's Workspace</h2>
        <div className="flex gap-x-2 border-b-[1px] border-[#2B2A51] pb-3">
          {/* IMG */}
          <p className="text-[#7775AC] text-sm">2 members</p>
        </div>
      </div>

      {/* Navigation */}
    </div>
  );
}