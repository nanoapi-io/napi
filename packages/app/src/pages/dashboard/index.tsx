import AppSidebar from "../../components/Sidebar/AppSidebar";
import Dashboard from "./Dashboard";

export default function DashboardPage() {
  return (
    <div className="flex gap-x-2 min-h-screen text-white bg-background-light dark:bg-background-dark p-2">
      <AppSidebar />
      <Dashboard />
    </div>
  );
}