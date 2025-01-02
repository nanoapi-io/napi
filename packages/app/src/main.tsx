import React, { useContext } from "react";
import ReactDOM from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import { Theme } from "@radix-ui/themes";
import "react-toastify/dist/ReactToastify.css";

import "@xyflow/react/dist/style.css";
import "@radix-ui/themes/styles.css";
import "./index.css";
import SplitConfigure from "./pages/splitConfigure";
import { createHashRouter, RouterProvider } from "react-router-dom";
import DefaultLayout from "./layout/default";
import { ToastContainer } from "react-toastify";
import { ThemeContext, ThemeProvider } from "./contexts/ThemeContext";

const router = createHashRouter([
  {
    path: "/splitConfigure",
    element: (
      <DefaultLayout>
        <SplitConfigure />
      </DefaultLayout>
    ),
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
      <ReactFlowProvider>
        <div className="font-jakarta">
          <ToastContainer theme={themeContext.theme} />
          <RouterProvider router={router} />
        </div>
      </ReactFlowProvider>
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
