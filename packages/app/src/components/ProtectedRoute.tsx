import { Navigate, Outlet } from "react-router";


export default function ProtectedRoute() {
  const token = localStorage.getItem("jwt");

  // Set the original destination URL in localStorage
  if (!token) {
    localStorage.setItem("destination", window.location.pathname);
  }

  return token ? <Outlet /> : <Navigate to="/login" />;
}