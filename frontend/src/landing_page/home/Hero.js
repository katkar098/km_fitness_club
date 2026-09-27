import React from "react";
import { Link } from "react-router-dom";

function Hero() {
  return (
    <div className="container-fluid p-0 position-relative mb-5">
      <img
        src="/media/images/hero.png"
        alt="hero img"
        className="w-100 vh-100 object-fit-cover"
      />
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      ></div>
      <div className="position-absolute top-50 start-50 translate-middle text-white text-center">
        <h1 className="display-1 fw-bold mb-4">KM Fitness Club</h1>
        <h3 className=" display-6 fw-semibold">Premium Unisex Gym</h3>
        <p className="fs-5 mb-5">
          Transform Your Body, Build Strength, and Achieve Your Fitness Goals
          with World-Class Equipment and Expert Trainers.
        </p>
        <Link to={"/signup"}>
          <button className="btn btn-warning px-5 py-3 fs-4 fw-semibold rounded-pill shadow-lg">
            Join Now
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Hero;
