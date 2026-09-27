import React from "react";
import { Link } from "react-router-dom";
import SignUp from "../signup/SignUp";

function Hero() {
  return (
    <div className="container py-5">
      <div className="row align-items-center">
        <div className="col-lg-6">
          <h5 className="text-warning fw-bold mb-3">ABOUT KM FITNESS CLUB</h5>

          <h1 className="display-4 fw-bold">
            Transform Your Body, Transform Your Life
          </h1>

          <p className="lead text-muted mt-4">
            At KM Fitness Club, we are committed to helping individuals achieve
            their fitness goals through expert guidance, modern equipment, and a
            motivating environment. Whether you're looking to lose weight, build
            muscle, or improve overall health, our experienced trainers are here
            to support your journey.
          </p>

          <div className="mt-4">
            <Link to={"/signup"}>
              <button className="btn btn-warning btn-lg me-3">Join Now</button>
            </Link>
          </div>
        </div>

        <div className="col-lg-6 text-center">
          <img
            src="media/images/hero.png"
            alt="Gym Training"
            className="img-fluid rounded shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}

export default Hero;
