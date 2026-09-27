import React from 'react';
import {Link} from 'react-router-dom';


function Navbar() {
    return (
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
            <div class="container">
                <Link class="navbar-brand fw-bold text-warning" to={"/"} >
                <img src='media/images/km_logo.jpg' alt='logo' className='me-3' style={{ width: "4%", height: "4%", borderRadius: "45px" }} ></img>
                    KM Fitness Club
                </Link>

                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto me-5">
                        <li class="nav-item">
                            <Link class="nav-link active" to={"/"}>Home</Link>
                        </li>

                        <li class="nav-item">
                            <Link class="nav-link" to={"/about"}>About</Link>
                        </li>

                        <li class="nav-item">
                            <Link class="nav-link" to={"/membership"}>Membership</Link>
                        </li>
                    </ul>

                    <Link to={"/signup"} class="btn btn-warning fw-bold">
                        Join Now
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;