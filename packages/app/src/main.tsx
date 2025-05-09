/// <reference lib="dom" />

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import BaseAuditPage from "./pages/audit/base.tsx";
import AuditPage from "./pages/audit/index.tsx";
import AuditFilePage from "./pages/audit/file/index.tsx";
import AuditInstancePage from "./pages/audit/file/instance/index.tsx";
import { ViewNames } from "./hooks/types.ts";
import { Toaster } from "./components/shadcn/Toaster.tsx";
import { ThemeProvider } from "./contexts/ThemeProvider.tsx";

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
      // {
      //   path: "/audit/:file",
      //   element: <AuditFilePage />,
      //   handle: { viewName: ViewNames.FILE },
      // },
      // {
      //   path: "/audit/:file/:instance",
      //   element: <AuditInstancePage />,
      //   handle: { viewName: ViewNames.INSTANCE },
      // },
    ],
  },
]);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </StrictMode>,
);
