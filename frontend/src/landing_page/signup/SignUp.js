import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  hasActiveDashboardSession,
  startDashboardSession,
} from "../../services/authSession";

function SignUp() {
  const navigate = useNavigate();

  const [email, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (hasActiveDashboardSession()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {

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

        // This deadline is intentionally fixed at 24 hours. Refreshing a
        // Supabase access token does not keep the dashboard signed in longer.
        startDashboardSession();

        alert("Login Successful");

        navigate("/dashboard");

      } else {
        console.log("LOGIN RESPONSE:", data);
        alert(data.message || data.error || "Invalid Credentials");
      }

    } catch (error) {
      console.error("LOGIN ERROR:", error);
      alert("Server Error: " + error.message);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow border-0">
            <div className="card-body p-5">

              <div className="text-center mb-4">
                <h2>Admin Login</h2>
                <p className="text-muted">
                  KM Fitness Club Dashboard
                </p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label>Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={email}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    required
                  />
                </div>

                <div className="mb-4">
                  <label>Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />
                </div>

                <button
                  className="btn btn-warning w-100"
                  type="submit"
                >
                  Login
                </button>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
