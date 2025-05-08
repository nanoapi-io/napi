import { type ReactNode, useContext } from "react";
import { Button } from "../components/shadcn/Button.tsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "../components/shadcn/Breadcrumb.tsx";
import {
  darkTheme,
  lightTheme,
  ThemeContext,
} from "../contexts/ThemeContext.tsx";
import { Link, useParams } from "react-router";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import {
  SidebarProvider,
  SidebarTrigger,
} from "../components/shadcn/Sidebar.tsx";
import Sidebar from "./Sidebar.tsx";

export default function GraphLayout(props: {
  sideBarSlot?: ReactNode;
  graphSlot: ReactNode;
}) {
  const themeContext = useContext(ThemeContext);
  const { file, instance } = useParams();

  return (
    <SidebarProvider defaultOpen={false} className="h-screen w-screen">
      <Sidebar />
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div className="flex items-center py-2 justify-between">
          <div className="flex items-center gap-2 ml-2">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/audit">Project</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {file && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to={`/audit/${encodeURIComponent(file)}`}>
                          {file}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {instance && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink asChild>
                            <Link
                              to={`/audit/${encodeURIComponent(file)}/${
                                encodeURIComponent(instance)
                              }`}
                            >
                              {instance}
                            </Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                      </>
                    )}
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              themeContext.changeTheme(
                themeContext.theme === lightTheme ? darkTheme : lightTheme,
              )}
            className="mr-2"
          >
            {themeContext.theme === lightTheme
              ? <MdDarkMode />
              : <MdLightMode />}
          </Button>
        </div>
        <div className="grow w-full">
          {props.graphSlot}
        </div>
      </div>
    </SidebarProvider>
  );
}
