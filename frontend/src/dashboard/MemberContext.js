import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

import api from "../services/api";

// ============================================================
// CONTEXT
// ============================================================

const MemberContext = createContext();

export const useMember = () => useContext(MemberContext);

// ============================================================
// DATE HELPERS
// ============================================================

const IST_TIMEZONE = "Asia/Kolkata";

const formatDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const text = String(value).trim();

  const plainDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plainDateMatch) {
    return `${plainDateMatch[1]}-${plainDateMatch[2]}-${plainDateMatch[3]}`;
  }

  const indianMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (indianMatch) {
    return `${indianMatch[3]}-${indianMatch[2]}-${indianMatch[1]}`;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleDateString("en-CA", { timeZone: IST_TIMEZONE });
};

// ============================================================
// DURATION LABEL
// ============================================================

const getMembershipDurationLabel = (days) => {
  const value = Number(days);

  if (!Number.isFinite(value) || value <= 0) return "N/A";
  if (value >= 330) return "1 Year";
  if (value >= 160) return "6 Months";
  if (value >= 80) return "3 Months";
  return "1 Month";
};

// ============================================================
// NORMALIZE MEMBER
// ============================================================

const normalizeMember = (row) => {
  const employeeCode =
    row.biometric_user_id ||
    row.employee_code ||
    row.employeeCode ||
    row.memberCode ||
    "";

  const databaseId = row.id || "";

  const rawStartDate =
    row.membership_start_date ||
    row.start_date ||
    row.startDate ||
    row.membershipStartDate ||
    row.joinDate ||
    "";

  const rawExpiryDate =
    row.membership_end_date ||
    row.end_date ||
    row.expiryDate ||
    row.endDate ||
    row.membershipExpiryDate ||
    "";

  const startDate = formatDate(rawStartDate);
  const expiryDate = formatDate(rawExpiryDate);

  let durationDays = Number(
    row.duration_days ??
      row.plan_duration_days ??
      row.durationDays ??
      row.duration ??
      0
  );

  if (!durationDays && startDate && expiryDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const expiry = new Date(`${expiryDate}T00:00:00`);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(expiry.getTime())) {
      durationDays = Math.max(
        1,
        Math.round((expiry - start) / (1000 * 60 * 60 * 24)) + 1
      );
    }
  }

  const duration =
    durationDays > 0 ? getMembershipDurationLabel(durationDays) : "N/A";

  return {
    id: String(employeeCode || databaseId),

    memberId: databaseId,
    uuid: databaseId,
    databaseId,

    memberCode: String(employeeCode),
    employeeCode: String(employeeCode),

    name: row.full_name || row.name || "Unknown",
    fullName: row.full_name || row.name || "Unknown",
    mobile: row.phone || row.mobile || "",
    phone: row.phone || row.mobile || "",
    email: row.email || "",
    gender: row.gender || "",
    dob: row.date_of_birth || row.dob || "",
    dateOfBirth: row.date_of_birth || row.dob || "",
    address: row.address || "",
    emergency: row.emergency_contact_name || row.emergency || "",
    emergencyPhone: row.emergency_contact_phone || row.emergencyPhone || "",

    plan: row.plan_name || row.plan || "Gym Membership",
    duration,
    durationDays: durationDays || null,

    startDate,
    membershipStartDate: startDate,
    joinDate: startDate,

    expiryDate,
    membershipExpiryDate: expiryDate,
    endDate: expiryDate,

    start_date: startDate,
    end_date: expiryDate,
    membership_start_date: startDate,
    membership_end_date: expiryDate,

    finalAmount: Number(
      row.final_amount ??
        row.finalAmount ??
        row.total_amount ??
        row.totalAmount ??
        row.paid_amount ??
        row.paidAmount ??
        row.amount_paid ??
        row.amountPaid ??
        row.amount ??
        0
    ),

    baseAmount: Number(
      row.base_amount ??
        row.baseAmount ??
        row.membership_amount ??
        row.membershipAmount ??
        row.plan_amount ??
        row.planAmount ??
        0
    ),

    admissionFee: Number(row.admission_fee ?? row.admissionFee ?? 0),
    discount: Number(row.discount ?? 0),
    paymentMode: row.payment_method || row.paymentMode || "Cash",

    status: row.membership_status || row.status || "Active",
    membershipStatus: row.membership_status || row.status || "Active",

    biometricUserId:
      row.biometric_user_id || row.biometricUserId || String(employeeCode),
    biometricEnabled: row.biometric_enabled !== false,

    raw: row,
  };
};

