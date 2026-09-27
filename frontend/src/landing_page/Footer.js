import React from "react";

function Footer() {
  return (
    <footer className="bg-dark">
    <div className="container  p-4">
      <div className="row text-center">
        <div className="col-4">
          <img
            src="media/images/km_logo.jpg"
            alt="logo"
            className="me-3"
            style={{ width: "5rem", height: "5rem", borderRadius: "45px" }}
          ></img>
          <br></br>
          <a
            class="navbar-brand fw-bold fs-2 text-warning text-center"
            href="#"
          >
            KM Fitness Club
          </a>
          
        </div>
        <div className="col-4 text-white ">
          <p className="fw-bolder text-warning">Contact Info</p>
          <p className="text-center">
            <i class="fa fa-map-marker" aria-hidden="true"></i> Kalyan East, Maharashtra 421306 <br></br>
            <i class="fa fa-phone" aria-hidden="true"></i> +91 86930 36144
          </p>
        </div>
        <div className="col-4 text-white">
          <p className="fw-bolder text-warning">Social Media</p>
          <a href="" className="me-3"><i class="fa fa-instagram fa-2x" aria-hidden="true"></i></a>
          <a href="" className="me-3"><i class="fa fa-google fa-2x" aria-hidden="true"></i></a>
          <a href="" className="me-3"><i class="fa fa-youtube-play fa-2x" aria-hidden="true"></i></a>
          <a href=""><i class="fa fa-facebook-official fa-2x" aria-hidden="true"></i></a>
          <br></br>
        </div>
        <div className="text-center text-white mt-4 fs-6">
          © 2026 KM Fitness Club. All Rights Reserved.
      </div>
      </div>
    </div>
    </footer>
  );
}

export default Footer;
