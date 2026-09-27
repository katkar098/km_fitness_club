import React from "react";
import { Link, useLocation } from "react-router-dom";
import { clearDashboardSession } from "../services/authSession";

function SideBar() {
  const location = useLocation();
  const logout = () => {

    clearDashboardSession();

    window.location.href = "/signup";

  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: "fa-home",
    },
    {
      name: "Attendance",
      path: "/attendance",
      icon: "fa-calendar-check-o",
    },
    {
      name: "Billing",
      path: "/billing",
      icon: "fa-credit-card",
    },
    {
      name: "Members",
      path: "/member",
      icon: "fa-users",
    },
    {
      name: "Renew Membership",
      path: "/renew",
      icon: "fa-refresh",
    },
    {
      name: "Create User",
      path: "/create",
      icon: "fa-user-plus",
    },
  ];

  return (
    <div
      className="dashboard-sidebar bg-dark text-white d-flex flex-column justify-content-between shadow"
      style={{
        width: "280px",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "hidden",
      }}
    >
      {/* Top Section */}
      <div>
        {/* Logo */}
        <div className="text-center py-3 border-bottom border-secondary">
          <img
            src="/media/images/brand_logo.jpg"
            alt="KM Fitness Club"
            style={{
              width: "65px",
              height: "65px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #ffc107",
            }}
          />

          <h5 className="mt-2 mb-0 text-warning fw-bold">KM Fitness Club</h5>

          <small className="text-secondary">Gym Management System</small>
        </div>

        {/* Admin Profile */}
        <div className="text-center py-3 border-bottom border-secondary">
          <i className="fa fa-user-circle fa-3x text-secondary"></i>

          <h6 className="mt-2 mb-0 fw-bold">Admin Panel</h6>

          <small className="text-secondary">Welcome Back</small>
        </div>

        {/* Navigation */}
        <div className="px-3 py-3">
          <ul className="nav flex-column">
            {menuItems.map((item) => (
              <li className="nav-item mb-2" key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link d-flex align-items-center rounded px-3 py-2 ${location.pathname === item.path
                      ? "bg-warning text-dark fw-bold"
                      : "text-white"
                    }`}
                  style={{
                    transition: "0.3s",
                  }}
                >
                  <i
                    className={`fa ${item.icon} me-3`}
                    style={{ width: "20px" }}
                  ></i>

                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Logout Section */}
      <div className="p-3 border-top border-secondary">
        <button
          className="btn btn-danger w-100"
          onClick={logout}
        >
          <i className="fa fa-sign-out me-2"></i>
          Logout
        </button>
      </div>
    </div>
  );
}

export default SideBar;
