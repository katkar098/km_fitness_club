const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export const startDashboardSession = () => {
  localStorage.setItem(
    "dashboardSessionExpiresAt",
    String(Date.now() + SESSION_DURATION_MS)
  );
};

export const hasActiveDashboardSession = () => {
  const expiresAt = Number(
    localStorage.getItem("dashboardSessionExpiresAt")
  );

  return Boolean(localStorage.getItem("token")) &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now();
};

export const getDashboardSessionRemainingMs = () => {
  const expiresAt = Number(
    localStorage.getItem("dashboardSessionExpiresAt")
  );

  return Number.isFinite(expiresAt)
    ? Math.max(0, expiresAt - Date.now())
    : 0;
};

export const clearDashboardSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("expiresAt");
  localStorage.removeItem("dashboardSessionExpiresAt");
};
