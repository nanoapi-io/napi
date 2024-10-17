import React from "react";
import ReactDOM from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import { Theme } from "@radix-ui/themes";
import "react-toastify/dist/ReactToastify.css";

import "@xyflow/react/dist/style.css";
import "@radix-ui/themes/styles.css";
import "./index.css";
import Index from "./pages/index";
import { createHashRouter, RouterProvider } from "react-router-dom";
import DefaultLayout from "./layout/default";
import { ToastContainer } from "react-toastify";

const router = createHashRouter([
  {
    path: "/",
    element: (
      <DefaultLayout>
        <Index />
      </DefaultLayout>
    ),
  },
]);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Theme>
      <ReactFlowProvider>
        <>
          <ToastContainer />
          <RouterProvider router={router} />
        </>
      </ReactFlowProvider>
    </Theme>
  </React.StrictMode>,
);
