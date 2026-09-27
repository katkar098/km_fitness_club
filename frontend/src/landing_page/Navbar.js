import React from 'react';
import {Link} from 'react-router-dom';


function Navbar() {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
            <div className="container">
                <Link className="navbar-brand fw-bold text-warning" to={"/"} >
                <img src='media/images/km_logo.jpg' alt='logo' className='navbar-logo me-3' ></img>
                    KM Fitness Club
                </Link>

                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto me-5">
                        <li className="nav-item">
                            <Link className="nav-link active" to={"/"}>Home</Link>
                        </li>

                        <li className="nav-item">
                            <Link className="nav-link" to={"/about"}>About</Link>
                        </li>

                        <li className="nav-item">
                            <Link className="nav-link" to={"/membership"}>Membership</Link>
                        </li>
                    </ul>

                    <Link to={"/signup"} className="btn btn-warning fw-bold">
                        Join Now
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
