import React from 'react';

function Features() {
    return ( 
        <div className="container py-5">
            <div className="row g-4 text-center">

                <div className="col-lg-3 col-md-6 col-12">
                    <div className="card bg-dark p-4 shadow-lg">
                        <img 
                            src="media/images/members.png" 
                            alt="members"
                            className="img-fluid mx-auto"
                            style={{ width: "120px" }}
                        ></img>
                        <h4 className="text-white mt-4">Members</h4>
                        <p className="text-secondary">Manage gym members easily</p>
                    </div>
                </div>

                <div className="col-lg-3 col-md-6 col-12">
                    <div className="card p-4 shadow-lg" style={{backgroundColor:"#ffcc00", borderStyle:"none"}}>
                        <img 
                            src="media/images/membership.png" 
                            alt="members"
                            className="img-fluid mx-auto"
                            style={{ width: "120px" }}
                        ></img>
                        <h4 className="text-dark mt-4">Membership</h4>
                        <p className="text-dark">Flexible membership plans</p>
                    </div>
                </div>

                <div className="col-lg-3 col-md-6 col-12">
                    <div className="card bg-dark p-4 shadow-lg">
                        <img 
                            src="media/images/billing.png" 
                            alt="members"
                            className="img-fluid mx-auto"
                            style={{ width: "120px" }}
                        ></img>
                        <h4 className="text-white mt-4">Billing</h4>
                        <p className="text-secondary">Smart payment management</p>
                    </div>
                </div>

                <div className="col-lg-3 col-md-6 col-12">
                    <div className="card p-4 shadow-lg" style={{backgroundColor:"#ffcc00", borderStyle:"none"}}>
                        <img 
                            src="media/images/attendance.png" 
                            alt="members"
                            className="img-fluid mx-auto"
                            style={{ width: "120px" }}
                        ></img>
                        <h4 className="text-dark mt-4">Attendance</h4>
                        <p className="text-dark">Track biometric attendance</p>
                    </div>
                </div>

            </div>

        </div>
     );
}

export default Features;