import { useContext } from "react";
import { Button } from "@radix-ui/themes";
import {
  ThemeContext,
  lightTheme,
  darkTheme,
} from "../contexts/ThemeContext.js";
import { Link, useParams } from "react-router";
import { MdLightMode, MdDarkMode, MdKeyboardArrowRight } from "react-icons/md";

enum ViewType {
  PROJECT = "project",
  FILE = "file",
  INSTANCE = "instance",
}

export default function GraphLayout(props: {
  sideBarSlot?: React.ReactNode;
  graphSlot: React.ReactNode;
}) {
  const themeContext = useContext(ThemeContext);
  const { file, instance } = useParams();

  let currentView: ViewType;
  if (file && instance) {
    currentView = ViewType.INSTANCE;
  } else if (file) {
    currentView = ViewType.FILE;
  } else {
    currentView = ViewType.PROJECT;
  }

  return (
    <div className="h-screen grow flex gap-3 bg-background-light text-text-light dark:bg-background-dark dark:text-text-dark px-4 py-3">
      {props.sideBarSlot && (
        <div className="flex flex-col gap-2 bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl px-2 py-2">
          {props.sideBarSlot}
        </div>
      )}
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out">
        <div
          className={`bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl rounded-b-none flex items-center px-2 py-2 ${currentView === ViewType.PROJECT ? "justify-end" : "justify-between"}`}
        >
          <div
            className={`flex items-center space-x-2 ml-5 overflow-hidden ${currentView === ViewType.PROJECT ? "hidden" : ""}`}
          >
            <Link
              to="/audit"
              className="text-primary-light dark:text-primary-dark hover:underline cursor-pointer"
            >
              {/* <Button
                color="violet"
                radius="large"
                variant="ghost"
                size="3"
                className="flex space-x-2 ml-1"
              > */}
              <span className="">Project</span>
              {/* </Button> */}
            </Link>
            {currentView !== ViewType.PROJECT && (
              <>
                <MdKeyboardArrowRight className="text-gray-light dark:text-gray-dark" />
                <h1 className="text-md font-semibold text-gray-500 dark:text-text-dark">
                  Fiile:
                </h1>
                <Link
                  to={`/audit/${encodeURIComponent(file)}`}
                  className="text-primary-light dark:text-primary-dark hover:underline cursor-pointer"
                >
                  <span className="">{file}</span>
                </Link>
              </>
            )}
            {currentView === ViewType.INSTANCE && (
              <>
                <MdKeyboardArrowRight className="text-gray-light dark:text-gray-dark" />
                <h1 className="text-md font-semibold text-gray-500 dark:text-text-dark">
                  Symbol:
                </h1>
                <Link
                  to={`/audit/${encodeURIComponent(file)}/${encodeURIComponent(instance)}`}
                  className="text-primary-light dark:text-primary-dark hover:underline cursor-pointer"
                >
                  <span className="">{instance}</span>
                </Link>
              </>
            )}
          </div>
          <div className="flex gap-4 border border-secondarySurface-light dark:border-secondarySurface-dark px-3 py-2 rounded-xl">
            <Button
              color="violet"
              variant="ghost"
              size="1"
              onClick={() => themeContext.changeTheme(lightTheme)}
              className={`p-2.5 rounded-md ${
                themeContext.theme === lightTheme
                  ? "bg-secondarySurface-light"
                  : ""
              }`}
            >
              <MdLightMode className="text-gray-light dark:text-gray-dark h-6 w-6" />
            </Button>
            <Button
              color="violet"
              variant="ghost"
              size="1"
              onClick={() => themeContext.changeTheme(darkTheme)}
              className={`p-2.5 rounded-md ${
                themeContext.theme === darkTheme
                  ? "bg-secondarySurface-dark"
                  : ""
              }`}
            >
              <MdDarkMode className="text-gray-light dark:text-gray-dark h-6 w-6" />
            </Button>
          </div>
        </div>
        <div className="relative grow bg-secondaryBackground-light dark:bg-secondaryBackground-dark rounded-xl rounded-t-none border-t border-t-border-light dark:border-t-border-dark overflow-hidden">
          {props.graphSlot}
        </div>
      </div>
    </div>
  );
}
