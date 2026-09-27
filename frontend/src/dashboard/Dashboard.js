import React, { useEffect, useMemo } from "react";
import Home from "./Home";
import { useMember } from "./MemberContext";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const { members } = useMember();

  // =====================================================
  // CHECK LOGIN
  // =====================================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/signup");
    }
  }, [navigate]);

  // =====================================================
  // DATE HELPERS
  // =====================================================

  const parseLocalDate = (value) => {
    if (!value) return null;

    const text = String(value);

    // YYYY-MM-DD
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const date = new Date(
        year,
        month - 1,
        day
      );

      if (!Number.isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0);
        return date;
      }
    }

    // DD-MM-YYYY
    const indianMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);

    if (indianMatch) {
      const day = Number(indianMatch[1]);
      const month = Number(indianMatch[2]);
      const year = Number(indianMatch[3]);

      const date = new Date(
        year,
        month - 1,
        day
      );

      if (!Number.isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0);
        return date;
      }
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    parsed.setHours(0, 0, 0, 0);

    return parsed;
  };

  const formatDate = (value) => {
    const date = parseLocalDate(value);

    if (!date) {
      return "-";
    }

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  // =====================================================
  // GET MEMBER EXPIRY DATE
  //
  // FIX: widened the fallback list to match every key
  // variant used across the app (RenewMembership.jsx,
  // Receipt.jsx, Members.jsx). Previously this was
  // missing `membershipExpiryDate`, so a member whose
  // expiry only lived under that key would silently
  // show no expiry at all and never appear in the
  // "Expiring Soon" table below, even if it was due
  // within 5 days.
  // =====================================================

  const getExpiryDate = (member) => {
    return (
      member?.expiryDate ||
      member?.endDate ||
      member?.end_date ||
      member?.membershipExpiryDate ||
      member?.membershipEndDate ||
      member?.membership_end_date ||
      member?.membership_end ||
      ""
    );
  };

  // =====================================================
  // MEMBER STATUS
  // =====================================================

  const getMemberStatus = (member) => {
    const expiryValue = getExpiryDate(member);

    if (!expiryValue) {
      return "unknown";
    }

    const expiry = parseLocalDate(expiryValue);

    if (!expiry) {
      return "unknown";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return "expired";
    }

    return "active";
  };

  // =====================================================
  // DAYS UNTIL EXPIRY
  // =====================================================

  const getDaysUntilExpiry = (member) => {
    const expiryValue = getExpiryDate(member);

    if (!expiryValue) {
      return null;
    }

    const expiry = parseLocalDate(expiryValue);

    if (!expiry) {
      return null;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const difference =
      expiry.getTime() - today.getTime();

    return Math.round(
      difference /
        (1000 * 60 * 60 * 24)
    );
  };

  // =====================================================
  // DASHBOARD COUNTS
  // =====================================================

  const totalMembers = members.length;

  const activeMembers = members.filter(
    (member) =>
      getMemberStatus(member) === "active"
  ).length;

  const expiredMembers = members.filter(
    (member) =>
      getMemberStatus(member) === "expired"
  ).length;

  // =====================================================
  // EXPIRING SOON MEMBERS
  //
  // Only:
  // 0 days
  // 1 day
  // 2 days
  // 3 days
  // 4 days
  // 5 days
  //
  // Expired members are NOT included.
  // =====================================================

  const expiringSoonMembers = useMemo(() => {
    return members
      .map((member) => {
        const daysRemaining =
          getDaysUntilExpiry(member);

        return {
          ...member,
          daysRemaining,
        };
      })
      .filter(
        (member) =>
          member.daysRemaining !== null &&
          member.daysRemaining >= 0 &&
          member.daysRemaining <= 5
      )
      .sort(
        (a, b) =>
          a.daysRemaining -
          b.daysRemaining
      );
  }, [members]);

  // =====================================================
  // WHATSAPP MESSAGE
  // =====================================================

  const openWhatsApp = (member) => {
    const rawMobile =
      member.mobile ||
      member.phone ||
      member.mobileNumber ||
      "";

    if (!rawMobile) {
      alert(
        "Mobile number is not available for this member."
      );
      return;
    }

    // Remove spaces, +, -, brackets etc.
    let mobile = String(rawMobile).replace(
      /\D/g,
      ""
    );

    // India number handling
    //
    // 9876543210
    // -> 919876543210
    //
    // 09876543210
    // -> 919876543210
    //
    // 919876543210
    // -> stays same

    if (mobile.length === 10) {
      mobile = "91" + mobile;
    } else if (
      mobile.length === 11 &&
      mobile.startsWith("0")
    ) {
      mobile =
        "91" +
        mobile.substring(1);
    }

    const name =
      member.name ||
      member.full_name ||
      "Member";

    const expiryDate =
      getExpiryDate(member);

    const days =
      member.daysRemaining;

    const message =
      `Hello ${name},\n\n` +
      `Your KM Fitness Club membership will expire in ${days === 0
        ? "today"
        : days === 1
          ? "1 day"
          : `${days} days`
      } on ${formatDate(expiryDate)}.\n\n` +
      `Please renew your membership to continue using the gym without interruption.\n\n` +
      `Thank you,\n` +
      `KM Fitness Club`;

    const whatsappUrl =
      `https://wa.me/${mobile}?text=` +
      encodeURIComponent(message);

    // ========================================================
    // FIX: reuse the same WhatsApp tab every time instead of
    // opening a new one per click. See Receipt.jsx handleSend
    // for the full explanation — same named-window approach.
    // ========================================================

    window.open(
      whatsappUrl,
      "km_whatsapp_tab"
    );
  };

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <Home>
      <div className="container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-4">
          <h2 className="fw-bold">
            Dashboard Summary
          </h2>

          <p className="text-muted">
            Welcome Back Admin
          </p>
        </div>

        {/* =================================================
            MEMBER SUMMARY
        ================================================= */}

        <div className="row g-4">

          {/* TOTAL MEMBERS */}

          <div className="col-md-4">

            <div className="card shadow border-0 text-center h-100">

              <div className="card-body">

                <i
                  className="fa fa-users fs-1 text-warning"
                ></i>

                <h6 className="mt-3">
                  Total Members
                </h6>

                <h2 className="fw-bold">
                  {totalMembers}
                </h2>

              </div>

            </div>

          </div>

          {/* ACTIVE MEMBERS */}

          <div className="col-md-4">

            <div className="card shadow border-0 text-center h-100">

              <div className="card-body">

                <i
                  className="fa fa-check-circle fs-1 text-success"
                ></i>

                <h6 className="mt-3">
                  Active Members
                </h6>

                <h2 className="fw-bold">
                  {activeMembers}
                </h2>

              </div>

            </div>

          </div>

          {/* EXPIRED MEMBERS */}

          <div className="col-md-4">

            <div className="card shadow border-0 text-center h-100">

              <div className="card-body">

                <i
                  className="fa fa-times-circle fs-1 text-danger"
                ></i>

                <h6 className="mt-3">
                  Expired Members
                </h6>

                <h2 className="fw-bold">
                  {expiredMembers}
                </h2>

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            EXPIRING SOON
        ================================================= */}

        <div className="card shadow border-0 mt-4">

          <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">

            <span>
              <i className="fa fa-clock-o me-2"></i>
              Expiring Soon (Next 5 Days)
            </span>

            <span className="badge bg-warning text-dark">
              {expiringSoonMembers.length} Members
            </span>

          </div>

          <div className="card-body">

            {expiringSoonMembers.length === 0 ? (

              <div className="text-center text-muted py-4">

                <i className="fa fa-check-circle fa-2x text-success mb-2"></i>

                <div>
                  No memberships expiring
                  within the next 5 days.
                </div>

              </div>

            ) : (

              <div className="table-responsive">

                <table className="table table-hover align-middle mb-0">

                  <thead>
                    <tr>

                      <th>
                        Employee Code
                      </th>

                      <th>
                        Name
                      </th>

                      <th>
                        Mobile
                      </th>

                      <th>
                        Expiry Date
                      </th>

                      <th>
                        Days Remaining
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {expiringSoonMembers.map(
                      (member, index) => {

                        const memberCode =
                          member.employeeCode ||
                          member.memberCode ||
                          member.member_code ||
                          member.id ||
                          "-";

                        const name =
                          member.name ||
                          member.full_name ||
                          "-";

                        const mobile =
                          member.mobile ||
                          member.phone ||
                          "-";

                        const days =
                          member.daysRemaining;

                        return (
                          <tr
                            key={
                              member.memberId ||
                              member.databaseId ||
                              member.id ||
                              index
                            }
                          >

                            <td>
                              <strong>
                                {memberCode}
                              </strong>
                            </td>

                            <td>
                              {name}
                            </td>

                            <td>
                              {mobile}
                            </td>

                            <td>
                              {formatDate(
                                getExpiryDate(
                                  member
                                )
                              )}
                            </td>

                            <td>

                              {days === 0 ? (

                                <span className="badge bg-danger">
                                  Expires Today
                                </span>

                              ) : days === 1 ? (

                                <span className="badge bg-warning text-dark">
                                  Expiring in 1 day
                                </span>

                              ) : (

                                <span className="badge bg-warning text-dark">
                                  Expiring in {days} days
                                </span>

                              )}

                            </td>

                            <td>

                              <button
                                type="button"
                                className="btn btn-success btn-sm fw-bold"
                                onClick={() =>
                                  openWhatsApp(
                                    member
                                  )
                                }
                                disabled={
                                  !mobile ||
                                  mobile === "-"
                                }
                              >
                                <i className="fa fa-whatsapp me-1"></i>
                                WhatsApp
                              </button>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>

        {/* =================================================
            MEMBER STATUS
        ================================================= */}

        <div className="card shadow border-0 mt-4">

          <div className="card-header bg-dark text-white">
            Member Status
          </div>

          <div className="card-body">

            <div className="row text-center">

              <div className="col-md-4">

                <h6 className="text-muted">
                  Total Members
                </h6>

                <h4 className="fw-bold">
                  {totalMembers}
                </h4>

              </div>

              <div className="col-md-4">

                <h6 className="text-muted">
                  Active
                </h6>

                <h4 className="fw-bold text-success">
                  {activeMembers}
                </h4>

              </div>

              <div className="col-md-4">

                <h6 className="text-muted">
                  Expired
                </h6>

                <h4 className="fw-bold text-danger">
                  {expiredMembers}
                </h4>

              </div>

            </div>

          </div>

        </div>

      </div>
    </Home>
  );
}

export default Dashboard;
