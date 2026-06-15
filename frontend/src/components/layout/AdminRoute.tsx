import { Navigate, Outlet } from "react-router-dom"

export default function AdminRoute() {
  const token = localStorage.getItem("token")
  const userStr = localStorage.getItem("user")
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />
  }

  try {
    const user = JSON.parse(userStr)
    if (user.role !== 'admin') {
      console.warn("Non-admin user tried to access admin panel.");
      return <Navigate to="/" replace />
    }
  } catch (e) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
