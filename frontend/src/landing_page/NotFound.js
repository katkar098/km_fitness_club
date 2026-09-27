import React from "react";

function NotFound() {
  return (
    <div className="container text-center py-5">
      <h1 className="display-1 fw-bold text-danger">404</h1>

      <h2 className="fw-bold">Page Not Found</h2>

      <p className="text-muted fs-5">
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>

      <a href="/dashboard" class="btn btn-warning fw-bold btn-lg mt-3">
        Back to Home
      </a>
    </div>
  );
}

export default NotFound;