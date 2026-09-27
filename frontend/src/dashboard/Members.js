import React, {
  useMemo,
  useState,
} from "react";

import Home from "./Home";

import {
  useMember,
} from "./MemberContext";

import {
  Link,
} from "react-router-dom";

import api from "../services/api";

// ============================================================
// MEMBERS
// ============================================================

function Members() {

  const {
    members,
    deleteMember,
  } = useMember();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    "All Status"
  );

  const [
    planFilter,
    setPlanFilter,
  ] = useState(
    "All Plans"
  );

  // ==========================================================
  // RESOLVE MEMBER EXPIRY DATE
  //
  // Different screens in this app store the expiry date
  // under different keys depending on where the member
  // object came from (fresh enroll, renewal, or the raw
  // backend list). Checking only `m.expiryDate` silently
  // misses members whose expiry lives under one of the
  // other keys, which made them fall through to "Unknown"
  // / "Active" instead of showing the real countdown.
  //
  // This checks every variant used elsewhere in the app
  // (RenewMembership.jsx, Receipt.jsx, Dashboard.jsx).
  // ==========================================================

  const resolveExpiry =
    (member) => {

      if (!member) return "";

      return (
        member.expiryDate ||
        member.endDate ||
        member.end_date ||
        member.membershipExpiryDate ||
        member.membershipEndDate ||
        member.membership_end_date ||
        member.membership_end ||
        ""
      );
    };

  const resolveStartDate =
    (member) =>
      member?.startDate ||
      member?.membershipStartDate ||
      member?.start_date ||
      member?.membership_start_date ||
      "";

  // ==========================================================
  // DATE OBJECT
  // ==========================================================

  const getExpiryObject =
    (expiryDate) => {

      if (
        expiryDate === undefined ||
        expiryDate === null ||
        expiryDate === ""
      ) {
        return null;
      }

      const value =
        String(
          expiryDate
        ).trim();

      // ========================================================
      // YYYY-MM-DD
      // ========================================================

      const match =
        value.match(
          /^(\d{4})-(\d{2})-(\d{2})/
        );

      if (match) {

        return new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3])
        );
      }

      // ========================================================
      // DD-MM-YYYY
      // ========================================================

      const indianMatch =
        value.match(
          /^(\d{2})-(\d{2})-(\d{4})$/
        );

      if (indianMatch) {

        return new Date(
          Number(indianMatch[3]),
          Number(indianMatch[2]) - 1,
          Number(indianMatch[1])
        );
      }

      // ========================================================
      // FALLBACK
      // ========================================================

      const date =
        new Date(
          value
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
    };

  // ==========================================================
  // DAYS REMAINING (shared by status text + status type)
  // ==========================================================

  const getDaysRemaining =
    (expiryDate) => {

      const expiry =
        getExpiryObject(
          expiryDate
        );

      if (!expiry) {
        return null;
      }

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      expiry.setHours(
        0,
        0,
        0,
        0
      );

      return Math.round(
        (
          expiry -
          today
        ) /
        (
          1000 *
          60 *
          60 *
          24
        )
      );
    };

  // ==========================================================
  const getMembershipStatus =
    (member) => {
      const value = String(
        member?.membershipStatus ||
          member?.raw?.membership_status ||
          ""
      ).trim();

      if (!value) return "Unknown";

      return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    };

  // ==========================================================
  // STATUS TYPE (drives badge color + filters)
  // ==========================================================

  const getStatusType =
    (expiryDate) => {

      const diffDays =
        getDaysRemaining(
          expiryDate
        );

      if (
        diffDays === null
      ) {
        return "Unknown";
      }

      if (
        diffDays < 0
      ) {
        return "Expired";
      }

      if (
        diffDays <= 5
      ) {
        return "Expiring Soon";
      }

      return "Active";
    };

  // ==========================================================
  // DISPLAY EXPIRY
  // ==========================================================

  const getDateDisplay =
    (expiryDate) => {

      const expiry =
        getExpiryObject(
          expiryDate
        );

      if (!expiry) {
        return "-";
      }

      const day =
        String(
          expiry.getDate()
        ).padStart(
          2,
          "0"
        );

      const month =
        String(
          expiry.getMonth() + 1
        ).padStart(
          2,
          "0"
        );

      const year =
        expiry.getFullYear();

      return (
        `${day}-${month}-${year}`
      );
    };

  // ==========================================================
  // ACTIVE MEMBER
  //
  // "Active" for summary-count purposes includes members
  // that are Expiring Soon (they're not expired yet).
  // ==========================================================

  const isActiveMember =
    (expiryDate) => {

      const status =
        getStatusType(
          expiryDate
        );

      return (
        status === "Active" ||
        status === "Expiring Soon"
      );
    };

  // ==========================================================
  // FILTER MEMBERS
  // ==========================================================

  const filteredMembers =
    useMemo(
      () => {

        return [
          ...members,
        ]
          .sort(
            (a, b) => {

              const aId =
                Number(
                  String(
                    a.id
                  ).replace(
                    /\D/g,
                    ""
                  )
                ) || 0;

              const bId =
                Number(
                  String(
                    b.id
                  ).replace(
                    /\D/g,
                    ""
                  )
                ) || 0;

              return (
                aId -
                bId
              );
            }
          )
          .filter(
            (m) => {

              const expiry =
                resolveExpiry(m);

              const statusType =
                getStatusType(
                  expiry
                );

              const searchText =
                search
                  .toLowerCase()
                  .trim();

              const memberId =
                String(
                  m.id ?? ""
                ).toLowerCase();

              const employeeCode =
                String(
                  m.employeeCode ??
                  // m.memberCode ??
                  ""
                ).toLowerCase();

              const memberName =
                String(
                  m.name ?? ""
                ).toLowerCase();

              const memberMobile =
                String(
                  m.mobile ?? ""
                ).toLowerCase();

              const matchSearch =
                memberId.includes(
                  searchText
                ) ||
                employeeCode.includes(
                  searchText
                ) ||
                memberName.includes(
                  searchText
                ) ||
                memberMobile.includes(
                  searchText
                );

              let matchStatus =
                true;

              if (
                statusFilter ===
                "Active"
              ) {
                matchStatus =
                  statusType ===
                  "Active";
              }

              if (
                statusFilter ===
                "Expiring Soon"
              ) {
                matchStatus =
                  statusType ===
                  "Expiring Soon";
              }

              if (
                statusFilter ===
                "Expired"
              ) {
                matchStatus =
                  statusType ===
                  "Expired";
              }

              const matchPlan =
                planFilter ===
                  "All Plans" ||
                m.plan ===
                  planFilter;

              return (
                matchSearch &&
                matchStatus &&
                matchPlan
              );
            }
          );

      },
      [
        members,
        search,
        statusFilter,
        planFilter,
      ]
    );

  // ==========================================================
  // STATUS BADGE
  // ==========================================================

  const getStatusBadgeClass =
    (statusType) => {

      const normalizedStatus =
        String(statusType || "").toLowerCase();

      if (
        normalizedStatus ===
        "active"
      ) {
        return "bg-success";
      }

      if (
        normalizedStatus ===
        "expired"
      ) {
        return "bg-danger";
      }

      if (
        normalizedStatus ===
        "expiring soon"
      ) {
        return "bg-warning text-dark";
      }

      return "bg-secondary";
    };

  // ==========================================================
  // DELETE MEMBER
  // ==========================================================

  const handleDeleteMember =
    async (member) => {

      console.log(
        "===================================="
      );

      console.log(
        "DELETE MEMBER"
      );

      console.log(
        "FULL MEMBER OBJECT:",
        member
      );

      // ========================================================
      // CONFIRM
      // ========================================================

      const confirmed =
        window.confirm(
          `Delete ${member.name}?`
        );

      if (!confirmed) {
        return;
      }

      // ========================================================
      // IMPORTANT
      //
      // API DELETE requires DATABASE UUID.
      //
      // DO NOT USE:
      //
      // employeeCode
      // memberCode
      // id
      //
      // when id is the public employee code.
      // ========================================================

      const databaseId =
        member.memberId ||
        member.databaseId ||
        member.uuid ||
        member.raw?.id;

      console.log(
        "DATABASE UUID:",
        databaseId
      );

      console.log(
        "EMPLOYEE CODE:",
        member.employeeCode ||
        member.memberCode ||
        member.id
      );

      // ========================================================
      // UUID CHECK
      // ========================================================

      if (!databaseId) {

        alert(
          "Member database ID is missing. Cannot delete this member."
        );

        return;
      }

      try {

        // ======================================================
        // DELETE THROUGH API SERVICE
        //
        // This uses your configured backend baseURL
        // and Axios authentication/interceptors.
        // ======================================================

        const response =
          await api.delete(
            `/members/${databaseId}`
          );

        console.log(
          "DELETE RESPONSE:",
          response
        );

        // ======================================================
        // REMOVE FROM LOCAL STATE
        // ======================================================

        deleteMember(
          databaseId
        );

        console.log(
          "MEMBER DELETED SUCCESSFULLY"
        );

        console.log(
          "===================================="
        );

        alert(
          "Member deleted successfully."
        );

      } catch (
        error
      ) {

        console.error(
          "===================================="
        );

        console.error(
          "DELETE MEMBER ERROR:",
          error
        );

        console.error(
          "ERROR RESPONSE:",
          error?.response
        );

        console.error(
          "ERROR STATUS:",
          error?.response?.status
        );

        console.error(
          "ERROR DATA:",
          error?.response?.data
        );

        console.error(
          "ERROR MESSAGE:",
          error?.message
        );

        console.error(
          "===================================="
        );

        // ======================================================
        // BACKEND ERROR MESSAGE
        // ======================================================

        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Unable to delete member.";

        alert(
          message
        );
      }
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Home>

      <div className="container-fluid p-4">

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="d-flex justify-content-between align-items-center mb-3">

          <h2 className="fw-bold">

            <i className="fa fa-users text-warning me-2"></i>

            Members Management

          </h2>

        </div>

        {/* ================================================== */}
        {/* SUMMARY */}
        {/* ================================================== */}

        <div className="row g-3 mb-4">

          {/* TOTAL */}

          <div className="col-md-4">

            <div className="card shadow-sm border-0">

              <div className="card-body">

                <h6>
                  Total Members
                </h6>

                <h3>
                  {
                    members.length
                  }
                </h3>

              </div>

            </div>

          </div>

          {/* ACTIVE */}

          <div className="col-md-4">

            <div className="card shadow-sm border-0">

              <div className="card-body">

                <h6>
                  Active
                </h6>

                <h3 className="text-success">

                  {
                    members.filter(
                      (m) =>
                        isActiveMember(
                          resolveExpiry(m)
                        )
                    ).length
                  }

                </h3>

              </div>

            </div>

          </div>

          {/* EXPIRED */}

          <div className="col-md-4">

            <div className="card shadow-sm border-0">

              <div className="card-body">

                <h6>
                  Expired
                </h6>

                <h3 className="text-danger">

                  {
                    members.filter(
                      (m) =>
                        getStatusType(
                          resolveExpiry(m)
                        ) ===
                        "Expired"
                    ).length
                  }

                </h3>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* FILTERS */}
        {/* ================================================== */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-body">

            <div className="row g-3">

              {/* SEARCH */}

              <div className="col-md-4">

                <input
                  className="form-control"
                  placeholder="Search Member Code / Name / Mobile"
                  value={
                    search
                  }
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                />

              </div>

              {/* STATUS */}

              <div className="col-md-3">

                <select
                  className="form-select"
                  value={
                    statusFilter
                  }
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                >

                  <option>
                    All Status
                  </option>

                  <option>
                    Active
                  </option>

                  <option>
                    Expiring Soon
                  </option>

                  <option>
                    Expired
                  </option>

                </select>

              </div>

              {/* PLAN */}

              <div className="col-md-3">

                <select
                  className="form-select"
                  value={
                    planFilter
                  }
                  onChange={(e) =>
                    setPlanFilter(
                      e.target.value
                    )
                  }
                >

                  <option>
                    All Plans
                  </option>

                  <option>
                    Gym Membership
                  </option>

                  <option>
                    Gym + Cardio
                  </option>

                  <option>
                    Personal Trainer
                  </option>

                </select>

              </div>

              {/* RESET */}

              <div className="col-md-2">

                <button
                  className="btn btn-warning w-100"
                  onClick={() => {

                    setSearch("");

                    setStatusFilter(
                      "All Status"
                    );

                    setPlanFilter(
                      "All Plans"
                    );

                  }}
                >
                  Reset
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* MEMBERS TABLE */}
        {/* ================================================== */}

        <div className="card shadow-sm border-0">

          <div className="card-header bg-dark text-white">

            Members List

          </div>

          <div className="table-responsive">

            <table className="table table-hover text-center mb-0">

              <thead className="table-light">

                <tr>

                  <th>
                    Member Code
                  </th>

                  <th>
                    Name
                  </th>

                  <th>
                    Mobile
                  </th>

                  <th>
                    Plan
                  </th>

                  <th>
                    Start Date
                  </th>

                  <th>
                    Expiry
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {
                  filteredMembers.length >
                  0

                    ? filteredMembers.map(
                        (m, i) => {

                          const expiry =
                            resolveExpiry(m);

                          const statusType =
                            getMembershipStatus(m);

                          const status =
                            getMembershipStatus(m);

                          return (

                            <tr
                              key={
                                m.memberId ||
                                m.databaseId ||
                                m.id ||
                                i
                              }
                            >

                              {/* ================================= */}
                              {/* EMPLOYEE CODE */}
                              {/* ================================= */}

                              <td>

                                <strong>

                                  {
                                    m.employeeCode ||
                                    m.memberCode ||
                                    m.id
                                  }

                                </strong>

                              </td>

                              {/* ================================= */}
                              {/* NAME */}
                              {/* ================================= */}

                              <td>

                                {
                                  m.name
                                }

                              </td>

                              {/* ================================= */}
                              {/* MOBILE */}
                              {/* ================================= */}

                              <td>

                                {
                                  m.mobile ||
                                  "-"
                                }

                              </td>

                              {/* ================================= */}
                              {/* PLAN */}
                              {/* ================================= */}

                              <td>

                                {
                                  m.plan ||
                                  "-"
                                }

                              </td>

                              {/* ================================= */}
                              {/* EXPIRY */}
                              {/* ================================= */}

                              <td>
                                <strong>
                                  {
                                    getDateDisplay(
                                      resolveStartDate(m)
                                    )
                                  }
                                </strong>
                              </td>

                              <td>

                                <strong>

                                  {
                                    getDateDisplay(
                                      expiry
                                    )
                                  }

                                </strong>

                              </td>

                              {/* ================================= */}
                              {/* STATUS */}
                              {/* ================================= */}

                              <td>

                                <span
                                  className={
                                    `badge ${
                                      getStatusBadgeClass(
                                        statusType
                                      )
                                    }`
                                  }
                                >

                                  {
                                    status
                                  }

                                </span>

                              </td>

                              {/* ================================= */}
                              {/* ACTION */}
                              {/* ================================= */}

                              <td>

                                {/* VIEW */}

                                <Link
                                  to={
                                    `/user/${m.id}`
                                  }
                                >

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary me-2"
                                  >

                                    View

                                  </button>

                                </Link>

                                {/* DELETE */}

                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() =>
                                    handleDeleteMember(
                                      m
                                    )
                                  }
                                >

                                  Delete

                                </button>

                              </td>

                            </tr>

                          );
                        }
                      )

                    : (

                      <tr>

                        <td
                          colSpan="7"
                          className="text-muted py-4"
                        >

                          No members found

                        </td>

                      </tr>

                    )
                }

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </Home>
  );
}

export default Members;
