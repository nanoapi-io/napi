import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeProvider";
import { TooltipProvider } from "./components/shadcn/Tooltip";
import ManifestList from "./pages/ManifestList";
import ManifestView from "./pages/ManifestView";

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ManifestList />} />
            <Route path="/manifests/:id" element={<ManifestView />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
}