// ============================================================
// TRANSACTION TYPE MAPPING
//
// Single source of truth for turning whatever the backend calls
// a payment (receipt_type / type) into the exact label strings
// Billing.jsx's getTransactionType()/isMembershipTransaction()/
// isOtherIncome() expect. Keeping this in one place means the
// membership / admission / other-income revenue buckets in
// Billing.jsx stay correct no matter which endpoint the row came
// from (GET /payments on load, or a POST /payments response after
// Add Income / renew).
// ============================================================

const getDisplayType = (row) => {
  const receiptType = String(row.receipt_type || row.type || "").toLowerCase();

  if (receiptType === "renewal") return "Renewal";
  if (receiptType === "other_income" || receiptType === "other income") {
    return "Other Income";
  }
  if (
    receiptType === "membership" ||
    receiptType === "new_membership" ||
    receiptType === "membership_payment"
  ) {
    return "Membership";
  }

  return row.type || "Membership";
};

// ============================================================
// NORMALIZE TRANSACTION
// ============================================================

const readBillingIncomeDetails = (row) => {
  const note = String(row.notes || "");
  const prefix = "KM_BILLING_INCOME_V1:";
  if (!note.startsWith(prefix)) return null;
  try {
    return JSON.parse(note.slice(prefix.length));
  } catch {
    return null;
  }
};

const normalizeTransaction = (row) => {
  const incomeDetails = readBillingIncomeDetails(row);
  return {
  id: row.id || row.transaction_id || "",

  // Registered-member link, when one exists. Left blank for an
  // other-income row that isn't tied to any member — Billing.jsx
  // is responsible for showing a stand-in ID for those, never a
  // registered member's real code getting overwritten.
  memberId: String(
    row.biometric_user_id ||
      row.employee_code ||
      row.member_code ||
      row.member_id ||
      row.memberId ||
      ""
  ),
  memberCode: String(
    row.biometric_user_id ||
      row.employee_code ||
      row.member_code ||
      ""
  ),

  memberName: row.full_name || row.memberName || "",
  name: incomeDetails?.name || row.name || row.full_name || row.memberName || row.description || row.notes || "Other Income",
  description: incomeDetails?.description ?? row.description ?? row.notes ?? "",

  type: getDisplayType(row),
  receipt_type: row.receipt_type || "",

  amount: Number(row.amount ?? 0),
  base_amount: Number(row.base_amount ?? row.baseAmount ?? 0),
  admission_fee: Number(row.admission_fee ?? row.admissionFee ?? 0),
  discount: Number(row.discount ?? 0),

  date: formatDate(row.paid_at || row.created_at || row.date),
  paidAt: row.paid_at || row.created_at || row.date || null,
  ledgerCode: String(row.transaction_reference || row.ledger_code || ""),

  status: row.status || "Paid",

  paymentMode: row.payment_method || row.paymentMode || "Cash",
  };
};

// ============================================================
// NORMALIZE PAYMENT HISTORY
// ============================================================

const normalizePaymentHistory = (row) => {
  const memberCode = String(row.member_code || row.employee_code || "");
  const rawMemberId = String(row.member_id || row.memberId || "");

  return {
    memberId: memberCode || rawMemberId,

    member_code: memberCode,
    employee_code: String(row.employee_code || row.member_code || ""),
    member_id: rawMemberId,

    type: getDisplayType(row),

    plan: row.plan_name || row.plan || (getDisplayType(row) === "Other Income" ? "Other Income" : "Gym Membership"),

    amount: Number(row.amount ?? 0),

    admissionFee: Number(row.admission_fee ?? 0),

    date: formatDate(row.paid_at || row.created_at || row.date),

    paymentMode: row.payment_method || row.paymentMode || "Cash",
  };
};

