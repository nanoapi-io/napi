/// <reference lib="dom" />

import { StrictMode, useContext } from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "./index.css";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { ToastContainer } from "react-toastify";
import { ThemeContext, ThemeProvider } from "./contexts/ThemeContext.tsx";
import BaseAuditPage from "./pages/audit/base.tsx";
import AuditPage from "./pages/audit/index.tsx";
import AuditFilePage from "./pages/audit/file/index.tsx";
import AuditInstancePage from "./pages/audit/file/instance/index.tsx";
import { ViewNames } from "./hooks/types.ts";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/audit" replace />,
  },
  {
    path: "/audit",
    element: <BaseAuditPage />,
    children: [
      {
        path: "/audit",
        element: <AuditPage />,
        handle: { viewName: ViewNames.PROJECT },
      },
      {
        path: "/audit/:file",
        element: <AuditFilePage />,
        handle: { viewName: ViewNames.FILE },
      },
      {
        path: "/audit/:file/:instance",
        element: <AuditInstancePage />,
        handle: { viewName: ViewNames.INSTANCE },
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

  return (
    <Theme appearance={themeContext.theme}>
      <div className="font-jakarta">
        <ToastContainer theme={themeContext.theme} />
        <RouterProvider router={router} />
      </div>
    </Theme>
  );
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  </StrictMode>,
);
