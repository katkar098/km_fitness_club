import React from "react";
import { Link } from "react-router-dom";

function Join() {
  return (
    <div className="container p-5">
      <div className="row text-center">
        <h1 className="mt-5">Transform Your Body, Transform Your Life</h1>

        <p className="fs-4 text-muted">
          Join KM Fitness Club and achieve your fitness goals with modern
          equipment, expert trainers, personalized workout plans, and a
          motivating environment.
        </p>

        <Link
          to={
            localStorage.getItem("token")
              ? "/dashboard"
              : "/signup"
          }
        >
          Join Now
        </Link>
      </div>
    </div>
  );
}

export default Join;
