import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    "/api",

  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {

  let token = localStorage.getItem("token");

  const expiresAt = Number(
    localStorage.getItem("expiresAt")
  );

  // Check if token expires in next 60 seconds
  if (
    token &&
    expiresAt &&
    Date.now() / 1000 > expiresAt - 60
  ) {

    try {

      const refreshToken =
        localStorage.getItem("refreshToken");

      const response = await fetch(
        "/api/auth/refresh",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {

        token = data.data.accessToken;

        localStorage.setItem(
          "token",
          data.data.accessToken
        );

        localStorage.setItem(
          "refreshToken",
          data.data.refreshToken
        );

        localStorage.setItem(
          "expiresAt",
          data.data.expiresAt
        );

      }

    } catch (err) {

      console.error(err);

    }

  }

  if (token) {

    config.headers.Authorization =
      `Bearer ${token}`;

  }

  return config;

});

export default api;