import React from "react";

import Home from "./Home";
import { Link } from "react-router-dom";

function MembershipPlan() {
  return (
    <Home>
      <div className="container py-5">
        {/* Heading */}
        <div className="text-center mb-5">
          <h1 className="fw-bold">
            Our <span className="text-warning">Membership Plans</span>
          </h1>
          <p className="text-muted">
            Choose the perfect plan that matches your fitness goals.
          </p>
        </div>

        <div className="row g-4">
          {/* Basic Gym Membership */}
          <div className="col-lg-4">
            <div className="card h-100 shadow border border-warning">
              <div className="card-body text-center p-5">
                <i
                  className="fa fa-trophy text-warning mb-3"
                  style={{ fontSize: "50px" }}
                ></i>

                <h3 className="fw-bold">Gym Membership</h3>

                <h2 className="text-primary fw-bold my-4">
                  ₹700<span className="fs-6 text-muted">/month</span>
                </h2>

                <ul className="list-unstyled text-muted">
                  <li className="mb-3">✔ Unlimited Gym Access</li>
                  <li className="mb-3">✔ Diet Guidance</li>
                </ul>

                <Link to={"/renew"}>
                <button className="btn btn-outline-warning w-100 mt-5">
                  Choose Plan
                </button></Link>
              </div>
            </div>
          </div>

          {/* Gym + Cardio */}
          <div className="col-lg-4">
            <div
              className="card h-100 shadow-lg border-warning"
              style={{ transform: "scale(1.05)" }}
            >
              <div className="badge bg-warning text-dark py-2">
                MOST POPULAR
              </div>

              <div className="card-body text-center p-5">
                <i
                  className="fa fa-heartbeat text-danger mb-3"
                  style={{ fontSize: "50px" }}
                ></i>

                <h3 className="fw-bold">Gym + Cardio</h3>

                <h2 className="text-success fw-bold my-4">
                  ₹900<span className="fs-6 text-muted">/month</span>
                </h2>

                <ul className="list-unstyled text-muted">
                  <li className="mb-3">✔ Everything in Gym Plan</li>
                  <li className="mb-3">✔ Treadmill Access</li>
                  <li className="mb-3">✔ Cycling Access</li>
                </ul>

                <Link to={"/renew"}><button className="btn btn-warning w-100">Choose Plan</button></Link>
              </div>
            </div>
          </div>

          {/* Personal Trainer */}
          <div className="col-lg-4">
            <div className="card h-100 shadow border border-warning">
              <div className="card-body text-center p-5">
                <i
                  className="fa fa-user-circle text-warning mb-3"
                  style={{ fontSize: "50px" }}
                ></i>

                <h3 className="fw-bold">Personal Trainer</h3>

                <h2 className="text-primary fw-bold my-4">
                  ₹3000<span className="fs-6 text-muted">/month</span>
                </h2>

                <ul className="list-unstyled text-muted">
                  <li className="mb-3">✔ One-on-One Training</li>
                  <li className="mb-3">✔ Customized Workout Plan</li>
                  <li className="mb-3">✔ Personalized Diet Plan</li>
                  <li className="mb-3">✔ Progress Tracking</li>
                  <li className="mb-3">✔ Priority Support</li>
                </ul>

                <Link to={"/renew"}>
                <button className="btn btn-outline-warning w-100 mt-5">
                  Choose Plan
                </button></Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Home>
  );
}

export default MembershipPlan;
