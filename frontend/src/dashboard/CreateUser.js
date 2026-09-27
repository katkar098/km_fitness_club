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
    selectedBiometricId,
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

  const [biometricUsers, setBiometricUsers] =
    useState([]);

  const [biometricLoading, setBiometricLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [machineUserCount, setMachineUserCount] =
    useState(0);

  const [registeredUserCount, setRegisteredUserCount] =
    useState(0);

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

  useEffect(() => {
    let mounted = true;

    const loadPlans = async () => {
      try {
        setPlansLoading(true);

        const response =
          await api.get("/plans");

        const data =
          response?.data || {};

        const activePlans =
          Array.isArray(data?.data)
            ? data.data.filter(
                (plan) =>
                  plan.is_active !== false
              )
            : [];

        if (!mounted) return;

        setPlans(activePlans);

        setForm((previous) => ({
          ...previous,

          planId:
            previous.planId ||
            activePlans[0]?.id ||
            "",
        }));
      } catch (error) {
        console.error(
          "Failed to load membership plans:",
          error
        );

        if (mounted) {
          alert(
            error.response?.data?.message ||
              "Could not load membership plans."
          );
        }
      } finally {
        if (mounted) {
          setPlansLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // LOAD USERS DIRECTLY FROM BIOMETRIC MACHINE
  // ============================================================

  /*
   * IMPORTANT:
   *
   * This page does NOT use old eTimeTrackLite members.
   *
   * /biometric/users must return users directly from:
   *
   * 192.168.0.201:4370
   *
   * and exclude biometric IDs already registered
   * in the new Members system.
   */

  // ============================================================

  const loadBiometricUsers = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setBiometricLoading(true);
        }

        const response =
          await api.get(
            "/biometric/users"
          );

        const data =
          response?.data || {};

        const users =
          Array.isArray(data?.data)
            ? [...data.data]
            : [];

        // ========================================================
        // SORT BY BIOMETRIC EMPLOYEE CODE
        //
        // IMPORTANT:
        // biometric_user_id is the real Employee Code.
        // ========================================================

        users.sort((a, b) => {
          const idA = String(
            a.biometric_user_id ??
              a.employee_code ??
              ""
          ).trim();

          const idB = String(
            b.biometric_user_id ??
              b.employee_code ??
              ""
          ).trim();

          return idA.localeCompare(
            idB,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          );
        });

        setBiometricUsers(users);

        setMachineUserCount(
          Number(
            data.machineUserCount ??
              data.machine_user_count ??
              0
          )
        );

        setRegisteredUserCount(
          Number(
            data.registeredUserCount ??
              data.registered_user_count ??
              0
          )
        );

        console.log(
          "=========================================="
        );

        console.log(
          "BIOMETRIC MACHINE USERS:",
          data.machineUserCount
        );

        console.log(
          "REGISTERED NEW SYSTEM USERS:",
          data.registeredUserCount
        );

        console.log(
          "AVAILABLE USERS:",
          users.length
        );

        console.log(
          "BIOMETRIC USERS:",
          users
        );

        console.log(
          "=========================================="
        );
      } catch (error) {
        console.error(
          "Failed to load biometric users:",
          error
        );

        setBiometricUsers([]);
        setMachineUserCount(0);
        setRegisteredUserCount(0);

        alert(
          error.response?.data?.message ||
            "Unable to connect to biometric machine."
        );
      } finally {
        setBiometricLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // ============================================================
  // LOAD MACHINE USERS ON PAGE OPEN
  // ============================================================

  useEffect(() => {
    loadBiometricUsers(true);
  }, [loadBiometricUsers]);

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadBiometricUsers(true);
  };

  // ============================================================
  // SELECTED BIOMETRIC ID
  // ============================================================

  useEffect(() => {
    if (!selectedBiometricId) return;

    setForm((previous) => ({
      ...previous,
      id: selectedBiometricId,
    }));
  }, [selectedBiometricId]);

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

  // ============================================================
  // SELECTED PLAN
  // ============================================================

  const selectedPlan = plans.find(
    (plan) =>
      String(plan.id) ===
      String(form.planId)
  );

  const availablePlanNames = [
    ...new Set(
      plans
        .map((plan) => plan.name)
        .filter(Boolean)
    ),
  ];

  const selectedPlanName =
    selectedPlan?.name || "";

  const plansForSelectedName =
    plans.filter(
      (plan) =>
        plan.name === selectedPlanName
    );

  // ============================================================
  // SELECTED BIOMETRIC USER
  // ============================================================

  const selectedBiometricUser =
    biometricUsers.find(
      (user) =>
        normalizeBiometricId(
          user.biometric_user_id ??
            user.employee_code
        ) ===
        normalizeBiometricId(
          selectedBiometricId
        )
    );

  // ============================================================
  // IMPORTANT
  // ============================================================

  /*
   * DO NOT compare this list with old MemberContext members.
   *
   * The backend /biometric/users endpoint is responsible
   * for returning only machine users which are not already
   * registered in the NEW Members system.
   */

  // ============================================================

  const availableBiometricUsers =
    biometricUsers;

  // ============================================================
  // AMOUNTS
  // ============================================================

  const baseAmount = Number(
    selectedPlan?.price || 0
  );

  const admissionAmount =
    form.admissionFee ? 100 : 0;

  const discount =
    Number(form.discount) || 0;

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

    if (!Number.isFinite(days)) {
      return "Membership";
    }

    if (days >= 330) {
      return "1 Year";
    }

    if (days >= 160) {
      return "6 Months";
    }

    if (days >= 80) {
      return "3 Months";
    }

    return "1 Month";
  };

  // ============================================================
  // PLAN NAME CHANGE
  // ============================================================

  const handlePlanNameChange = (
    event
  ) => {
    const planName =
      event.target.value;

    const nextPlan = plans.find(
      (plan) =>
        plan.name === planName
    );

    setForm((previous) => ({
      ...previous,
      planId:
        nextPlan?.id || "",
    }));
  };

  // ============================================================
  // SELECT BIOMETRIC USER
  // ============================================================

  const selectBiometricUserFromDevice = (
    user
  ) => {
    // ========================================================
    // IMPORTANT
    //
    // BIOMETRIC USER ID HAS PRIORITY.
    //
    // Example:
    //
    // biometric_user_id = 4
    // employee_code     = KM-2026-4B763F
    //
    // Employee Code MUST become:
    //
    // 4
    // ========================================================

    const id = String(
      user.biometric_user_id ??
        user.employee_code ??
        ""
    ).trim();

    if (!id) {
      alert(
        "This biometric user does not have a valid Employee Code."
      );

      return;
    }

    // ========================================================
    // SELECT MACHINE USER
    // ========================================================

    selectBiometricUser(id);

    // ========================================================
    // NAME
    //
    // If machine doesn't have a name, show Employee Code.
    // User can change it before creating member.
    // ========================================================

    const machineName =
      user.full_name ||
      user.name ||
      "";

    const fallbackName =
      machineName.trim() ||
      id;

    // ========================================================
    // GENDER FORMAT
    // ========================================================

    let genderValue = "";

    if (user.gender) {
      const genderText =
        String(user.gender)
          .trim()
          .toLowerCase();

      genderValue =
        genderText.charAt(0).toUpperCase() +
        genderText.slice(1);
    }

    // ========================================================
    // AUTO FILL
    // ========================================================

    setForm((previous) => ({
      ...previous,

      id,

      name:
        machineName.trim()
          ? machineName
          : fallbackName,

      mobile:
        user.mobile ||
        "",

      gender:
        genderValue,

      dob:
        user.date_of_birth ||
        "",

      address:
        user.address ||
        "",

      emergency:
        user.emergency_contact_name ||
        "",

      // Keep manually selected membership
      // dates unchanged.
      startDate:
        previous.startDate ||
        today,

      expiryDate:
        previous.expiryDate ||
        "",
    }));
  };

  // ============================================================
  // CREATE MEMBER
  // ============================================================

  const handleCreate = async () => {
    // ========================================================
    // VALIDATION
    // ========================================================

    if (!selectedBiometricId) {
      alert(
        "Please select a biometric machine user."
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
        selectedBiometricId
      );

    // ========================================================
    // MAKE SURE USER STILL EXISTS
    // ========================================================

    const machineUser =
      biometricUsers.find(
        (user) =>
          normalizeBiometricId(
            user.biometric_user_id ??
              user.employee_code
          ) === selectedId
      );

    if (!machineUser) {
      alert(
        "This biometric user is no longer available. Please refresh the machine list."
      );

      return;
    }

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

    const employeeCode =
      String(
        machineUser.biometric_user_id ??
          selectedBiometricId ??
          machineUser.employee_code ??
          ""
      ).trim();

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
            selectedBiometricId,

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
              selectedBiometricId,

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
              form.paymentMode.toLowerCase(),
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

      // ========================================================
      // FINAL EXPIRY DATE
      //
      // IMPORTANT FIX:
      //
      // The date the user picked in the form (form.expiryDate)
      // is now the SOURCE OF TRUTH. It is used first, no matter
      // what the backend returns. The backend-calculated value
      // is only used as a last-resort fallback if, for some
      // reason, form.expiryDate is empty (which validation above
      // already prevents).
      //
      // Previously this checked the backend's auto-calculated
      // end_date FIRST, which silently overwrote the date you
      // manually chose. That is what caused the bug.
      // ========================================================

      const finalExpiryDate =
        form.expiryDate ||
        enrolledMember.membership_end_date ||
        enrolledMember.end_date ||
        data?.data?.expiryDate ||
        "";

      const finalStartDate =
        form.startDate ||
        enrolledMember.membership_start_date ||
        enrolledMember.start_date ||
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
          baseAmount,

        admissionFee:
          admissionAmount,

        discount:
          discount,

        finalAmount:
          finalAmount,

        paymentMode:
          form.paymentMode,

        // ======================================================
        // STATUS
        // ======================================================

        status:
          "Active",

        // ======================================================
        // BIOMETRIC
        // ======================================================

        biometricUserId:
          selectedBiometricId,

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
          baseAmount,

        admissionFee:
          admissionAmount,

        discount:
          discount,

        finalAmount:
          finalAmount,

        paymentMode:
          form.paymentMode,

        status:
          "Active",

        biometricUserId:
          selectedBiometricId,
      };

      localStorage.setItem(
        "km_receipt",
        JSON.stringify(
          receiptData
        )
      );

      localStorage.removeItem(
        "km_renewal_receipt"
      );

      // ========================================================
      // REMOVE CREATED USER FROM CREATE USER LIST
      // ========================================================

      setBiometricUsers(
        (previous) =>
          previous.filter(
            (user) =>
              normalizeBiometricId(
                user.biometric_user_id ??
                  user.employee_code
              ) !== selectedId
          )
      );

      // ========================================================
      // UPDATE COUNT
      // ========================================================

      setRegisteredUserCount(
        (previous) =>
          previous + 1
      );

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

          <div className="d-flex justify-content-between align-items-center">

            <h2 className="fw-bold mb-0">
              Create New Member
            </h2>

            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh Machine"}
            </button>

          </div>

        </div>

        {/* ================================================== */}
        {/* BIOMETRIC MACHINE USERS */}
        {/* ================================================== */}

        <div className="card mb-3">

          <div className="card-header bg-dark text-white">

            <div className="d-flex justify-content-between align-items-center">

              <strong>
                Biometric Machine Users
              </strong>

              <span>
                {machineUserCount} on machine
              </span>

            </div>

          </div>

          <div className="card-body">

            {/* MACHINE INFORMATION */}

            <div className="alert alert-info">

              <div>
                <strong>
                  Source:
                </strong>{" "}
                Biometric Machine
              </div>

              <div>
                <strong>
                  Device:
                </strong>{" "}
                192.168.0.201:4370
              </div>

              <div>
                <strong>
                  Users on machine:
                </strong>{" "}
                {machineUserCount}
              </div>

              <div>
                <strong>
                  Already registered:
                </strong>{" "}
                {registeredUserCount}
              </div>

              <div>
                <strong>
                  New users shown:
                </strong>{" "}
                {availableBiometricUsers.length}
              </div>

            </div>

            {/* USER TABLE */}

            <div className="table-responsive">

              <table className="table table-hover">

                <thead>

                  <tr>

                    <th>
                      Employee
                    </th>

                    <th>
                      Employee Code
                    </th>

                    <th>
                      Select
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {biometricLoading ? (

                    <tr>

                      <td
                        colSpan="3"
                        className="text-center text-muted py-4"
                      >
                        Reading users directly from
                        biometric machine...
                      </td>

                    </tr>

                  ) : availableBiometricUsers.length > 0 ? (

                    availableBiometricUsers.map(
                      (user) => {

                        // ==================================================
                        // BIOMETRIC USER ID IS THE REAL EMPLOYEE CODE
                        // ==================================================

                        const userId =
                          normalizeBiometricId(
                            user.biometric_user_id ??
                              user.employee_code
                          );

                        const selectedId =
                          normalizeBiometricId(
                            selectedBiometricId
                          );

                        const isSelected =
                          userId ===
                          selectedId;

                        // ====================================
                        // DISPLAY NAME
                        // ====================================

                        const displayName =
                          String(
                            user.full_name ??
                              user.name ??
                              ""
                          ).trim() ||
                          String(
                            user.biometric_user_id ??
                              user.employee_code ??
                              userId
                          ).trim();

                        return (
                          <tr
                            key={userId}
                          >

                            <td>

                              <strong>
                                {displayName}
                              </strong>

                              {user.card_no ? (
                                <small className="d-block text-muted">
                                  Card:{" "}
                                  {user.card_no}
                                </small>
                              ) : null}

                            </td>

                            <td>
                              {/*
                               * IMPORTANT:
                               *
                               * Always show biometric_user_id first.
                               *
                               * If:
                               *
                               * biometric_user_id = 4
                               * employee_code = KM-2026-4B763F
                               *
                               * UI shows:
                               *
                               * 4
                               */}
                              {user.biometric_user_id ??
                                user.employee_code ??
                                "Not available"}
                            </td>

                            <td>

                              <button
                                type="button"
                                className={
                                  `btn btn-sm ${
                                    isSelected
                                      ? "btn-success"
                                      : "btn-warning"
                                  }`
                                }
                                onClick={() =>
                                  selectBiometricUserFromDevice(
                                    user
                                  )
                                }
                              >
                                {isSelected
                                  ? "Selected"
                                  : "Select"}
                              </button>

                            </td>

                          </tr>
                        );
                      }
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="3"
                        className="text-center text-muted py-4"
                      >

                        <div>
                          No new biometric users found.
                        </div>

                        <div className="small mt-2">
                          Click "Refresh Machine" to
                          read the biometric machine again.
                        </div>

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* SELECTED USER */}
        {/* ================================================== */}

        {selectedBiometricId && (

          <div className="alert alert-info">

            Selected Employee:

            {" "}

            <strong>
              {form.name ||
                selectedBiometricId}
            </strong>

            {" "}

            | Employee Code:

            {" "}

            <strong>
              {selectedBiometricId}
            </strong>

          </div>

        )}

        {/* ================================================== */}
        {/* PERSONAL DETAILS */}
        {/* ================================================== */}

        <div className="card mb-3">

          <div className="card-header bg-warning">

            <strong>
              Personal Details
            </strong>

          </div>

          <div className="card-body row g-3">

            {/* ================================================= */}
            {/* EMPLOYEE CODE */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Employee Code
              </label>

              <input
                className="form-control"
                value={
                  /*
                   * IMPORTANT:
                   *
                   * biometric_user_id MUST come first.
                   *
                   * This prevents:
                   *
                   * KM-2026-4B763F
                   *
                   * from being displayed when
                   * biometric_user_id is 4.
                   */
                  selectedBiometricUser?.biometric_user_id ??
                  selectedBiometricId ??
                  selectedBiometricUser?.employee_code ??
                  ""
                }
                readOnly
              />

              <small className="text-muted">
                This Employee Code will be used as
                the Member ID everywhere.
              </small>

            </div>

            {/* ================================================= */}
            {/* NAME */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Member Name
              </label>

              <input
                name="name"
                className="form-control"
                placeholder="Enter member name"
                value={form.name}
                onChange={handleChange}
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
                value={selectedPlanName}
                onChange={
                  handlePlanNameChange
                }
                disabled={
                  plansLoading ||
                  plans.length === 0
                }
              >

                {plans.length === 0 ? (

                  <option value="">
                    No active plans available
                  </option>

                ) : (

                  availablePlanNames.map(
                    (planName) => (

                      <option
                        key={planName}
                        value={planName}
                      >
                        {planName}
                      </option>

                    )
                  )

                )}

              </select>

            </div>

            {/* ================================================= */}
            {/* DURATION */}
            {/* ================================================= */}

            <div className="col-md-4">

              <label className="form-label fw-bold">
                Duration
              </label>

              <select
                name="planId"
                className="form-select"
                value={form.planId}
                onChange={handleChange}
                disabled={
                  plansLoading ||
                  plansForSelectedName.length ===
                    0
                }
              >

                {plansForSelectedName.map(
                  (plan) => (

                    <option
                      key={plan.id}
                      value={plan.id}
                    >
                      {getDurationLabel(
                        plan.duration_days
                      )}
                    </option>

                  )
                )}

              </select>

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
                type="text"
                inputMode="numeric"
                name="discount"
                className="form-control"
                placeholder="Discount"
                value={form.discount}
                onChange={(event) => {

                  const value =
                    event.target.value.replace(
                      /\D/g,
                      ""
                    );

                  setForm((previous) => ({
                    ...previous,
                    discount: value,
                  }));

                }}
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
            !selectedBiometricId ||
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
