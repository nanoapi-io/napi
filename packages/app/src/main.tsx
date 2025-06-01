/// <reference lib="dom" />

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Toaster } from "./components/shadcn/Sonner.tsx";
import { ThemeProvider } from "./contexts/ThemeProvider.tsx";
import DependencyVisualizer from "./components/DependencyVisualizer/DependencyVisualizer.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <DependencyVisualizer />,
  },
]);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <Toaster position="top-right" closeButton richColors />
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
