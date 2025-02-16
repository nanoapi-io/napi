import React, { useContext } from "react";
import ReactDOM from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import { Theme } from "@radix-ui/themes";
import "react-toastify/dist/ReactToastify.css";

import "@xyflow/react/dist/style.css";
import "@radix-ui/themes/styles.css";
import "./index.css";
import SplitConfigure from "./pages/splitConfigure";
import { createBrowserRouter, RouterProvider } from "react-router";
import { ToastContainer } from "react-toastify";
import { ThemeContext, ThemeProvider } from "./contexts/ThemeContext";
import { StoreProvider } from "./contexts/StoreContext";
import BaseAudit from "./pages/audit";
import Audit from "./pages/audit/index";
import AuditFile from "./pages/audit/file";
import DashboardPage from "./pages/dashboard";
import ProjectsPage from "./pages/projects";
import Project from "./pages/project";
import WorkspacesPage from "./pages/workspaces";
import Auth from "./pages/auth";
import Index from "./pages";

const reactFlowPaths = [
  "/splitConfigure",
  "/audit",
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/splitConfigure",
    element: <SplitConfigure />,
  },
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
  {
    path: "/projects",
    element: <ProjectsPage />,
  },
  {
    path: "/project/:id/overview",
    element: <Project />,
  },
  {
    path: "/project/:id/splitConfigure", // Shows react flow
    element: <Project />,
  },
  {
    path: "/project/:id/audit", // Shows react flow
    element: <Project />,
  },
  {
    path: "/workspaces",
    element: <WorkspacesPage />,
  },
  {
    path: "/auth/github",
    element: <Auth provider="github" />,
  },
  {
    path: "/auth/gitlab",
    element: <Auth provider="gitlab" />,
  },
  {
    path: "/auth/bitbucket",
    element: <Auth provider="bitbucket" />,
  },
  {
    path: "/audit",
    element: <BaseAudit />,
    children: [
      {
        path: "/audit",
        element: <Audit />,
      },
      {
        path: "/audit/:file",
        element: <AuditFile />,
      },
    ],
  },
]);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

function Main() {
  const themeContext = useContext(ThemeContext);

  let shouldRenderReactFlow = false;
  reactFlowPaths.forEach((path) => {
    if (window.location.pathname.includes(path)) {
      shouldRenderReactFlow = true;
    }
  });

  return (
    <Theme appearance={themeContext.theme}>
      {shouldRenderReactFlow ? (
          <ReactFlowProvider>
            <div className="font-jakarta">
              <ToastContainer theme={themeContext.theme} />
              <RouterProvider router={router} />
            </div>
          </ReactFlowProvider>
        ) : (
          <div className="font-jakarta">
            <ToastContainer theme={themeContext.theme} />
            <RouterProvider router={router} />
          </div>
        )
      }
    </Theme>
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <StoreProvider>
        <Main />
      </StoreProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
