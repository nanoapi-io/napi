export type Project = {
  id: string;
  name: string;
  updatedAt: Date;
  viewedAt: Date;
  language: string;
}

export default function ProjectCard(project: Project) {
  return (
    <div className="relative flex flex-col bg-[#212047] rounded-lg border-[1px] border-[#2B2A51] cursor-pointer hover:shadow-lg hover:mt-[-2px] transition-all">
      <div className="absolute top-4 right-4 border-[1px] bg-[#212047] border-[#35345B] rounded-xl hover:bg-[#00000005]">
        <button className="px-2 py-1">. . .</button>
      </div>
      <div className="flex justify-center h-[128px] bg-[#00000033]">
        <h1 className="my-auto">{project.language}</h1>
      </div>
      <div className="h-[128px] flex flex-col p-4 gap-y-2.5">
        <h2 className="text-xl font-bold">{project.name}</h2>
        <p className="text-[#7775AC] pb-1">Edited・{project.updatedAt.toDateString()}</p>
        <div className="flex gap-x-3">
          {/* Profile or org photo */}
          <img className="w-6 h-6 rounded-full" src="https://randomuser.me/api/portraits/men/75.jpg" alt="Profile" />
          <p className="font-semibold">Viewed: {project.viewedAt.toDateString()}</p>
        </div>
      </div>
    </div>
  )
}