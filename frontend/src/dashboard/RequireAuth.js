import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import {
  clearDashboardSession,
  getDashboardSessionRemainingMs,
  hasActiveDashboardSession,
} from "../services/authSession";

function RequireAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    hasActiveDashboardSession
  );

  useEffect(() => {
    if (!hasActiveDashboardSession()) {
      clearDashboardSession();
      setIsAuthenticated(false);
      return undefined;
    }

    const expiryTimer = setTimeout(() => {
      clearDashboardSession();
      setIsAuthenticated(false);
    }, getDashboardSessionRemainingMs());

    return () => clearTimeout(expiryTimer);
  }, []);

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/signup" replace />;
}

export default RequireAuth;