// ============================================================
// PROVIDER
// ============================================================

export function MemberProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedBiometricId, setSelectedBiometricId] = useState("");
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [renewalData, setRenewalData] = useState(null);

  const addAttendance = (attendance) => {
    setAttendanceHistory((prev) => [...prev, attendance]);
  };

  // ------------------------------------------------------------
  // LOAD BACKEND DATA
  // ------------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const loadBackendData = async () => {
      try {
        const [membersRes, paymentsRes, attendanceRes] = await Promise.all([
          api.get("/members?limit=1000"),
          api.get("/payments?limit=1000"),
          api.get("/attendance?limit=1000"),
        ]);

        const backendMembers = Array.isArray(membersRes?.data?.data)
          ? membersRes.data.data
          : [];

        const backendPayments = Array.isArray(paymentsRes?.data?.data)
          ? paymentsRes.data.data
          : [];

        const backendAttendance = Array.isArray(attendanceRes?.data?.data)
          ? attendanceRes.data.data
          : [];

        console.log(
          `Loaded ${backendMembers.length} members, ` +
            `${backendPayments.length} payments, ` +
            `${backendAttendance.length} attendance rows`
        );

        const normalizedMembers = backendMembers.map(normalizeMember);
        setMembers(normalizedMembers);

        setTransactions(backendPayments.map(normalizeTransaction));
        setPaymentHistory(backendPayments.map(normalizePaymentHistory));

        setAttendanceHistory(
          backendAttendance.map((row) => {
            const punchedAt = row.punched_at || row.date || "";

            const timeMatch = String(punchedAt).match(
              /(?:T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/
            );

            let checkIn = "-";

            if (timeMatch) {
              let hour = Number(timeMatch[1]);
              const minute = timeMatch[2];
              const period = hour >= 12 ? "pm" : "am";
              hour = hour % 12 || 12;
              checkIn = `${hour}:${minute} ${period}`;
            }

            return {
              memberId: String(
                row.member_code ||
                  row.employee_code ||
                  row.member_id ||
                  row.memberId ||
                  ""
              ),
              member_code: String(
                row.member_code || row.employee_code || row.member_id || ""
              ),
              employee_code: String(
                row.employee_code || row.member_code || ""
              ),
              member_id: String(
                row.member_id || row.memberId || row.member_code || ""
              ),
              date: formatDate(punchedAt),
              checkIn,
              rawPunchedAt: punchedAt,
            };
          })
        );
      } catch (error) {
        console.error("Failed to load backend data:", error);
      }
    };

    loadBackendData();
  }, []);

  const createdTxnIds = useRef(new Set());

  const addTransaction = (txn) => {
    setTransactions((prev) => [txn, ...prev]);
  };

  // ------------------------------------------------------------
  // ADD MEMBER
  // ------------------------------------------------------------
  const addMember = (member) => {
    setMembers((prev) => {
      const exists = prev.some((m) => String(m.id) === String(member.id));
      if (exists) return prev;
      return [member, ...prev];
    });

    const txnId = "TXN-" + member.id;

    setTransactions((prev) => {
      if (createdTxnIds.current.has(txnId)) return prev;

      const exists = prev.some((t) => t.id === txnId);
      if (exists) return prev;

      const txn = {
        id: txnId,
        memberId: member.id,
        memberCode: member.employeeCode || member.memberCode,
        memberName: member.name,
        type: "Membership",
        membershipAmount: Number(member.baseAmount || 0),
        admissionFee: Number(member.admissionFee || 0),
        discount: Number(member.discount || 0),
        amount: Number(member.finalAmount || 0),
        paymentMode: member.paymentMode,
        description: `${member.plan} - ${member.duration}`,
        date: member.joinDate || member.startDate,
        status: "Paid",
      };

      createdTxnIds.current.add(txnId);

      return [txn, ...prev];
    });

    setPaymentHistory((prev) => [
      ...prev,
      {
        memberId: member.id,
        member_code: String(member.memberCode || member.employeeCode || ""),
        employee_code: String(member.employeeCode || member.memberCode || ""),
        member_id: String(member.databaseId || member.memberId || ""),
        type: "Admission",
        plan: member.plan,
        amount: Number(member.finalAmount || 0),
        admissionFee: Number(member.admissionFee || 0),
        date: member.joinDate || member.startDate,
        paymentMode: member.paymentMode,
      },
    ]);
  };

  // ------------------------------------------------------------
  // RENEW MEMBERSHIP
  //
  // FIX: this previously only touched local state, so a renewal
  // (and the revenue it represents) vanished on refresh/restart.
  // The backend already has a dedicated, transactional endpoint
  // for this — POST /members/:id/renew — which expires the old
  // membership row, creates the new one, and records the payment
  // + receipt all in one DB transaction. This now just calls that
  // endpoint instead of re-implementing the logic client-side.
  //
  // renewalDetails must include a real `planId` (a plan UUID from
  // GET /plans) — the backend looks the plan up by id, not by
  // name. If your renewal form currently only collects a plan
  // *name*, have it fetch /plans and pass the matching id through
  // as renewalDetails.planId.
  // ------------------------------------------------------------
  const renewMembership = async (id, renewalDetails) => {
    const member = members.find((m) => String(m.id) === String(id));
    const memberDbId = member?.memberId || member?.databaseId || id;

    if (!renewalDetails.planId) {
      throw new Error(
        "renewMembership requires renewalDetails.planId (a plan id from GET /plans)"
      );
    }

    try {
      const { data } = await api.post(`/members/${memberDbId}/renew`, {
        planId: renewalDetails.planId,
        startDate: renewalDetails.startDate || renewalDetails.renewDate || undefined,
        expiryDate: renewalDetails.expiryDate || renewalDetails.newExpiryDate || undefined,
        amount: renewalDetails.finalAmount ?? undefined,
        paymentMethod: (renewalDetails.paymentMode || "cash").toLowerCase(),
        transactionReference: renewalDetails.transactionReference || undefined,
        notes: renewalDetails.notes || undefined,
      });

      const result = data?.data; // { member, membership, payment, receipt }
      const savedMember = result?.member;
      const savedMembership = result?.membership;
      const savedPayment = result?.payment;

      if (savedMember) {
        const normalizedSaved = normalizeMember({
          ...savedMember,
          membership_start_date: renewalDetails.startDate || savedMembership?.start_date,
          membership_end_date: renewalDetails.expiryDate || savedMembership?.end_date,
          plan_name: renewalDetails.plan,
          final_amount: savedPayment?.amount,
          payment_method: savedPayment?.payment_method,
        });

        setMembers((prev) =>
          prev.map((m) =>
            String(m.id) === String(id) ? { ...m, ...normalizedSaved, id: m.id } : m
          )
        );
      }

      setRenewalData({
        memberId: id,
        ...renewalDetails,
        startDate: renewalDetails.startDate || savedMembership?.start_date,
        expiryDate: renewalDetails.expiryDate || savedMembership?.end_date,
        receiptNumber: result?.receipt?.receipt_number || renewalDetails.receiptNumber || "",
        receiptId: result?.receipt?.id || "",
        paymentId: savedPayment?.id || "",
      });

      if (savedPayment) {
        const txRow = {
          ...savedPayment,
          full_name: member?.name,
          member_code: member?.employeeCode || member?.memberCode,
          receipt_type: "renewal",
        };

        const normalizedTxn = normalizeTransaction(txRow);
        setTransactions((prev) => [normalizedTxn, ...prev]);
        setPaymentHistory((prev) => [normalizePaymentHistory(txRow), ...prev]);

        return {
          transaction: normalizedTxn,
          member: savedMember,
          membership: savedMembership,
          payment: savedPayment,
          receipt: result?.receipt || null,
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to save renewal to backend:", error);
      throw error;
    }
  };

  // ------------------------------------------------------------
  // ADD OTHER INCOME (Billing "Add Income" form)
  //
  // FIX: previously handleAddIncome in Billing.jsx built a
  // client-only transaction object and called addTransaction(),
  // which only ever touched React state — so it disappeared on
  // refresh. This now POSTs to POST /payments (payment.routes.js)
  // and only adds the saved (server-returned) row to state, so
  // the ID and date match what's actually in the database.
  //
  // Field names/values match your validators exactly:
  //   - paymentMethod must be one of cash|card|upi|bank_transfer|other
  //   - paymentStatus must be one of pending|completed|failed|refunded
  //   - other income is always saved as a standalone payment.
  // ------------------------------------------------------------
  const addOtherIncome = async ({
    name,
    description,
    amount,
    status,
    paymentMethod = "cash",
  }) => {
    const payload = {
      receiptType: "other_income",
      amount: Number(amount),
      description: description || "",
      name,
      paymentMethod: String(paymentMethod).toLowerCase(),
      paymentStatus: status === "Paid" ? "completed" : "pending",
    };

    const { data } = await api.post("/payments", payload);

    const saved = data?.data || {
      id: "TXN-" + Date.now(),
      receipt_type: "other_income",
      name: payload.name,
      description: payload.description,
      amount: payload.amount,
      notes: payload.description,
      status: payload.paymentStatus,
      paid_at: new Date().toISOString(),
    };

    const tx = normalizeTransaction(saved);
    setTransactions((prev) => [tx, ...prev]);
    setPaymentHistory((prev) => [normalizePaymentHistory(saved), ...prev]);

    return tx;
  };

  // ------------------------------------------------------------
  // MARK TRANSACTION PAID
  //
  // FIX: markAsPaid in Billing.jsx used to only flip local state.
  // Now it updates the row on the backend first (PUT /payments/:id,
  // paymentStatus: 'completed'), so "Pending" other-income entries
  // stay marked Paid after a restart too.
  // ------------------------------------------------------------
  const markTransactionPaid = async (id) => {
    try {
      const { data } = await api.put(`/payments/${id}`, {
        paymentStatus: "completed",
      });

      const saved = data?.data;

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? saved
              ? normalizeTransaction(saved)
              : { ...t, status: "Paid" }
            : t
        )
      );
    } catch (error) {
      console.error("Failed to mark payment as paid on backend:", error);
      throw error;
    }
  };

  // ------------------------------------------------------------
  // DELETE MEMBER
  // ------------------------------------------------------------
  const deleteMember = (memberId) => {
    setMembers((prev) =>
      prev.filter(
        (m) =>
          String(m.memberId) !== String(memberId) &&
          String(m.id) !== String(memberId)
      )
    );
  };

  // ------------------------------------------------------------
  // UPDATE MEMBER
  // ------------------------------------------------------------
  const updateMember = async (updatedMember) => {
    const matchingMember = members.find((member) =>
      [member.id, member.memberCode, member.employeeCode].some(
        (value) =>
          value != null &&
          String(value) === String(updatedMember.id || updatedMember.memberCode || updatedMember.employeeCode)
      )
    );

    const memberId =
      updatedMember.memberId ||
      updatedMember.uuid ||
      updatedMember.supabaseId ||
      updatedMember.databaseId ||
      matchingMember?.memberId ||
      matchingMember?.databaseId;

    if (!memberId) {
      throw new Error(
        "This member is not linked to a database record, so the changes cannot be saved. Refresh the member list and try again."
      );
    }

    const wantsMembershipUpdate = Boolean(updatedMember.updateMembership);

    try {
      const payload = {
        fullName: updatedMember.name || updatedMember.fullName || "",
        phone: updatedMember.mobile || updatedMember.phone || "",
        email: updatedMember.email || "",
        gender: updatedMember.gender || "",
        dateOfBirth: updatedMember.dob || updatedMember.dateOfBirth || "",
        address: updatedMember.address || "",
        emergencyContactName: updatedMember.emergency || "",
        emergencyContactPhone: updatedMember.emergencyPhone || "",
        biometricUserId: updatedMember.biometricUserId || "",
        employeeCode:
          updatedMember.employeeCode || updatedMember.memberCode || "",
        memberCode:
          updatedMember.memberCode || updatedMember.employeeCode || "",
        status: updatedMember.status || "active",
        paymentMethod: updatedMember.paymentMode || "Cash",
        updateMembership: wantsMembershipUpdate,
      };

      if (wantsMembershipUpdate) {
        payload.plan = updatedMember.plan || "";
        payload.duration = updatedMember.duration || "";
        payload.startDate =
          updatedMember.startDate || updatedMember.joinDate || "";
        payload.expiryDate =
          updatedMember.expiryDate || updatedMember.endDate || "";
        payload.finalAmount = updatedMember.finalAmount ?? 0;
      }

      const { data } = await api.put(`/members/${memberId}`, payload);

      const savedMember = data?.data || updatedMember;
      const normalizedSaved = normalizeMember(savedMember);

      if (wantsMembershipUpdate) {
        const requestedStart = normalizeMember({
          startDate: payload.startDate,
        }).startDate;
        const requestedExpiry = normalizeMember({
          expiryDate: payload.expiryDate,
        }).expiryDate;

        if (
          normalizedSaved.startDate !== requestedStart ||
          normalizedSaved.expiryDate !== requestedExpiry
        ) {
          throw new Error(
            `Membership date save was not confirmed. Requested ${requestedStart} to ${requestedExpiry}; server returned ${normalizedSaved.startDate || "no start date"} to ${normalizedSaved.expiryDate || "no expiry date"}.`
          );
        }
      }

      setMembers((prev) =>
        prev.map((member) => {
          const same =
            String(member.memberId || member.databaseId || member.id) ===
            String(memberId);

          if (!same) return member;

          return {
            ...member,
            ...normalizedSaved,
            id: member.id,
            memberId: member.memberId || memberId,
            memberCode: normalizedSaved.memberCode,
            employeeCode: normalizedSaved.employeeCode,
            name: normalizedSaved.name,
            mobile: normalizedSaved.mobile,
            email: normalizedSaved.email,
            gender: normalizedSaved.gender,
            dob: normalizedSaved.dob,
            address: normalizedSaved.address,
            plan: normalizedSaved.plan,
            duration: normalizedSaved.duration,
            durationDays: normalizedSaved.durationDays,
            startDate: normalizedSaved.startDate,
            joinDate: normalizedSaved.startDate,
            expiryDate: normalizedSaved.expiryDate,
            endDate: normalizedSaved.expiryDate,
            membershipStartDate: normalizedSaved.startDate,
            membershipExpiryDate: normalizedSaved.expiryDate,
            paymentMode: normalizedSaved.paymentMode,
            finalAmount: normalizedSaved.finalAmount,
            emergency: normalizedSaved.emergency,
            status: normalizedSaved.status,
            biometricUserId: normalizedSaved.biometricUserId,
            raw: normalizedSaved.raw,
          };
        })
      );

      return normalizedSaved;
    } catch (error) {
      console.error("Failed to update member in backend:", error);
      throw error;
    }
  };

  return (
    <MemberContext.Provider
      value={{
        members,
        setMembers,
        addMember,
        updateMember,
        deleteMember,

        paymentHistory,
        setPaymentHistory,

        transactions,
        setTransactions,
        addTransaction,
        addOtherIncome,
        markTransactionPaid,

        attendanceHistory,
        setAttendanceHistory,
        addAttendance,

        renewMembership,
        renewalData,
        setRenewalData,

        selectedBiometricId,
        setSelectedBiometricId,
        selectBiometricUser: setSelectedBiometricId,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
}
