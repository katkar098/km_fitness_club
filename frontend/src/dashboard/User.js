import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import Home from "./Home";
import { useParams } from "react-router-dom";
import { useMember } from "./MemberContext";

// =====================================================
// USER PROFILE
// =====================================================

function User() {
  const { id } = useParams();

  const {
    members = [],
    updateMember,
    paymentHistory = [],
  } = useMember();

  // =====================================================
  // FIND CURRENT USER
  // =====================================================

  const user = useMemo(() => {
    const currentId = String(id || "").trim();

    return members.find((member) => {
      const identifiers = [
        member.id,
        member.memberId,
        member.member_id,
        member.memberCode,
        member.member_code,
        member.employeeId,
        member.employee_id,
        member.employeeCode,
        member.employee_code,
        member.biometricId,
        member.biometric_id,
        member.biometricUserId,
        member.biometric_user_id,
        member.databaseId,
        member.uuid,
        member.userId,
        member.user_id,
      ]
        .filter(
          (value) =>
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        )
        .map((value) => String(value).trim());

      return identifiers.includes(currentId);
    });
  }, [members, id]);

  // =====================================================
  // ALL MEMBER IDENTIFIERS
  // =====================================================

  const memberIdentifiers = useMemo(() => {
    if (!user) {
      return [];
    }

    return [
      id,

      user.id,

      user.memberId,
      user.member_id,

      user.memberCode,
      user.member_code,

      user.employeeId,
      user.employee_id,

      user.employeeCode,
      user.employee_code,

      user.biometricId,
      user.biometric_id,

      user.biometricUserId,
      user.biometric_user_id,

      user.databaseId,
      user.uuid,

      user.userId,
      user.user_id,
    ]
      .filter(
        (value) =>
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
      )
      .map((value) => String(value).trim());
  }, [user, id]);

  // =====================================================
  // NORMALIZE ID
  // =====================================================

  const normalizeId = useCallback((value) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "";
    }

    return String(value)
      .trim()
      .replace(/^0+(\d)/, "$1");
  }, []);

  // =====================================================
  // SAFE DATE PARSER
  // =====================================================

  const parseDate = useCallback((value) => {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return null;
      }

      return value;
    }

    const text = String(value).trim();

    // YYYY-MM-DD ONLY
    const ymd = text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (ymd) {
      const date = new Date(
        Number(ymd[1]),
        Number(ymd[2]) - 1,
        Number(ymd[3]),
        12,
        0,
        0
      );

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    // DD-MM-YYYY ONLY
    const dmy = text.match(
      /^(\d{2})-(\d{2})-(\d{4})$/
    );

    if (dmy) {
      const date = new Date(
        Number(dmy[3]),
        Number(dmy[2]) - 1,
        Number(dmy[1]),
        12,
        0,
        0
      );

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }, []);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDateDDMMYYYY = useCallback(
    (value) => {
      if (!value) {
        return "-";
      }

      const text = String(value).trim();

      const ymd = text.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

      if (ymd) {
        return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
      }

      const date = parseDate(value);

      if (!date) {
        return text;
      }

      return date.toLocaleDateString(
        "en-GB",
        {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );
    },
    [parseDate]
  );

  // =====================================================
  // MEMBER IDENTIFIER SET
  // =====================================================

  const normalizedMemberIdentifiers = useMemo(() => {
    return new Set(
      memberIdentifiers
        .map((value) => normalizeId(value))
        .filter(Boolean)
    );
  }, [
    memberIdentifiers,
    normalizeId,
  ]);

  // =====================================================
  // PAYMENT DATE
  // =====================================================

  const getPaymentDate = useCallback((payment) => {
    return (
      payment?.date ||
      payment?.paymentDate ||
      payment?.paidAt ||
      payment?.paid_at ||
      payment?.createdAt ||
      payment?.created_at ||
      ""
    );
  }, []);

  // =====================================================
  // PAYMENT HISTORY
  // =====================================================

  const memberHistory = useMemo(() => {
    if (
      !user ||
      !Array.isArray(paymentHistory)
    ) {
      return [];
    }

    return paymentHistory
      .filter((payment) => {
        const paymentIdentifiers = [
          payment.memberId,
          payment.member_id,

          payment.memberCode,
          payment.member_code,

          payment.employeeId,
          payment.employee_id,

          payment.employeeCode,
          payment.employee_code,

          payment.userId,
          payment.user_id,

          payment.biometricId,
          payment.biometric_id,

          payment.biometricUserId,
          payment.biometric_user_id,

          payment.databaseId,
          payment.uuid,

          payment.member?.id,
          payment.member?.memberId,
          payment.member?.memberCode,
          payment.member?.employeeCode,
          payment.member?.biometricUserId,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null &&
              String(value).trim() !== ""
          )
          .map((value) =>
            normalizeId(value)
          )
          .filter(Boolean);

        return paymentIdentifiers.some(
          (paymentId) =>
            normalizedMemberIdentifiers.has(
              paymentId
            )
        );
      })
      .sort((a, b) => {
        const dateA = parseDate(
          getPaymentDate(a)
        );

        const dateB = parseDate(
          getPaymentDate(b)
        );

        return (
          (dateB?.getTime() || 0) -
          (dateA?.getTime() || 0)
        );
      });
  }, [
    paymentHistory,
    user,
    normalizedMemberIdentifiers,
    normalizeId,
    parseDate,
    getPaymentDate,
  ]);

  // =====================================================
  // CURRENT PAYMENT
  // =====================================================

  const currentMembershipPayment = useMemo(() => {
    if (!memberHistory.length) {
      return null;
    }

    return memberHistory[0];
  }, [memberHistory]);

  // =====================================================
  // PAYMENT DATE FILTER
  // =====================================================

  const [
    fromDate,
    setFromDate,
  ] = useState("");

  const [
    toDate,
    setToDate,
  ] = useState("");

  const filteredHistory = useMemo(() => {
    return memberHistory.filter(
      (payment) => {
        if (
          !fromDate &&
          !toDate
        ) {
          return true;
        }

        const paymentDate =
          parseDate(
            getPaymentDate(
              payment
            )
          );

        if (!paymentDate) {
          return false;
        }

        if (fromDate) {
          const from =
            parseDate(fromDate);

          if (
            from &&
            paymentDate.getTime() <
              from.getTime()
          ) {
            return false;
          }
        }

        if (toDate) {
          const to =
            parseDate(toDate);

          if (to) {
            to.setHours(
              23,
              59,
              59,
              999
            );

            if (
              paymentDate.getTime() >
              to.getTime()
            ) {
              return false;
            }
          }
        }

        return true;
      }
    );
  }, [
    memberHistory,
    fromDate,
    toDate,
    parseDate,
    getPaymentDate,
  ]);

  // =====================================================
  // PAYMENT HELPERS
  // =====================================================

  const getAdmissionFee = (item) => {
    return Number(
      item?.admissionFee ??
        item?.admission_fee ??
        item?.admissionAmount ??
        item?.admission_amount ??
        0
    );
  };

  const getPaymentAmount = (item) => {
    return Number(
      item?.amount ??
        item?.finalAmount ??
        item?.final_amount ??
        item?.paidAmount ??
        item?.paid_amount ??
        item?.amount_paid ??
        0
    );
  };

  const getPaymentMode = (item) => {
    return (
      item?.paymentMode ||
      item?.payment_mode ||
      item?.paymentMethod ||
      item?.payment_method ||
      item?.mode ||
      "-"
    );
  };

  const getPaymentType = (item) => {
    return (
      item?.type ||
      item?.paymentType ||
      item?.payment_type ||
      "Membership"
    );
  };

  const getPaymentPlan = (item) => {
    return (
      item?.plan ||
      item?.plan_name ||
      item?.membershipPlan ||
      item?.membership_plan ||
      "-"
    );
  };

  // =====================================================
  // EDIT MEMBER
  // =====================================================

  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    editData,
    setEditData,
  ] = useState({
    name: "",
    mobile: "",
    gender: "",
    startDate: "",
    expiryDate: "",
    address: "",
    status: "active",
    biometricEnabled: true,
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setEditData({
      name:
        user.name || "",

      mobile:
        user.mobile || "",

      gender:
        user.gender || "",

      startDate: user.startDate || "",
      expiryDate: user.expiryDate || "",

      address:
        user.address || "",
      status: user.status || "active",
      biometricEnabled: user.biometricEnabled !== false,
    });
  }, [user]);

  // =====================================================
  // SAVE MEMBER
  // =====================================================

  const handleSave = async () => {
    try {
      const updatedMember = {
        ...user,
        ...editData,
        updateMembershipDates: true,
      };

      await updateMember(
        updatedMember
      );

      alert(
        "Member Updated Successfully"
      );

      setIsEditing(false);
    } catch (error) {
      console.error(
        "Member update failed:",
        error
      );

      alert(
        error?.response?.data
          ?.message ||
          error?.message ||
          "Unable to update member"
      );
    }
  };

  // =====================================================
  // MEMBER NOT FOUND
  // =====================================================

  if (!user) {
    return (
      <Home>
        <div className="container p-5">
          <h3 className="text-danger">
            Member Not Found
          </h3>
        </div>
      </Home>
    );
  }

  // =====================================================
  // MEMBERSHIP STATUS
  // =====================================================

  const getStatus = (
    expiryDate
  ) => {
    if (!expiryDate) {
      return "Active";
    }

    const expiry =
      parseDate(expiryDate);

    if (!expiry) {
      return "Active";
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
      23,
      59,
      59,
      999
    );

    const difference =
      expiry.getTime() -
      today.getTime();

    const daysRemaining =
      Math.ceil(
        difference /
          (1000 *
            60 *
            60 *
            24)
      );

    if (daysRemaining < 0) {
      return "Expired";
    }

    if (daysRemaining <= 5) {
      return "Expiring Soon";
    }

    return "Active";
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Home>

      <div className="container-fluid p-4">

        {/* ================================================= */}
        {/* PROFILE */}
        {/* ================================================= */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-body">

            <div className="row align-items-center">

              <div className="col-md-2 text-center">

                <img
                  src="/media/images/brand_logo.jpg"
                  alt="profile"
                  className="img-fluid rounded-circle border border-3 border-warning"
                  style={{
                    width: "120px",
                    height: "120px",
                  }}
                />

              </div>

              <div className="col-md-10 d-flex justify-content-between align-items-start">

                <div>

                  <h2 className="fw-bold">
                    {user.name}
                  </h2>

                  <p className="text-muted mb-1">

                    User ID:{" "}

                    {user.memberCode ||
                      user.employeeCode ||
                      user.memberId ||
                      user.id}

                  </p>

                  <p className="text-muted mb-1">

                    Mobile:{" "}

                    {user.mobile}

                  </p>

                </div>

                <button
                  className="btn btn-warning"
                  onClick={() =>
                    setIsEditing(true)
                  }
                >
                  Edit Profile
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* MEMBERSHIP SUMMARY */}
        {/* ================================================= */}

        <div className="row g-3 mb-4">

          <div className="col-md-3">

            <div className="card shadow-sm">

              <div className="card-body">

                <h6>
                  Membership Plan
                </h6>

                <h5>
                  {user.plan || "-"}
                </h5>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card shadow-sm">

              <div className="card-body">

                <h6>
                  Duration
                </h6>

                <h5>
                  {user.duration || "-"}
                </h5>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card shadow-sm">

              <div className="card-body">

                <h6>
                  Join Date
                </h6>

                <h5>

                  {formatDateDDMMYYYY(
                    user.startDate ||
                      user.joinDate
                  )}

                </h5>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card shadow-sm">

              <div className="card-body">

                <h6>
                  Expiry Date
                </h6>

                <h5>

                  {formatDateDDMMYYYY(
                    user.expiryDate
                  )}

                </h5>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* PERSONAL INFORMATION */}
        {/* ================================================= */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-header bg-dark text-white">
            Personal Information
          </div>

          <div className="card-body">

            <div className="row">

              <div className="col-md-4">

                <strong>
                  Name
                </strong>

                <p>
                  {user.name}
                </p>

              </div>

              <div className="col-md-4">

                <strong>
                  Mobile
                </strong>

                <p>
                  {user.mobile}
                </p>

              </div>

              <div className="col-md-4">

                <strong>
                  Gender
                </strong>

                <p>
                  {user.gender || "N/A"}
                </p>

              </div>

              <div className="col-md-12">

                <strong>
                  Address
                </strong>

                <p>
                  {user.address || "N/A"}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* MEMBERSHIP DETAILS */}
        {/* ================================================= */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-header bg-warning">
            Membership Details
          </div>

          <div className="card-body">

            <div className="row">

              <div className="col-md-4">

                <strong>
                  Plan
                </strong>

                <p>

                  {user.plan ||
                    getPaymentPlan(
                      currentMembershipPayment
                    )}

                </p>

              </div>

              <div className="col-md-4">

                <strong>
                  Duration
                </strong>

                <p>
                  {user.duration || "-"}
                </p>

              </div>

              <div className="col-md-4">

                <strong>
                  Amount Paid
                </strong>

                <p className="fw-bold text-success">

                  ₹

                  {currentMembershipPayment
                    ? getPaymentAmount(
                        currentMembershipPayment
                      )
                    : Number(
                        user.finalAmount ||
                          0
                      )}

                </p>

              </div>

              <div className="col-md-4">

                <strong>
                  Payment Mode
                </strong>

                <p>

                  {user.paymentMode ||
                    getPaymentMode(
                      currentMembershipPayment
                    )}

                </p>

              </div>

              <div className="col-md-4">

                <strong>
                  Status
                </strong>

                <p>

                  {getStatus(
                    user.expiryDate
                  )}

                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* PAYMENT FILTER */}
        {/* ================================================= */}

        <div className="card shadow-sm border-0 mb-3">

          <div className="card-header bg-primary text-white">
            Filter Payment History
          </div>

          <div className="card-body">

            <div className="row g-3">

              <div className="col-md-4">

                <label className="form-label">
                  From Date
                </label>

                <input
                  type="date"
                  className="form-control"
                  value={fromDate}
                  onChange={(e) =>
                    setFromDate(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="col-md-4">

                <label className="form-label">
                  To Date
                </label>

                <input
                  type="date"
                  className="form-control"
                  value={toDate}
                  onChange={(e) =>
                    setToDate(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="col-md-4 d-flex align-items-end">

                <button
                  className="btn btn-secondary w-100"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  Clear Filter
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* PAYMENT HISTORY */}
        {/* ================================================= */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-header bg-success text-white d-flex justify-content-between">

            <span>
              Membership Payment History
            </span>

            <span className="badge bg-light text-dark">

              {filteredHistory.length} Records

            </span>

          </div>

          <div className="card-body table-responsive">

            <table className="table table-bordered table-hover text-center">

              <thead className="table-dark">

                <tr>

                  <th>
                    Date
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Plan
                  </th>

                  <th>
                    Admission Fee
                  </th>

                  <th>
                    Amount Paid
                  </th>

                  <th>
                    Payment Mode
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredHistory.length > 0 ? (

                  filteredHistory.map(
                    (
                      item,
                      index
                    ) => (

                      <tr
                        key={
                          item.id ||
                          item._id ||
                          `${getPaymentDate(
                            item
                          )}-${index}`
                        }
                      >

                        <td>

                          {formatDateDDMMYYYY(
                            getPaymentDate(
                              item
                            )
                          )}

                        </td>

                        <td>

                          <span className="badge bg-warning text-dark">

                            {getPaymentType(
                              item
                            )}

                          </span>

                        </td>

                        <td>

                          {getPaymentPlan(
                            item
                          )}

                        </td>

                        <td>

                          ₹

                          {getAdmissionFee(
                            item
                          )}

                        </td>

                        <td className="fw-bold text-success">

                          ₹

                          {getPaymentAmount(
                            item
                          )}

                        </td>

                        <td>

                          {getPaymentMode(
                            item
                          )}

                        </td>

                      </tr>

                    )
                  )

                ) : (

                  <tr>

                    <td colSpan="6">

                      No Payment History Found

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ================================================= */}
        {/* EDIT MEMBER MODAL */}
        {/* ================================================= */}

        {isEditing && (

          <div
            className="modal fade show d-block"
            style={{
              backgroundColor:
                "rgba(0,0,0,0.5)",
            }}
          >

            <div className="modal-dialog modal-lg">

              <div className="modal-content">

                <div className="modal-header bg-warning">

                  <h5>
                    Edit Member
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() =>
                      setIsEditing(false)
                    }
                  />

                </div>

                <div className="modal-body">

                  <div className="row g-3">

                    <div className="col-md-6">

                      <label>
                        Name
                      </label>

                      <input
                        className="form-control"
                        value={
                          editData.name
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            name:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Membership Start Date
                      </label>

                      <input
                        type="date"
                        className="form-control"
                        value={editData.startDate}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            startDate: e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Membership End Date
                      </label>

                      <input
                        type="date"
                        className="form-control"
                        value={editData.expiryDate}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            expiryDate: e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Mobile
                      </label>

                      <input
                        className="form-control"
                        value={
                          editData.mobile
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            mobile:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Gender
                      </label>

                      <select
                        className="form-select"
                        value={
                          editData.gender
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            gender:
                              e.target.value,
                          })
                        }
                      >

                        <option value="">
                          Select Gender
                        </option>

                        <option value="Male">
                          Male
                        </option>

                        <option value="Female">
                          Female
                        </option>

                        <option value="Other">
                          Other
                        </option>

                      </select>

                    </div>

                    <div className="col-md-6">

                      <label>
                        Status
                      </label>

                      <select
                        className="form-select"
                        value={editData.status}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            status: e.target.value,
                          })
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                      </select>

                    </div>

                    <div className="col-md-6 d-flex align-items-end">

                      <div className="form-check mb-2">
                        <input
                          id="member-biometric-enabled"
                          type="checkbox"
                          className="form-check-input"
                          checked={editData.biometricEnabled}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              biometricEnabled: e.target.checked,
                            })
                          }
                        />
                        <label className="form-check-label" htmlFor="member-biometric-enabled">
                          Biometric enabled
                        </label>
                      </div>

                    </div>

                    <div className="col-12">

                      <label>
                        Address
                      </label>

                      <textarea
                        className="form-control"
                        rows="3"
                        value={
                          editData.address
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            address:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                  </div>

                </div>

                <div className="modal-footer">

                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setIsEditing(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={
                      handleSave
                    }
                  >
                    Save Changes
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

      </div>

    </Home>
  );
}

export default User;
