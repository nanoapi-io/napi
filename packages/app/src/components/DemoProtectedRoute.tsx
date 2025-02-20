import { Navigate, Outlet } from "react-router";

export default function DemoProtectedRoute() {
  const key = localStorage.getItem("access");

  // Set the original destination URL in localStorage
  if (!key) {
    localStorage.setItem("destination", window.location.pathname);
  }

  return key ? <Outlet /> : <Navigate to="/" />;
}