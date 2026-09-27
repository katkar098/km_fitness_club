import axios from "axios";

const api = axios.create({
  baseURL: "/api",

  headers: {
    "Content-Type": "application/json",
  },
});

// ================= REQUEST =================

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ================= RESPONSE =================

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken =
          localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token found");
        }

        const response = await axios.post(
          "/api/auth/refresh",
          {
            refreshToken,
          }
        );

        const newToken =
          response.data.data.accessToken;

        const newRefreshToken =
          response.data.data.refreshToken;

        const newExpiresAt =
          response.data.data.expiresAt;

        // Save new tokens
        localStorage.setItem(
          "token",
          newToken
        );

        localStorage.setItem(
          "refreshToken",
          newRefreshToken
        );

        localStorage.setItem(
          "expiresAt",
          newExpiresAt
        );

        // Retry failed request
        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        console.error(
          "Token refresh failed:",
          refreshError
        );

        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("expiresAt");

        window.location.href = "/signup";

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;