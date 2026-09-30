import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import Home from "./Home";
import { useNavigate } from "react-router-dom";
import { useMember } from "./MemberContext";
import api from "../services/api";

function CreateUser() {
  const {
    addMember,
    selectBiometricUser,
    setRenewalData,
  } = useMember();

  const navigate = useNavigate();

  // ============================================================
  // TODAY
  // ============================================================

  const getToday = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = getToday();

  // ============================================================
  // STATE
  // ============================================================

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] =
    useState(true);
  const [plansError, setPlansError] = useState("");

  const [saving, setSaving] =
    useState(false);
  const [biometricUsers, setBiometricUsers] = useState([]);
  const [biometricUsersLoading, setBiometricUsersLoading] = useState(true);
  const [biometricUsersError, setBiometricUsersError] = useState("");

  // ============================================================
  // FORM
  // ============================================================

  const [form, setForm] = useState({
    id: "",
    name: "",
    mobile: "",
    gender: "",
    dob: "",
    emergency: "",
    address: "",
    planId: "",

    // ==========================================================
    // MANUAL MEMBERSHIP DATES
    // ==========================================================

    startDate: today,
    expiryDate: "",

    discount: "",
    paymentMode: "Cash",
    admissionFee: true,
  });

  // ============================================================
  // NORMALIZE BIOMETRIC ID
  // ============================================================

  const normalizeBiometricId = useCallback(
    (value) => {
      const text = String(
        value ?? ""
      ).trim();

      if (!text) return "";

      return text.replace(
        /^0+(\d)/,
        "$1"
      );
    },
    []
  );

  // ============================================================
  // LOAD MEMBERSHIP PLANS
  // ============================================================

  const loadMembershipPlans = useCallback(async () => {
    setPlansError("");
    setPlansLoading(true);

    try {
      const response = await api.get("/plans");
      const payload = response?.data;
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.plans)
          ? payload.plans
          : Array.isArray(payload)
            ? payload
            : null;

      if (!rows) {
        throw new Error("The membership plans response was not a list.");
      }

      // The API normally returns active rows only. Keep this check in the
      // client too so an inactive plan is never selectable if another API
      // implementation returns the full table.
      const activePlans = rows.filter(
        (plan) => plan?.is_active === true || plan?.isActive === true
      );

      setPlans(activePlans);
      setForm((previous) => ({
        ...previous,
        planId: activePlans.some((plan) => String(plan.id) === String(previous.planId))
          ? previous.planId
          : activePlans[0]?.id || "",
      }));
    } catch (error) {
      console.error("Failed to load membership plans:", error);
      setPlans([]);
      setPlansError(
        error.response?.status === 401
          ? "Your session has expired. Sign in again to load membership plans."
          : error.response?.status === 403
            ? "Administrator access is required to load membership plans."
            : error.response
              ? `Unable to load membership plans. ${error.response.data?.message || "The server could not read the plan records."}`
              : error.message?.includes("response was not a list")
                ? "Unable to load membership plans because the server returned an unexpected response."
                : "Unable to reach the server to load membership plans. Check your connection and try again."
      );
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembershipPlans();
  }, [loadMembershipPlans]);

  useEffect(() => {
    let mounted = true;

    const loadBiometricUsers = async () => {
      try {
        setBiometricUsersLoading(true);
        setBiometricUsersError("");
        const response = await api.get("/members/unregistered-biometric-users");
        const rows = Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
        if (!mounted) return;
        setBiometricUsers(rows);
      } catch (error) {
        console.error("Failed to load unregistered biometric users:", error);
        if (mounted) {
          setBiometricUsersError(
            error.response?.data?.message ||
              "Could not load unregistered biometric users. Please try again."
          );
        }
      } finally {
        if (mounted) setBiometricUsersLoading(false);
      }
    };

    loadBiometricUsers();
    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleDiscountChange = (event) => {
    const value = event.target.value;
    if (value === "" || /^\d*(?:\.\d{0,2})?$/.test(value)) {
      setForm((previous) => ({ ...previous, discount: value }));
    }
  };

  // ============================================================
  // SELECTED PLAN
  // ============================================================

  const selectedPlan = plans.find(
    (plan) =>
      String(plan.id) ===
      String(form.planId)
  );

  // ============================================================
  // AMOUNTS
  // ============================================================

  const baseAmount = Number(
    selectedPlan?.price || 0
  );

  const admissionAmount =
    form.admissionFee ? 100 : 0;

  const discount =
    Number.isFinite(Number(form.discount)) && Number(form.discount) >= 0
      ? Number(form.discount)
      : 0;

  const finalAmount = Math.max(
    0,
    baseAmount +
      admissionAmount -
      discount
  );

  // ============================================================
  // DURATION LABEL
  // ============================================================

  const getDurationLabel = (
    durationDays
  ) => {
    const days =
      Number(durationDays);

    if (!Number.isFinite(days) || days <= 0) {
      return "Membership";
    }

    if (days % 365 === 0) {
      const years = days / 365;
      return `${years} ${years === 1 ? "Year" : "Years"}`;
    }

    if (days % 30 === 0) {
      const months = days / 30;
      return `${months} ${months === 1 ? "Month" : "Months"}`;
    }

    return `${days} ${days === 1 ? "Day" : "Days"}`;
  };

  // ============================================================
  // PLAN NAME CHANGE
  // ============================================================

  const handlePlanChange = (event) => {
    const planId = event.target.value;
    setForm((previous) => ({
      ...previous,
      planId,
    }));
  };

  const handleBiometricUserChange = (event) => {
    const id = event.target.value;
    const selectedUser = biometricUsers.find(
      (user) => String(user.biometric_id) === id
    );
    setForm((previous) => ({
      ...previous,
      id,
      name: selectedUser?.name || "",
    }));
    selectBiometricUser(id);
  };

  // ============================================================
  // CREATE MEMBER
  // ============================================================

  const handleCreate = async () => {
    // ========================================================
    // VALIDATION
    // ========================================================

    if (!form.id.trim()) {
      alert(
        "Please enter a biometric user ID."
      );

      return;
    }

    if (!form.name.trim()) {
      alert(
        "Please enter member name."
      );

      return;
    }

    if (!form.mobile.trim()) {
      alert(
        "Please enter mobile number."
      );

      return;
    }

    if (!form.planId) {
      alert(
        "Please select a membership plan."
      );

      return;
    }

    if (!selectedPlan || plansError) {
      alert(plansError || "Please select an active membership plan.");
      return;
    }

    if (!Number.isFinite(discount) || discount < 0) {
      alert("Discount must be a non-negative amount.");
      return;
    }

    if (discount > baseAmount) {
      alert("Discount cannot be greater than the membership amount.");
      return;
    }

    // ========================================================
    // MANUAL START DATE
    // ========================================================

    if (!form.startDate) {
      alert(
        "Please select membership start date."
      );

      return;
    }

    // ========================================================
    // MANUAL EXPIRY DATE
    // ========================================================

    if (!form.expiryDate) {
      alert(
        "Please select membership expiry date."
      );

      return;
    }

    // ========================================================
    // DATE VALIDATION
    // ========================================================

    if (
      new Date(form.expiryDate) <
      new Date(form.startDate)
    ) {
      alert(
        "Membership expiry date cannot be before start date."
      );

      return;
    }

    // ========================================================
    // NORMALIZED BIOMETRIC ID
    // ========================================================

    const selectedId =
      normalizeBiometricId(
        form.id
      );

    // ========================================================
    // EMPLOYEE CODE
    //
    // BIOMETRIC USER ID IS THE SOURCE OF TRUTH.
    //
    // NEVER use the generated:
    //
    // KM-2026-XXXXXX
    //
    // when biometric_user_id is available.
    // ========================================================

    const employeeCode = selectedId;

    if (!employeeCode) {
      alert(
        "Employee Code is missing. Cannot create member."
      );

      return;
    }

    // ========================================================
    // CREATE MEMBER
    // ========================================================

    try {
      setSaving(true);

      console.log(
        "Creating biometric member:",
        {
          biometricUserId:
            selectedId,

          employeeCode:
            employeeCode,

          fullName:
            form.name.trim(),

          dateOfBirth:
            form.dob || null,

          planId:
            form.planId,

          startDate:
            form.startDate,

          expiryDate:
            form.expiryDate,
        }
      );

      const response =
        await api.post(
          "/members/enroll",
          {
            // ==================================================
            // PERSONAL DETAILS
            // ==================================================

            fullName:
              form.name.trim(),

            phone:
              form.mobile.trim(),

            gender:
              form.gender
                ? form.gender.toLowerCase()
                : null,

            dateOfBirth:
              form.dob || null,

            address:
              form.address.trim() ||
              null,

            emergencyContactName:
              form.emergency.trim() ||
              null,

            // ==================================================
            // BIOMETRIC MACHINE
            // ==================================================

            biometricUserId:
              selectedId,

            // ==================================================
            // EMPLOYEE CODE
            //
            // IMPORTANT:
            //
            // Employee Code is the public Member Code.
            //
            // Do NOT generate:
            //
            // KM-2026-XXXXXX
            // ==================================================

            memberCode:
              employeeCode,

            employeeCode:
              employeeCode,

            // ==================================================
            // MEMBERSHIP
            //
            // IMPORTANT: startDate and expiryDate below are the
            // EXACT dates the user picked in the form. The backend
            // must store these as-is and must NOT recalculate
            // expiryDate from the plan's duration_days. If your
            // /members/enroll endpoint currently overrides the
            // sent expiryDate with a computed one, that is a
            // backend bug — it needs to persist the value sent
            // here unchanged.
            // ==================================================

            planId:
              form.planId,

            // EXACT USER SELECTED START DATE
            startDate:
              form.startDate,

            // EXACT USER SELECTED EXPIRY DATE
            expiryDate:
              form.expiryDate,

            // ==================================================
            // PAYMENT
            // ==================================================

            baseAmount:
              baseAmount,

            admissionFee:
              admissionAmount,

            discount:
              discount,

            amount:
              finalAmount,

            paymentMethod:
              form.paymentMode === "Bank"
                ? "bank_transfer"
                : form.paymentMode.toLowerCase(),
          }
        );

      const data =
        response?.data || {};

      // ========================================================
      // RESPONSE
      // ========================================================

      const enrolledMember =
        data?.data?.member;

      if (!enrolledMember) {
        console.error(
          "Invalid enroll response:",
          data
        );

        throw new Error(
          "Member was not returned after enrollment."
        );
      }

      // ========================================================
      // PUBLIC EMPLOYEE CODE
      //
      // Prefer actual biometric_user_id FIRST.
      //
      // This prevents:
      //
      // KM-2026-XXXXXX
      //
      // from becoming the displayed Employee Code.
      // ========================================================

      const returnedEmployeeCode =
        String(
          enrolledMember.biometric_user_id ??
            enrolledMember.employee_code ??
            enrolledMember.member_code ??
            employeeCode
        ).trim();

      const savedMembership = data?.data?.membership;
      const finalExpiryDate =
        savedMembership?.end_date ||
        form.expiryDate ||
        enrolledMember.membership_end_date ||
        enrolledMember.end_date ||
        "";

      const finalStartDate =
        savedMembership?.start_date ||
        enrolledMember.membership_start_date ||
        enrolledMember.start_date ||
        form.startDate ||
        "";

      // ========================================================
      // ADD TO MEMBER CONTEXT
      // ========================================================

      addMember({
        // ======================================================
        // PUBLIC ID
        //
        // SHOW EMPLOYEE CODE EVERYWHERE.
        // ======================================================

        id:
          returnedEmployeeCode,

        // ======================================================
        // INTERNAL DATABASE UUID
        // ======================================================

        memberId:
          enrolledMember.id,

        // ======================================================
        // MEMBER CODE = EMPLOYEE CODE
        // ======================================================

        memberCode:
          returnedEmployeeCode,

        employeeCode:
          returnedEmployeeCode,

        // ======================================================
        // PERSONAL DETAILS
        // ======================================================

        name:
          enrolledMember.full_name,

        mobile:
          enrolledMember.phone ||
          "",

        gender:
          enrolledMember.gender ||
          "",

        dob:
          enrolledMember.date_of_birth ||
          "",

        address:
          enrolledMember.address ||
          "",

        emergency:
          enrolledMember.emergency_contact_name ||
          "",

        // ======================================================
        // MEMBERSHIP
        // ======================================================

        plan:
          selectedPlan?.name ||
          "Membership",

        durationDays:
          selectedPlan?.duration_days ||
          null,

        duration:
          getDurationLabel(
            selectedPlan?.duration_days
          ),

        // ======================================================
        // EXACT MANUAL START DATE
        // ======================================================

        startDate:
          finalStartDate,

        joinDate:
          finalStartDate,

        // ======================================================
        // EXACT MANUAL EXPIRY DATE
        //
        // form.expiryDate wins — see finalExpiryDate above.
        // ======================================================

        expiryDate:
          finalExpiryDate,

        // ======================================================
        // PAYMENT
        // ======================================================

        baseAmount:
          data?.data?.payment?.base_amount ?? baseAmount,

        admissionFee:
          data?.data?.payment?.admission_fee ?? admissionAmount,

        discount:
          data?.data?.payment?.discount ?? discount,

        finalAmount:
          data?.data?.payment?.amount ?? finalAmount,

        paymentMode:
          form.paymentMode,

        // ======================================================
        // STATUS
        // ======================================================

        membershipStatus:
          data?.data?.membership?.status || "",

        biometricSyncAction:
          enrolledMember.biometric_sync_action || "",

        biometricSyncStatus:
          enrolledMember.biometric_sync_status || "",

        biometricSyncError:
          enrolledMember.biometric_sync_error || "",

        // ======================================================
        // BIOMETRIC
        // ======================================================

        biometricUserId:
          selectedId,

        biometricMachineMember:
          true,
      });

      // ========================================================
      // RECEIPT
      //
      // IMPORTANT:
      // Receipt gets the SAME Employee Code and the SAME
      // manually selected expiry date (finalExpiryDate).
      // ========================================================

      const receiptData = {
        receiptType:
          "new_membership",

        paymentId:
          data?.data?.payment?.id || "",

        paymentDate:
          data?.data?.payment?.paid_at || new Date().toISOString(),

        // Internal UUID
        memberId:
          enrolledMember.id,

        // ======================================================
        // PUBLIC EMPLOYEE CODE
        // ======================================================

        memberCode:
          returnedEmployeeCode,

        employeeCode:
          returnedEmployeeCode,

        name:
          enrolledMember.full_name,

        mobile:
          enrolledMember.phone ||
          "",

        plan:
          selectedPlan?.name ||
          "",

        duration:
          getDurationLabel(
            selectedPlan?.duration_days
          ),

        // ======================================================
        // EXACT MANUAL START DATE
        // ======================================================

        startDate:
          finalStartDate,

        // ======================================================
        // EXACT MANUAL EXPIRY DATE
        // ======================================================

        expiryDate:
          finalExpiryDate,

        endDate:
          finalExpiryDate,

        // ======================================================
        // PAYMENT
        // ======================================================

        baseAmount:
          data?.data?.payment?.base_amount ?? baseAmount,

        admissionFee:
          data?.data?.payment?.admission_fee ?? admissionAmount,

        discount:
          data?.data?.payment?.discount ?? discount,

        finalAmount:
          data?.data?.payment?.amount ?? finalAmount,

        paymentMode:
          data?.data?.payment?.payment_method || form.paymentMode,

        paymentStatus:
          data?.data?.payment?.status || "completed",

        membershipStatus:
          data?.data?.membership?.status || "active",

        biometricUserId:
          selectedId,
      };

      // ========================================================
      // REMOVE CREATED USER FROM CREATE USER LIST
      // ========================================================

      // ========================================================
      // CLEAR RENEWAL
      // ========================================================

      setRenewalData(null);

      // ========================================================
      // SUCCESS
      // ========================================================

      alert(
        `Member ${form.name} created successfully.\nEmployee Code: ${returnedEmployeeCode}\nStart Date: ${finalStartDate}\nExpiry Date: ${finalExpiryDate}`
      );

      navigate("/receipt", {
        state: {
          receiptData,
        },
      });

    } catch (error) {
      console.error(
        "Create member error:",
        error
      );

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Unable to create member.";

      alert(message);

    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Home>
      <div className="container">

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="mb-4">
          <h2 className="fw-bold mb-0">
            Create New Member
          </h2>
        </div>

        <div className="card mb-3">
          <div className="card-header bg-warning">
            <strong>Personal Details</strong>
          </div>
          <div className="card-body row g-3">
            <div className="col-md-4">
              <label className="form-label fw-bold">
                Select Biometric User
              </label>
              <select
                name="id"
                className="form-control"
                value={form.id}
                onChange={handleBiometricUserChange}
                disabled={biometricUsersLoading || biometricUsers.length === 0}
              >
                <option value="">
                  {biometricUsersLoading
                    ? "Loading biometric users..."
                    : biometricUsers.length
                      ? "Select Biometric User"
                      : "No unregistered biometric users available"}
                </option>
                {biometricUsers.map((user) => (
                  <option key={String(user.biometric_id)} value={String(user.biometric_id)}>
                    {user.name || "Unnamed user"} — Biometric ID: {user.biometric_id}
                  </option>
                ))}
              </select>
              <small className="text-muted">
                This Employee Code will be used as the Member ID everywhere.
              </small>
              {biometricUsersError && (
                <div className="text-danger small mt-1" role="alert">
                  {biometricUsersError}
                </div>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">Member Name</label>
              <input
                className="form-control"
                value={form.name}
                readOnly
                placeholder="Select a biometric user"
              />
            </div>

            {/* ================================================= */}
            {/* MOBILE */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Mobile Number
              </label>

              <input
                name="mobile"
                className="form-control"
                placeholder="Enter mobile number"
                value={form.mobile}
                onChange={handleChange}
              />

            </div>

            {/* ================================================= */}
            {/* GENDER */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Gender
              </label>

              <select
                name="gender"
                className="form-select"
                value={form.gender}
                onChange={handleChange}
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

            {/* ================================================= */}
            {/* BIRTH DATE */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Birth Date
              </label>

              <input
                type="date"
                name="dob"
                className="form-control"
                value={form.dob}
                onChange={handleChange}
              />

            </div>

            {/* ================================================= */}
            {/* ADDRESS */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Address
              </label>

              <input
                name="address"
                className="form-control"
                placeholder="Enter address"
                value={form.address}
                onChange={handleChange}
              />

            </div>

            {/* ================================================= */}
            {/* EMERGENCY CONTACT */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Emergency Contact
              </label>

              <input
                name="emergency"
                className="form-control"
                placeholder="Emergency contact"
                value={form.emergency}
                onChange={handleChange}
              />

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* MEMBERSHIP */}
        {/* ================================================== */}

        <div className="card mb-3">

          <div className="card-header bg-success text-white">

            <strong>
              Membership
            </strong>

          </div>

          <div className="card-body row g-3">

            {/* ================================================= */}
            {/* START DATE */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Membership Start Date
              </label>

              <input
                type="date"
                name="startDate"
                className="form-control"
                value={form.startDate}
                onChange={handleChange}
              />

              <small className="text-muted">
                Select the exact membership start date.
              </small>

            </div>

            {/* ================================================= */}
            {/* EXPIRY DATE */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Membership Expiry Date
              </label>

              <input
                type="date"
                name="expiryDate"
                className="form-control"
                value={form.expiryDate}
                min={
                  form.startDate ||
                  undefined
                }
                onChange={handleChange}
                required
              />

              <small className="text-muted">
                Select the exact expiry date manually. This is
                the date that will be saved — it is not
                recalculated from plan duration.
              </small>

            </div>

            {/* ================================================= */}
            {/* PLAN NAME */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Membership Plan
              </label>

              <select
                className="form-select"
                value={form.planId}
                onChange={handlePlanChange}
                disabled={
                  plansLoading ||
                  Boolean(plansError) ||
                  plans.length === 0
                }
              >
                <option value="">
                  {plansLoading
                    ? "Loading membership plans..."
                    : plansError
                      ? "Plans could not be loaded"
                      : plans.length === 0
                        ? "No active plans configured"
                        : "Select a membership plan"}
                </option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {getDurationLabel(plan.duration_days)} - ₹{Number(plan.price).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>

              {plansError ? (
                <div className="text-danger small mt-2" role="alert">
                  {plansError}{" "}
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={loadMembershipPlans}>
                    Try again
                  </button>
                </div>
              ) : !plansLoading && plans.length === 0 ? (
                <small className="text-muted d-block mt-2">
                  No active membership plans are configured. Activate a plan in the membership plan records before creating a member.
                </small>
              ) : null}

            </div>

            {/* ================================================= */}
            {/* DURATION */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Duration
              </label>

              <input
                className="form-control"
                value={selectedPlan ? getDurationLabel(selectedPlan.duration_days) : ""}
                placeholder={plansLoading ? "Loading..." : "Select a plan first"}
                readOnly
                disabled={!selectedPlan}
              />

              <small className="text-muted">
                Duration is informational only, for pricing.
                The manually selected expiry date above is
                always what gets saved.
              </small>

            </div>

            {/* ================================================= */}
            {/* BASE AMOUNT */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Membership Amount
              </label>

              <input
                className="form-control"
                value={baseAmount}
                readOnly
              />

            </div>

            {/* ================================================= */}
            {/* DISCOUNT */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Discount
              </label>

              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={baseAmount || undefined}
                step="0.01"
                name="discount"
                className="form-control"
                placeholder="Discount"
                value={form.discount}
                onChange={handleDiscountChange}
              />

            </div>

            {/* ================================================= */}
            {/* ADMISSION FEE */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Admission Fee
              </label>

              <div className="form-check mt-2">

                <input
                  type="checkbox"
                  name="admissionFee"
                  checked={
                    form.admissionFee
                  }
                  onChange={handleChange}
                  className="form-check-input"
                  id="admissionFee"
                />

                <label
                  className="form-check-label"
                  htmlFor="admissionFee"
                >
                  Add Admission Fee ₹100
                </label>

              </div>

            </div>

            {/* ================================================= */}
            {/* FINAL AMOUNT */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Final Amount
              </label>

              <input
                className="form-control fw-bold"
                value={finalAmount}
                readOnly
              />

            </div>

            {/* ================================================= */}
            {/* PAYMENT MODE */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Payment Mode
              </label>

              <select
                name="paymentMode"
                className="form-select"
                value={form.paymentMode}
                onChange={handleChange}
              >

                <option value="Cash">
                  Cash
                </option>

                <option value="UPI">
                  UPI
                </option>

                <option value="Card">
                  Card
                </option>

                <option value="Bank">
                  Bank Transfer
                </option>

              </select>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* CREATE BUTTON */}
        {/* ================================================== */}

        <button
          type="button"
          className="btn btn-warning btn-lg mb-5"
          onClick={handleCreate}
          disabled={
            saving ||
            plansLoading ||
            Boolean(plansError) ||
            !selectedPlan ||
            biometricUsersLoading ||
            !form.id.trim() ||
            !form.planId ||
            !form.startDate ||
            !form.expiryDate
          }
        >
          {saving
            ? "Creating Member..."
            : "Create Member"}
        </button>

      </div>
    </Home>
  );
}

export default CreateUser;
