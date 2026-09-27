import React, { useEffect, useMemo, useState } from "react";
import Home from "./Home";
import { useNavigate } from "react-router-dom";
import { useMember } from "./MemberContext";
import api from "../services/api";

function RenewMembership() {
  const navigate = useNavigate();

  const { members, renewMembership } = useMember();

  const [searchId, setSearchId] = useState("");
  const [member, setMember] = useState(null);

  const [plan, setPlan] = useState("");
  const [duration, setDuration] = useState("");

  const [discount, setDiscount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");

  const [plans, setPlans] = useState([]);
  const [renewSaving, setRenewSaving] = useState(false);

  const [renewDate, setRenewDate] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");

  // =====================================================
  // GET TODAY IN LOCAL FORMAT
  // =====================================================

  const getTodayLocal = () => {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) return "-";

    const text = String(value);

    const match = text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }

    return text;
  };

  // =====================================================
  // DURATION LABEL
  // =====================================================

  const getDurationLabel = (durationDays) => {
    const days = Number(durationDays || 0);

    if (days >= 330) return "1 Year";
    if (days >= 160) return "6 Months";
    if (days >= 80) return "3 Months";

    return "1 Month";
  };

  // =====================================================
  // LOAD PLANS
  // =====================================================

  useEffect(() => {
  const loadPlans = async () => {
    try {
      const res = await api.get("/plans");

      const planList = res.data?.data || res.data?.plans || res.data || [];

      setPlans(planList);
    } catch (error) {
      console.error("Failed to load plans:", error);
    }
  };

  loadPlans();
}, []);

  // =====================================================
  // SELECT MEMBER
  // =====================================================

  const selectMember = (selectedMember) => {
    if (!selectedMember) return;

    setMember(selectedMember);

    const memberPlan =
      selectedMember.plan ||
      selectedMember.membershipPlan ||
      "";

    const memberDuration =
      selectedMember.duration ||
      selectedMember.membershipDuration ||
      "";

    setPlan(memberPlan);
    setDuration(memberDuration);

    setDiscount("");
    setPaymentMode("Cash");

    // Manual renewal start date
    setRenewDate(getTodayLocal());

    // IMPORTANT:
    // Do not automatically calculate expiry.
    setNewExpiryDate("");
  };

  const getSelectedMemberCode = (selectedMember) =>
    selectedMember?.raw?.biometric_user_id ||
    selectedMember?.raw?.biometricUserId ||
    selectedMember?.biometricUserId ||
    selectedMember?.biometric_user_id ||
    selectedMember?.id ||
    selectedMember?.employeeCode ||
    selectedMember?.employee_code ||
    selectedMember?.memberCode ||
    selectedMember?.member_code ||
    "";

  // =====================================================
  // SEARCH MEMBER
  // =====================================================

  const findMember = (query) => {
    const normalize = (value) => {
      const text = String(value || "").trim().toLocaleLowerCase();
      // Biometric employee IDs are numeric; treat leading zeroes as formatting.
      return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, "") : text;
    };
    const search = normalize(query);
    if (!search) return null;

    const getCodes = (member) => [
      member.employeeCode,
      member.employee_code,
      member.biometricUserId,
      member.biometric_user_id,
      member.memberCode,
      member.member_code,
    ].map(normalize).filter(Boolean);

    // Exact employee-code matches win before any name, phone, UUID or partial match.
    const exactEmployeeCode = members.find((member) =>
      getCodes(member).includes(search)
    );
    if (exactEmployeeCode) return exactEmployeeCode;

    const exactOtherMatch = members.find((member) => [
      member.id,
      member.memberId,
      member.databaseId,
      member.uuid,
      member.name,
      member.fullName,
      member.full_name,
      member.mobile,
      member.phone,
    ].some((value) => normalize(value) === search));
    if (exactOtherMatch) return exactOtherMatch;

    return members.find((member) => [
      ...getCodes(member),
      normalize(member.id),
      normalize(member.memberId),
      normalize(member.databaseId),
      normalize(member.uuid),
      normalize(member.name),
      normalize(member.fullName),
      normalize(member.full_name),
      normalize(member.mobile),
      normalize(member.phone),
    ].some((value) => value.includes(search)));
  };

  // =====================================================
  // AUTOMATIC SEARCH
  // =====================================================

  useEffect(() => {
    const query = searchId.trim();

    if (!query) {
      setMember(null);
      return;
    }

    const found = findMember(query);

    if (found) {
      setMember(found);
    } else {
      setMember(null);
    }
  }, [searchId, members]);

  // =====================================================
  // MANUAL SEARCH
  // =====================================================

  const handleSearch = () => {
    if (!searchId.trim()) {
      alert("Enter Employee Code, Name or Mobile");
      return;
    }

    const found = findMember(searchId);

    if (!found) {
      alert("Member Not Found");
      setMember(null);
      return;
    }

    selectMember(found);
  };

  // =====================================================
  // PLAN OPTIONS
  // =====================================================

  const uniquePlanNames = useMemo(() => {
    return [
      ...new Set(
        plans.map((item) => item.name)
      ),
    ];
  }, [plans]);

  const plansForSelectedName = useMemo(() => {
    return plans.filter(
      (item) => item.name === plan
    );
  }, [plans, plan]);

  const selectedPlan = useMemo(() => {
    return plansForSelectedName.find(
      (item) =>
        getDurationLabel(item.duration_days) ===
        duration
    );
  }, [plansForSelectedName, duration]);

  // =====================================================
  // FIX INVALID PLAN AFTER LOADING
  // =====================================================

  useEffect(() => {
    if (!plans.length) return;

    if (!plan) {
      const firstPlan = plans[0];

      setPlan(firstPlan.name);

      setDuration(
        getDurationLabel(
          firstPlan.duration_days
        )
      );

      return;
    }

    const currentExists = plans.some(
      (item) =>
        item.name === plan &&
        getDurationLabel(
          item.duration_days
        ) === duration
    );

    if (!currentExists) {
      const firstMatchingPlan =
        plans.find(
          (item) => item.name === plan
        ) || plans[0];

      setPlan(firstMatchingPlan.name);

      setDuration(
        getDurationLabel(
          firstMatchingPlan.duration_days
        )
      );
    }
  }, [plans, plan, duration]);

  // =====================================================
  // AMOUNTS
  // =====================================================

  const baseAmount = Number(
    selectedPlan?.price || 0
  );

  const discountAmount = Math.max(
    0,
    Number(discount || 0)
  );

  const finalAmount = Math.max(
    0,
    baseAmount - discountAmount
  );

  // =====================================================
  // GET REAL DATABASE MEMBER ID
  // =====================================================

  const getDatabaseMemberId = () => {
    if (!member) return "";

    return (
      member.memberId ||
      member.databaseId ||
      member.uuid ||
      ""
    );
  };

  // =====================================================
  // RENEW MEMBERSHIP
  // =====================================================

  const handleRenew = async () => {
    if (!member) {
      alert("Search member first");
      return;
    }

    const databaseMemberId =
      getDatabaseMemberId();

    if (!databaseMemberId) {
      console.error(
        "Member does not contain database UUID:",
        member
      );

      alert(
        "Unable to find member database ID."
      );

      return;
    }

    if (!selectedPlan?.id) {
      alert(
        "Please select an active membership plan."
      );

      return;
    }

    if (!renewDate) {
      alert(
        "Please select Renewal Start Date."
      );

      return;
    }

    if (!newExpiryDate) {
      alert(
        "Please select New Expiry Date."
      );

      return;
    }

    if (newExpiryDate < renewDate) {
      alert(
        "Expiry Date cannot be before Renewal Start Date."
      );

      return;
    }

    if (baseAmount <= 0) {
      alert(
        "Invalid membership amount."
      );

      return;
    }

    if (discountAmount > baseAmount) {
      alert(
        "Discount cannot exceed membership amount."
      );

      return;
    }

    const oldExpiryDate =
      member.expiryDate ||
      member.endDate ||
      member.membershipExpiryDate ||
      "";

    const renewalPayload = {
      // IDs
      memberId: databaseMemberId,

      memberCode:
        getSelectedMemberCode(member),

      name:
        member.name ||
        member.fullName ||
        "",

      mobile:
        member.mobile ||
        member.phone ||
        "",

      // Membership
      plan,
      duration,

      // Exact manually selected dates
      renewDate,
      startDate: renewDate,

      expiryDate: newExpiryDate,
      endDate: newExpiryDate,

      oldExpiryDate,

      // Payment
      baseAmount,
      discount: discountAmount,
      finalAmount,
      paymentMode,

      status: "Active",
    };

    try {
      setRenewSaving(true);

      const finalRenewalData = {
        ...renewalPayload,
        planId: selectedPlan.id,

        startDate: renewDate,
        renewDate,

        expiryDate: newExpiryDate,
        endDate: newExpiryDate,

        status: "Active",
      };

      // Save through the context once. It calls the backend and updates
      // cached member/payment data from the saved response.
      const savedRenewal = await renewMembership(
        member.id,
        finalRenewalData
      );
      // These are date-only form values. Keep them as YYYY-MM-DD; parsing a
      // PostgreSQL DATE response as a timestamp can shift it by one timezone day.
      const savedStartDate = renewDate;
      const savedExpiryDate = newExpiryDate;

      const receiptData = {
        ...finalRenewalData,
        startDate: savedStartDate,
        renewDate: savedStartDate,
        expiryDate: savedExpiryDate,
        endDate: savedExpiryDate,
        receiptType: "renewal",
        receiptNumber: savedRenewal?.receipt?.receipt_number || "",
        receiptId: savedRenewal?.receipt?.id || "",
        paymentId: savedRenewal?.payment?.id || "",
      };

      // =================================================
      // UPDATE CURRENT SCREEN
      // =================================================

      setMember((previous) => ({
        ...previous,

        memberId:
          previous.memberId ||
          databaseMemberId,

        plan,

        membershipPlan: plan,

        duration,

        membershipDuration: duration,

        renewDate: savedStartDate,

        startDate: savedStartDate,
        membershipStartDate: savedStartDate,

        expiryDate: savedExpiryDate,
        endDate: savedExpiryDate,
        membershipExpiryDate: savedExpiryDate,

        finalAmount,

        paymentMode,

        status: "Active",
      }));

      // =================================================
      // SAVE RECEIPT DATA
      // =================================================

      localStorage.setItem(
        "km_renewal_receipt",
        JSON.stringify(receiptData)
      );

      alert(
        "Membership renewed successfully."
      );

    } catch (error) {
      console.error(
        "Renew membership error:",
        error
      );

      console.error(
        "Backend response:",
        error.response?.data
      );

      alert(
        error.response?.data?.message ||
          "Unable to renew membership."
      );
    } finally {
      setRenewSaving(false);
    }
  };

  // =====================================================
  // GENERATE RECEIPT
  // =====================================================

  const handleReceipt = () => {
    if (!member) {
      alert("Search member first");
      return;
    }

    if (!renewDate) {
      alert(
        "Please select Renewal Start Date."
      );

      return;
    }

    if (!newExpiryDate) {
      alert(
        "Please select New Expiry Date."
      );

      return;
    }

    // After a renewal is saved, `member.expiryDate` is updated to the new
    // date. Reuse the pre-renewal expiry captured in the saved receipt for
    // this same member instead of labeling the new date as the old expiry.
    let savedRenewalReceipt = null;
    try {
      savedRenewalReceipt = JSON.parse(
        localStorage.getItem("km_renewal_receipt") || "null"
      );
    } catch {
      savedRenewalReceipt = null;
    }

    const currentMemberIds = [
      member.memberId,
      member.databaseId,
      member.uuid,
      member.id,
    ]
      .filter(Boolean)
      .map(String);
    const savedReceiptMemberId = String(
      savedRenewalReceipt?.memberId ||
        savedRenewalReceipt?.databaseId ||
        ""
    );
    const savedOldExpiryDate =
      savedReceiptMemberId && currentMemberIds.includes(savedReceiptMemberId)
        ? savedRenewalReceipt?.oldExpiryDate ||
          savedRenewalReceipt?.old_expiry_date ||
          ""
        : "";

    const receiptData = {
      memberId:
        member.memberId ||
        member.databaseId ||
        member.uuid ||
        member.id,

      memberCode:
        getSelectedMemberCode(member),

      name:
        member.name ||
        member.fullName ||
        "",

      mobile:
        member.mobile ||
        member.phone ||
        "",

      plan,
      duration,

      baseAmount,

      discount: discountAmount,

      finalAmount,

      paymentMode,

      oldExpiryDate:
        savedOldExpiryDate ||
        member.expiryDate ||
        member.endDate ||
        "",

      renewDate,

      startDate: renewDate,

      expiryDate: newExpiryDate,

      endDate: newExpiryDate,

      status: "Active",
      receiptNumber: (() => {
        try {
          return JSON.parse(localStorage.getItem("km_renewal_receipt") || "null")?.receiptNumber || "";
        } catch {
          return "";
        }
      })(),
      receiptType: "renewal",
    };

    localStorage.setItem(
      "km_renewal_receipt",
      JSON.stringify(receiptData)
    );

    navigate("/receipt", {
      state: {
        receiptData,
      },
    });
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Home>
      <div className="container">

        <div className="mb-4">
          <h2 className="fw-bold">
            Renew Membership
          </h2>

          <p className="text-muted">
            Renew existing member plans and manually select renewal and expiry dates.
          </p>
        </div>

        {/* SEARCH */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-header bg-dark text-white">
            Search Member
          </div>

          <div className="card-body">

            <div className="row g-3">

              <div className="col-md-8">

                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Employee Code, Name or Mobile"
                  value={searchId}
                  onChange={(e) =>
                    setSearchId(e.target.value)
                  }
                />

                <small className="text-muted">
                  Search by Employee Code, Name or Mobile.
                </small>

              </div>

              <div className="col-md-2">

                <button
                  type="button"
                  className="btn btn-warning w-100"
                  onClick={handleSearch}
                >
                  Search
                </button>

              </div>

              <div className="col-md-2">

                <button
                  type="button"
                  className="btn btn-secondary w-100"
                  onClick={() => {
                    setSearchId("");
                    setMember(null);
                    setDiscount("");
                    setRenewDate("");
                    setNewExpiryDate("");
                  }}
                >
                  Clear
                </button>

              </div>

            </div>

          </div>
        </div>

        {/* MEMBER DETAILS */}

        {member && (
          <>

            <div className="card shadow-sm border-0 mb-4">

              <div className="card-header bg-warning">
                <strong>
                  Member Information
                </strong>
              </div>

              <div className="card-body">

                <div className="row g-3">

                  <div className="col-md-3">
                    <strong>Employee Code:</strong>

                    <div>
                      {member.memberCode ||
                        member.employeeCode ||
                        member.id ||
                        "-"}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <strong>Name:</strong>

                    <div>
                      {member.name || "-"}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <strong>Mobile:</strong>

                    <div>
                      {member.mobile ||
                        member.phone ||
                        "-"}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <strong>Current Plan:</strong>

                    <div>
                      {member.plan || "-"}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <strong>Current Duration:</strong>

                    <div>
                      {member.duration || "-"}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <strong>Current Expiry:</strong>

                    <div>
                      {formatDate(
                        member.expiryDate ||
                        member.endDate ||
                        member.membershipExpiryDate
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <strong>Renewal Start:</strong>

                    <div className="text-primary fw-bold">
                      {formatDate(renewDate)}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <strong>New Expiry:</strong>

                    <div className="text-success fw-bold">
                      {formatDate(newExpiryDate)}
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* RENEWAL FORM */}

            <div className="card shadow-sm border-0">

              <div className="card-header bg-success text-white">
                Membership Renewal
              </div>

              <div className="card-body">

                <div className="row g-3">

                  <div className="col-md-4">

                    <label className="form-label">
                      Membership Type
                    </label>

                    <select
                      className="form-select"
                      value={plan}
                      onChange={(e) => {
                        const nextPlan =
                          e.target.value;

                        const firstPlan =
                          plans.find(
                            (item) =>
                              item.name === nextPlan
                          );

                        setPlan(nextPlan);

                        if (firstPlan) {
                          setDuration(
                            getDurationLabel(
                              firstPlan.duration_days
                            )
                          );
                        }
                      }}
                    >

                      {uniquePlanNames.map(
                        (name) => (
                          <option
                            key={name}
                            value={name}
                          >
                            {name}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div className="col-md-4">

                    <label className="form-label">
                      Duration
                    </label>

                    <select
                      className="form-select"
                      value={duration}
                      onChange={(e) =>
                        setDuration(
                          e.target.value
                        )
                      }
                    >

                      {plansForSelectedName.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={
                              getDurationLabel(
                                item.duration_days
                              )
                            }
                          >
                            {getDurationLabel(
                              item.duration_days
                            )}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div className="col-md-4">

                    <label className="form-label">
                      Membership Fee
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={`₹${baseAmount}`}
                      readOnly
                    />

                  </div>

                  {/* MANUAL START DATE */}

                  <div className="col-md-4">

                    <label className="form-label fw-bold">
                      Renewal Start Date
                    </label>

                    <input
                      type="date"
                      className="form-control"
                      value={renewDate}
                      onChange={(e) =>
                        setRenewDate(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  {/* MANUAL EXPIRY DATE */}

                  <div className="col-md-4">

                    <label className="form-label fw-bold">
                      New Expiry Date
                    </label>

                    <input
                      type="date"
                      className="form-control"
                      value={newExpiryDate}
                      min={renewDate || undefined}
                      onChange={(e) =>
                        setNewExpiryDate(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  {/* DISCOUNT */}

                  <div className="col-md-4">

                    <label className="form-label">
                      Discount
                    </label>

                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="Discount (optional)"
                      value={discount}
                      onChange={(e) => {
                        const value =
                          e.target.value;

                        if (
                          /^\d*\.?\d*$/.test(
                            value
                          )
                        ) {
                          setDiscount(value);
                        }
                      }}
                    />

                  </div>

                  {/* FINAL AMOUNT */}

                  <div className="col-md-4">

                    <label className="form-label">
                      Final Amount
                    </label>

                    <input
                      type="text"
                      className="form-control fw-bold"
                      value={`₹${finalAmount}`}
                      readOnly
                    />

                  </div>

                  {/* PAYMENT MODE */}

                  <div className="col-md-4">

                    <label className="form-label">
                      Payment Mode
                    </label>

                    <select
                      className="form-select"
                      value={paymentMode}
                      onChange={(e) =>
                        setPaymentMode(
                          e.target.value
                        )
                      }
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Card</option>
                    </select>

                  </div>

                </div>

                {/* SUMMARY */}

                <div className="alert alert-light border mt-4">

                  <div className="row">

                    <div className="col-md-3">
                      <strong>Membership:</strong>
                      <br />
                      ₹{baseAmount}
                    </div>

                    <div className="col-md-3">
                      <strong>Discount:</strong>
                      <br />
                      ₹{discountAmount}
                    </div>

                    <div className="col-md-3">
                      <strong>Amount Paid:</strong>
                      <br />

                      <span className="text-success fw-bold">
                        ₹{finalAmount}
                      </span>
                    </div>

                    <div className="col-md-3">
                      <strong>Selected Expiry:</strong>
                      <br />

                      <span className="text-success fw-bold">
                        {formatDate(
                          newExpiryDate
                        )}
                      </span>
                    </div>

                  </div>

                </div>

                {/* BUTTONS */}

                <div className="mt-4 d-flex gap-3">

                  <button
                    type="button"
                    className="btn btn-success fw-bold"
                    onClick={handleRenew}
                    disabled={
                      renewSaving ||
                      !selectedPlan
                    }
                  >
                    {renewSaving
                      ? "Renewing..."
                      : "Renew Membership"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-warning fw-bold"
                    onClick={handleReceipt}
                  >
                    Generate Receipt
                  </button>

                </div>

              </div>
            </div>

          </>
        )}

        {searchId.trim() &&
          !member && (
            <div className="alert alert-warning">
              No member found for:
              <strong className="ms-1">
                {searchId}
              </strong>
            </div>
          )}

      </div>
    </Home>
  );
}

export default RenewMembership;
