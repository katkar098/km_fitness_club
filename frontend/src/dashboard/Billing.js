import React, { useEffect, useMemo, useState } from "react";
import Home from "./Home";
import { useMember } from "./MemberContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function Billing() {
  const navigate = useNavigate();
  const { transactions, addOtherIncome, markTransactionPaid } =
    useMember();
  // =====================================================
  // PAYMENT HELPERS
  // =====================================================

  const getTransactionType = (tx) => {
    return String(
      tx.type ||
      tx.receipt_type ||
      tx.receiptType ||
      ""
    ).toLowerCase();
  };

  const isMembershipTransaction = (tx) => {
    const type = getTransactionType(tx);

    return (
      type === "membership" ||
      type === "new admission" ||
      type === "renewal" ||
      type === "new_membership" ||
      type === "membership_payment"
    );
  };

  const isOtherIncome = (tx) => {
    return getTransactionType(tx) === "other income";
  };

  const getPaymentStatus = (tx) => {
    return String(
      tx.status ||
      tx.payment_status ||
      tx.paymentStatus ||
      ""
    ).toLowerCase();
  };

  const isPaid = (tx) => {
    const status = getPaymentStatus(tx);

    return (
      status === "paid" ||
      status === "completed" ||
      status === "success" ||
      status === "successful" ||
      status === "succeeded"
    );
  };

  const getAmount = (tx) => {
    return Number(
      tx.amount ??
      tx.final_amount ??
      tx.finalAmount ??
      0
    );
  };

  const getBaseAmount = (tx) => {
    return Number(
      tx.base_amount ??
      tx.baseAmount ??
      tx.membershipAmount ??
      0
    );
  };

  const getDiscount = (tx) => {
    return Number(
      tx.discount ??
      0
    );
  };

  const getAdmissionFee = (tx) => {
    const explicitAdmission =
      tx.admission_fee ??
      tx.admissionFee;

    if (
      explicitAdmission !== undefined &&
      explicitAdmission !== null &&
      explicitAdmission !== ""
    ) {
      return Math.max(0, Number(explicitAdmission) || 0);
    }

    const type = getTransactionType(tx);

    if (type === "renewal") {
      return 0;
    }

    if (!isMembershipTransaction(tx)) {
      // Other Income (or any non-membership row) never has an
      // admission component, regardless of what amount/base/discount
      // happen to be set to.
      return 0;
    }

    const amount = getAmount(tx);
    const base = getBaseAmount(tx);
    const discount = getDiscount(tx);

    const calculatedAdmission =
      amount - base + discount;

    return Math.max(0, calculatedAdmission);
  };

  // ------------------------------------------------------------
  // REVENUE BREAKDOWN FOR A SINGLE TRANSACTION
  //
  // Single source of truth for "which column does this money go
  // in" - used by both the on-screen Monthly Revenue table and the
  // Excel export, so they can never disagree again.
  //
  //   new_membership / membership / membership_payment:
  //     membership = base - discount (or amount - admission if no base)
  //     admission  = admission fee
  //     otherIncome = 0
  //
  //   renewal:
  //     membership = base - discount (or amount if no base)
  //     admission  = 0
  //     otherIncome = 0
  //
  //   other income:
  //     membership = 0
  //     admission  = 0
  //     otherIncome = amount
  // ------------------------------------------------------------
  const getRevenueBreakdown = (tx) => {
    const type = getTransactionType(tx);
    const amount = getAmount(tx);
    const base = getBaseAmount(tx);
    const discount = getDiscount(tx);

    if (isMembershipTransaction(tx)) {
      if (type === "renewal") {
        const membership =
          base > 0 ? Math.max(0, base - discount) : Math.max(0, amount);

        return { membership, admission: 0, otherIncome: 0 };
      }

      // membership / new_membership / membership_payment
      const admission = getAdmissionFee(tx);
      const membership =
        base > 0
          ? Math.max(0, base - discount)
          : Math.max(0, amount - admission);

      return { membership, admission, otherIncome: 0 };
    }

    if (isOtherIncome(tx)) {
      return { membership: 0, admission: 0, otherIncome: Math.max(0, amount) };
    }

    return { membership: 0, admission: 0, otherIncome: 0 };
  };

  // ------------------------------------------------------------
  // MEMBER CODE FOR THE LEDGER
  //
  // Show an explicitly linked employee code when available. Unlinked
  // income uses the stable reference saved on its payment row.
  // ------------------------------------------------------------
  const getMemberId = (tx) => {
    const explicit =
      tx.biometric_user_id ||
      tx.biometricUserId ||
      tx.memberCode ||
      tx.member_code ||
      tx.employeeCode ||
      tx.employee_code ||
      tx.member?.member_code ||
      tx.member?.employee_code;

    if (explicit && explicit !== "-" && explicit !== "undefined") {
      return explicit;
    }

    return "-";
  };

  const getLedgerId = (tx) => getMemberId(tx);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    status: "Paid",
  });
  const [isSavingIncome, setIsSavingIncome] = useState(false);
  const [incomeError, setIncomeError] = useState("");
  const [pendingPaidId, setPendingPaidId] = useState(null);
  const [resetAt, setResetAt] = useState(null);
  const [resetError, setResetError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clock, setClock] = useState(Date.now());

  const istDateKey = (value) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const todayStr = istDateKey(new Date(clock));
  const currentDate = new Date(`${todayStr}T00:00:00`);
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    api.get("/billing/reset").then(({ data }) => {
      setResetAt(data?.data?.resetAt || null);
    }).catch((error) => {
      console.error("Could not load billing reset state:", error);
      setResetError("Could not load billing reset state from the server.");
    });
    return () => window.clearInterval(timer);
  }, []);

  const isAfterReset = (tx) => {
    if (!resetAt) return true;
    const paidAt = tx.paidAt || tx.paid_at || tx.created_at;
    if (!paidAt) return istDateKey(tx.date) >= istDateKey(resetAt);
    return new Date(paidAt).getTime() > new Date(resetAt).getTime();
  };
  const currentTransactions = transactions.filter(isAfterReset);
  const filteredTransactions = transactions.filter((tx) => {
    const day = istDateKey(tx.paidAt || tx.date);
    if (!fromDate && !toDate && !isAfterReset(tx)) return false;
    return (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
  });
  const resetBilling = async () => {
    if (!window.confirm("Reset the current billing totals and ledger view? Saved transactions will remain in the database and can still be found with date filters.")) return;
    setResetError("");
    try {
      const { data } = await api.post("/billing/reset");
      setResetAt(data?.data?.resetAt || new Date().toISOString());
    } catch (error) {
      console.error("Could not reset billing:", error);
      setResetError("Billing reset could not be saved. Please try again.");
    }
  };

  // ================= ADD INCOME =================
  // FIX: this used to build a local-only object and call
  // addTransaction(), so it was gone after a refresh/restart. It
  // now calls addOtherIncome() from context, which POSTs to the
  // backend and only adds the saved row (with its real id/date)
  // into state. If a registered member is picked from the
  // dropdown, their employee code is stored on the transaction so
  // the ledger shows it instead of "-".
  const handleAddIncome = async () => {
    if (!formData.name || !formData.amount) return;

    setIsSavingIncome(true);
    setIncomeError("");

    try {
      const savedIncome = await addOtherIncome({
        name: formData.name,
        description: formData.description,
        amount: formData.amount,
        status: formData.status,
      });

      if (formData.status === "Paid" && savedIncome?.id) {
        navigate("/receipt", {
          state: {
            receiptData: {
              receiptType: "other_income",
              paymentId: savedIncome.id,
              paymentDate: savedIncome.paidAt || new Date().toISOString(),
              description: savedIncome.description || formData.description || formData.name,
              name: formData.name,
              finalAmount: savedIncome.amount,
              paymentMode: savedIncome.paymentMode,
              notes: savedIncome.description,
            },
          },
        });
      }

      setFormData({
        name: "",
        description: "",
        amount: "",
        status: "Paid",
      });
    } catch (error) {
      console.error("Failed to save income:", error);
      setIncomeError(error?.response?.data?.message || "Could not save this income to the server. Please try again.");
    } finally {
      setIsSavingIncome(false);
    }
  };

  const markAsPaid = async (id) => {
    setPendingPaidId(id);
    try {
      await markTransactionPaid(id);
    } catch (error) {
      console.error("Failed to mark as paid:", error);
      alert("Could not update this payment on the server. Please try again.");
    } finally {
      setPendingPaidId(null);
    }
  };

  const monthlyRevenue = Array(12).fill(0);
  const membershipRevenue = Array(12).fill(0);
  const admissionRevenue = Array(12).fill(0);
  const otherIncomeRevenue = Array(12).fill(0);

  /*
  =====================================================
  CALCULATE ALL REVENUE ONCE (uses getRevenueBreakdown so this
  can never drift from what the Excel export calculates)
  =====================================================
  */

  currentTransactions.forEach((tx) => {
    const dateKey = istDateKey(tx.paidAt || tx.date);
    if (!dateKey || Number(dateKey.slice(0, 4)) !== currentYear) {
      return;
    }

    if (!isPaid(tx)) {
      return;
    }

    const month = Number(dateKey.slice(5, 7)) - 1;
    const { membership, admission, otherIncome } = getRevenueBreakdown(tx);

    membershipRevenue[month] += membership;
    admissionRevenue[month] += admission;
    otherIncomeRevenue[month] += otherIncome;
  });

  for (let i = 0; i < 12; i++) {
    monthlyRevenue[i] =
      membershipRevenue[i] + admissionRevenue[i] + otherIncomeRevenue[i];
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const revenueMonths = monthlyRevenue
    .map((value, index) => ({ value, month: monthNames[index] }))
    .filter((item) => item.value > 0);

  const highestRevenue =
    revenueMonths.length > 0
      ? Math.max(...revenueMonths.map((m) => m.value))
      : 0;

  const lowestRevenue =
    revenueMonths.length > 0
      ? Math.min(...revenueMonths.map((m) => m.value))
      : 0;

  const highestMonth =
    revenueMonths.find((m) => m.value === highestRevenue)?.month || "-";

  const lowestMonth =
    revenueMonths.find((m) => m.value === lowestRevenue)?.month || "-";

  // ================= SUMMARY =================

  const summary = useMemo(() => {
    let today = 0;
    let monthly = 0;
    let yearly = 0;
    let other = 0;
    let pending = 0;

    currentTransactions.forEach((tx) => {
      const dateKey = istDateKey(tx.paidAt || tx.date);
      if (!dateKey) return;
      const [year, month] = dateKey.split("-").map(Number);
      const amount = getAmount(tx);
      const paid = isPaid(tx);
      if (!paid) {
        pending += amount;
        return;
      }
      if (isOtherIncome(tx)) {
        if (year === currentYear && month - 1 === currentMonth) other += amount;
      }
      if (isOtherIncome(tx) || isMembershipTransaction(tx)) {
        if (dateKey === todayStr) today += amount;
        if (year === currentYear && month - 1 === currentMonth) monthly += amount;
        if (year === currentYear) yearly += amount;
      }
    });
    return { today, monthlyRevenue: monthly, yearlyRevenue: yearly, other, pending };
  }, [currentTransactions, todayStr, currentYear, currentMonth]);

  const downloadYearlyReport = () => {
    const currentYear = new Date().getFullYear();

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(currentYear, i).toLocaleString("default", { month: "long" }),
      membershipRevenue: 0,
      admissionRevenue: 0,
      otherIncome: 0,
      totalRevenue: 0,
    }));

    currentTransactions.forEach((tx) => {
      const dateKey = istDateKey(tx.paidAt || tx.date);
      if (Number(dateKey.slice(0, 4)) !== currentYear) return;
      if (!isPaid(tx)) return;

      const monthIndex = Number(dateKey.slice(5, 7)) - 1;
      const { membership, admission, otherIncome } = getRevenueBreakdown(tx);

      monthlyData[monthIndex].membershipRevenue += membership;
      monthlyData[monthIndex].admissionRevenue += admission;
      monthlyData[monthIndex].otherIncome += otherIncome;
    });

    monthlyData.forEach((m) => {
      m.totalRevenue = m.membershipRevenue + m.admissionRevenue + m.otherIncome;
    });

    const highest = [...monthlyData].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
    const lowest = [...monthlyData]
      .filter((m) => m.totalRevenue > 0)
      .sort((a, b) => a.totalRevenue - b.totalRevenue)[0];

    const statistics = [
      { Metric: "Total Membership Revenue", Value: monthlyData.reduce((s, m) => s + m.membershipRevenue, 0) },
      { Metric: "Total Admission Revenue", Value: monthlyData.reduce((s, m) => s + m.admissionRevenue, 0) },
      { Metric: "Total Other Income", Value: monthlyData.reduce((s, m) => s + m.otherIncome, 0) },
      { Metric: "Grand Total Revenue", Value: monthlyData.reduce((s, m) => s + m.totalRevenue, 0) },
      { Metric: "Highest Revenue Month", Value: highest?.month || "-" },
      { Metric: "Highest Revenue Amount", Value: highest?.totalRevenue || 0 },
      { Metric: "Lowest Revenue Month", Value: lowest?.month || "-" },
      { Metric: "Lowest Revenue Amount", Value: lowest?.totalRevenue || 0 },
    ];

    const wb = XLSX.utils.book_new();

    // Each transaction row now uses getRevenueBreakdown() so Membership,
    // Admission and Other Income only ever contain money that actually
    // belongs in that column - Other Income rows no longer leak into
    // the Admission column, and Membership/Admission are 0 for them.
    const txSheet = XLSX.utils.json_to_sheet(
      currentTransactions.map((t) => {
        const { membership, admission, otherIncome } = getRevenueBreakdown(t);

        return {
          ID: t.id,
          "Member Code": getLedgerId(t),
          Member: t.memberName || t.name,
          Type: t.type || t.receipt_type || t.receiptType || "-",
          Membership: membership,
          Admission: admission,
          "Other Income": otherIncome,
          Discount: getDiscount(t),
          Amount: getAmount(t),
          PaymentMode: t.paymentMethod || t.payment_method || t.paymentMode || "-",
          Date: t.date,
          Status: t.status,
        };
      })
    );

    XLSX.utils.book_append_sheet(wb, txSheet, "Transactions");

    const ws1 = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, ws1, "Yearly Revenue");

    const ws2 = XLSX.utils.json_to_sheet(statistics);
    XLSX.utils.book_append_sheet(wb, ws2, "Statistics");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, `Gym_Revenue_Report_${currentYear}.xlsx`);
  };

  return (
    <Home>
      <div className="container-fluid p-4">
        <div className="mb-4">
          <h2 className="fw-bold">💰 Billing Dashboard</h2>
          <p className="text-muted">Smart ledger with auto income conversion</p>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card h-100 shadow-sm border-0 text-center text-white bg-primary">
              <div className="card-body">
                <h6 className="text-uppercase">Today's Revenue</h6>
                <h3 className="fw-bold">₹{summary.today}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card h-100 shadow-sm border-0 text-center text-white bg-success">
              <div className="card-body">
                <h6 className="text-uppercase">Monthly Revenue</h6>
                <h3 className="fw-bold">₹{summary.monthlyRevenue}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card h-100 shadow-sm border-0 text-center bg-warning">
              <div className="card-body">
                <h6 className="text-uppercase">Other Income</h6>
                <h3 className="fw-bold">₹{summary.other}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card h-100 shadow-sm border-0 text-center text-white bg-danger">
              <div className="card-body">
                <h6 className="text-uppercase">Pending</h6>
                <h3 className="fw-bold">₹{summary.pending}</h3>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card h-100 shadow-sm border-0 text-center text-white bg-dark">
              <div className="card-body">
                <h6 className="text-uppercase">Current Year Revenue</h6>
                <h2 className="fw-bold">₹{summary.yearlyRevenue}</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-success">
          <strong>Highest Revenue Month:</strong> {highestMonth} (₹{highestRevenue})
        </div>
        <div className="alert alert-danger mt-2">
          <strong>Lowest Revenue Month:</strong> {lowestMonth} (₹{lowestRevenue})
        </div>

        <button className="btn btn-success mb-3" onClick={downloadYearlyReport}>
          <i className="fa fa-file-excel me-2"></i>
          Download Yearly Excel Report
        </button>
        <button className="btn btn-outline-danger mb-3 ms-2" onClick={resetBilling}>
          Reset Billing
        </button>
        {resetError && <div className="alert alert-danger py-2">{resetError}</div>}

        <div className="card mt-4">
          <div className="card-header bg-primary text-white">
            Monthly Revenue Report ({currentYear})
          </div>

          <div className="card-body">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Membership</th>
                  <th>Admission</th>
                  <th>Other Income</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>

              <tbody>
                {monthNames.map((month, index) => (
                  <tr key={month}>
                    <td>{month}</td>
                    <td>₹{membershipRevenue[index]}</td>
                    <td>₹{admissionRevenue[index]}</td>
                    <td>₹{otherIncomeRevenue[index]}</td>
                    <td className="fw-bold text-success">₹{monthlyRevenue[index]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADD INCOME */}
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-dark text-white fw-bold">Add Income</div>

          <div className="card-body">
            {incomeError && (
              <div className="alert alert-danger py-2">{incomeError}</div>
            )}

            <div className="row g-2">
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="col-md-2">
                <input
                  className="form-control"
                  type="number"
                  placeholder="Amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="col-md-2">
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option>Paid</option>
                  <option>Pending</option>
                </select>
              </div>

              <div className="col-12">
                <button
                  className="btn btn-success w-100 mt-2"
                  onClick={handleAddIncome}
                  disabled={isSavingIncome}
                >
                  {isSavingIncome ? "Saving..." : "+ Add Income"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-dark text-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Transaction Ledger</h5>
              <span className="badge bg-secondary">{filteredTransactions.length} Transactions</span>
            </div>
          </div>

          <div className="card-body border-bottom">
            <div className="row g-2 align-items-end">
              <div className="col-sm-4 col-md-3">
                <label className="form-label">From date</label>
                <input className="form-control" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="col-sm-4 col-md-3">
                <label className="form-label">To date</label>
                <input className="form-control" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="col-sm-4 col-md-3">
                <button className="btn btn-outline-secondary" onClick={() => { setFromDate(""); setToDate(""); }}>Clear dates</button>
              </div>
              {resetAt && <div className="col-md-3 small text-muted">Billing view reset {new Date(resetAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</div>}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Member Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Base Amount</th>
                  <th>Admission Fee</th>
                  <th>Discount</th>
                  <th>Payment Method</th>
                  <th>Date</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="text-center py-5">No Transactions Found</td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{getLedgerId(t)}</td>

                      <td>
                        <div className="fw-semibold">{t.memberName || t.name}</div>
                        {t.description && (
                          <small className="text-muted">{t.description}</small>
                        )}
                      </td>

                      <td><span className="badge bg-secondary">{t.type}</span></td>

                      <td className="fw-bold">₹{t.amount}</td>

                      <td>₹{getBaseAmount(t)}</td>
                      <td>₹{getAdmissionFee(t)}</td>
                      <td>₹{getDiscount(t)}</td>
                      <td>{t.paymentMode || t.payment_method || "-"}</td>
                      <td>{t.date || "-"}</td>
                      <td>{t.paymentDate || t.date || "-"}</td>

                      <td>
                        {isPaid(t) ? (
                          <span className="badge bg-success">Paid</span>
                        ) : (
                          <span className="badge bg-warning text-dark">Pending</span>
                        )}
                      </td>

                      <td>{t.description || t.notes || "-"}</td>

                      <td>
                        {!isPaid(t) ? (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => markAsPaid(t.id)}
                            disabled={pendingPaidId === t.id}
                          >
                            {pendingPaidId === t.id ? "Saving..." : "✓ Mark Paid"}
                          </button>
                        ) : (
                          <span className="text-success fw-semibold">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Home>
  );
}

export default Billing;
