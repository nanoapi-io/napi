import React, { useContext } from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "react-toastify/dist/ReactToastify.css";

import "@radix-ui/themes/styles.css";
import "./index.css";
import { createHashRouter, RouterProvider, Navigate } from "react-router";
import { ToastContainer } from "react-toastify";
import { ThemeContext, ThemeProvider } from "./contexts/ThemeContext.js";
import BaseAuditPage from "./pages/audit/base.js";
import AuditPage from "./pages/audit/index.js";
import AuditFilePage from "./pages/audit/file/index.js";
import AuditInstancePage from "./pages/audit/file/instance/index.js";

const router = createHashRouter([
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
      },
      {
        path: "/audit/:file",
        element: <AuditFilePage />,
      },
      {
        path: "/audit/:file/:instance",
        element: <AuditInstancePage />,
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
  <React.StrictMode>
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  </React.StrictMode>,
);
