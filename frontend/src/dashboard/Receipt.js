import React, { useMemo, useRef } from "react";
import Home from "./Home";
import { useMember } from "./MemberContext";
import { useLocation, useNavigate } from "react-router-dom";

// ============================================================
// KM FITNESS CLUB - RECEIPT
// Supports:
// 1. New Membership / Create User
// 2. Membership Renewal
// ============================================================

function Receipt() {
  const navigate = useNavigate();
  const location = useLocation();

  const { members = [], renewalData } = useMember();

  const receiptRef = useRef(null);

  // ==========================================================
  // HELPERS
  // ==========================================================

  const getLocalStorageObject = (keys = []) => {
    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);

        if (!value) continue;

        const parsed = JSON.parse(value);

        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch (error) {
        console.warn(`Unable to read localStorage key: ${key}`, error);
      }
    }

    return null;
  };

  // ----------------------------------------------------------
  // Convert any amount safely to a number
  // Handles:
  // 500
  // "500"
  // "₹500"
  // "₹ 500"
  // "500.00"
  // "500/-"
  // "1,500"
  // ----------------------------------------------------------

  const parseAmount = (value, fallback = 0) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }

    const cleaned = String(value)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .replace(/\/-/g, "")
      .replace(/[^\d.-]/g, "")
      .trim();

    if (!cleaned) {
      return fallback;
    }

    const number = Number(cleaned);

    return Number.isFinite(number)
      ? number
      : fallback;
  };

  // ----------------------------------------------------------
  // Pick first usable value
  // ----------------------------------------------------------

  const firstValue = (...values) => {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }

    return "";
  };

  // ----------------------------------------------------------
  // Format currency
  // ----------------------------------------------------------

  const formatMoney = (value) => {
    const amount = parseAmount(value, 0);

    return amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // ----------------------------------------------------------
  // Format date without timezone conversion
  // ----------------------------------------------------------

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const text = String(value).trim();

    // YYYY-MM-DD
    const yyyyMmDd = text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (yyyyMmDd) {
      return `${yyyyMmDd[3]}-${yyyyMmDd[2]}-${yyyyMmDd[1]}`;
    }

    // DD-MM-YYYY
    const ddMmYyyy = text.match(
      /^(\d{2})-(\d{2})-(\d{4})$/
    );

    if (ddMmYyyy) {
      return text;
    }

    // ISO / other valid date strings
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return `${String(date.getDate()).padStart(2, "0")}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${date.getFullYear()}`;
    }

    return text;
  };

  // ----------------------------------------------------------
  // Today's date
  // ----------------------------------------------------------

  const getTodayDate = () => {
    const now = new Date();

    return (
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, "0")}-` +
      `${String(now.getDate()).padStart(2, "0")}`
    );
  };

  // ==========================================================
  // SAVED DATA
  // ==========================================================

  const savedReceipt = getLocalStorageObject([
    "km_receipt",
    "km_renewal_receipt",
    "km_membership_receipt",
    "receiptData",
  ]);

  // ----------------------------------------------------------
  // React Router state
  //
  // If Create User navigates to:
  //
  // navigate("/receipt", { state: { ... } })
  //
  // we support that too.
  // ----------------------------------------------------------

  const routeReceiptData = useMemo(
    () =>
      location?.state?.receiptData ||
      location?.state?.member ||
      location?.state ||
      {},
    [location.state]
  );

  // ==========================================================
  // DETERMINE RECEIPT TYPE
  // ==========================================================

  const routeReceiptType =
    routeReceiptData?.receiptType;

  const hasExplicitRouteType =
    routeReceiptType === "new_membership" ||
    routeReceiptType === "renewal" ||
    routeReceiptData?.isRenewal === true;

  const isRenewal = hasExplicitRouteType
    ? routeReceiptType === "renewal" ||
      routeReceiptData?.isRenewal === true
    : Boolean(
        renewalData ||
        savedReceipt?.receiptType === "renewal"
      );

  // ==========================================================
  // RECEIPT MEMBER ID
  // ==========================================================

  const receiptMemberId = firstValue(
    routeReceiptData?.memberId,
    routeReceiptData?.employeeCode,
    renewalData?.memberId,
    savedReceipt?.memberId,
    savedReceipt?.employeeCode,
    savedReceipt?.databaseId
  );

  // ==========================================================
  // FIND MEMBER
  // ==========================================================

  const member = useMemo(() => {
    if (!Array.isArray(members) || members.length === 0) {
      return null;
    }

    if (!receiptMemberId) {
      return members[members.length - 1];
    }

    const target = String(receiptMemberId);

    return (
      members.find((m) =>
        [
          m?.id,
          m?.memberId,
          m?.databaseId,
          m?.employeeCode,
          m?.biometricUserId,
        ].some(
          (value) =>
            value !== undefined &&
            value !== null &&
            String(value) === target
        )
      ) ||
      members[members.length - 1]
    );
  }, [members, receiptMemberId]);

  // ==========================================================
  // COMBINE ALL POSSIBLE SOURCES
  //
  // Priority:
  // Route data
  // -> renewal data
  // -> saved receipt
  // -> member
  // ==========================================================

  const data = useMemo(() => {
    return {
      ...(member || {}),
      ...(savedReceipt || {}),
      ...(isRenewal ? renewalData || {} : {}),
      ...(routeReceiptData || {}),
    };
  }, [
    member,
    savedReceipt,
    renewalData,
    routeReceiptData,
    isRenewal,
  ]);

  // ==========================================================
  // MEMBER DETAILS
  // ==========================================================

  const memberCode = firstValue(
    data.raw?.biometric_user_id,
    data.raw?.biometricUserId,
    data.biometricUserId,
    data.biometric_user_id,
    data.id,
    data.employeeCode,
    data.employee_code,
    data.memberCode,
    data.member_code,
    data.databaseId,
    "-"
  );

  const memberName = firstValue(
    data.name,
    data.fullName,
    data.full_name,
    data.memberName,
    data.member_name,
    data.username,
    "-"
  );

  const memberMobile = firstValue(
    data.mobile,
    data.phone,
    data.mobileNumber,
    data.mobile_number,
    data.contact,
    data.contactNumber,
    "-"
  );

  const memberPlan = firstValue(
    data.plan,
    data.membershipPlan,
    data.membership_plan,
    data.planName,
    data.plan_name,
    data.package,
    data.packageName,
    "Gym Membership"
  );

  // ==========================================================
  // DURATION
  // ==========================================================

  const durationDays = parseAmount(
    firstValue(
      data.durationDays,
      data.duration_days,
      data.membershipDurationDays,
      data.membership_duration_days
    ),
    0
  );

  const getDurationLabel = (days) => {
    const value = Number(days);

    if (!value) {
      return firstValue(
        data.duration,
        data.membershipDuration,
        data.membership_duration,
        "-"
      );
    }

    if (value >= 330) {
      return "1 Year";
    }

    if (value >= 160) {
      return "6 Months";
    }

    if (value >= 80) {
      return "3 Months";
    }

    return "1 Month";
  };

  const duration = getDurationLabel(durationDays);

  // ==========================================================
  // PAYMENT VALUES
  //
  // IMPORTANT:
  // We check many possible field names because the Create User
  // and Renewal APIs may return different names.
  // ==========================================================

  const membershipAmount = parseAmount(
    firstValue(
      isRenewal
        ? null
        : data.baseAmount,
      isRenewal
        ? null
        : data.membershipAmount,
      isRenewal
        ? null
        : data.membership_amount,
      isRenewal
        ? null
        : data.amount,
      isRenewal
        ? null
        : data.planAmount,
      isRenewal
        ? null
        : data.plan_amount,
      isRenewal
        ? null
        : data.fee,
      isRenewal
        ? null
        : data.membershipFee,
      isRenewal
        ? null
        : data.membership_fee
    ),
    0
  );

  const renewalMembershipAmount = parseAmount(
    firstValue(
      isRenewal
        ? data.baseAmount
        : null,
      isRenewal
        ? data.membershipAmount
        : null,
      isRenewal
        ? data.membership_amount
        : null,
      isRenewal
        ? data.amount
        : null,
      isRenewal
        ? data.renewalAmount
        : null,
      isRenewal
        ? data.renewal_amount
        : null,
      isRenewal
        ? data.renewalFee
        : null,
      isRenewal
        ? data.renewal_fee
        : null,
      isRenewal
        ? data.planAmount
        : null,
      isRenewal
        ? data.plan_amount
        : null
    ),
    0
  );

  const admissionFee = isRenewal
    ? 0
    : parseAmount(
        firstValue(
          data.admissionFee,
          data.admission_fee,
          data.joiningFee,
          data.joining_fee,
          data.registrationFee,
          data.registration_fee,
          data.newMemberFee,
          data.new_member_fee
        ),
        0
      );

  const discount = parseAmount(
    firstValue(
      data.discount,
      data.discountAmount,
      data.discount_amount,
      data.discountValue,
      data.discount_value
    ),
    0
  );

  // ----------------------------------------------------------
  // If backend directly gives final/paid amount, preserve it.
  // Otherwise calculate it.
  // ----------------------------------------------------------

  const explicitFinalAmount = parseAmount(
    firstValue(
      data.finalAmount,
      data.final_amount,
      data.totalPaid,
      data.total_paid,
      data.paidAmount,
      data.paid_amount,
      data.totalAmount,
      data.total_amount
    ),
    NaN
  );

  const hasExplicitFinalAmount =
    Number.isFinite(explicitFinalAmount) &&
    explicitFinalAmount > 0;

  const baseAmount = isRenewal
    ? renewalMembershipAmount
    : membershipAmount;

  const calculatedFinalAmount =
    baseAmount +
    (isRenewal ? 0 : admissionFee) -
    discount;

  const finalAmount = hasExplicitFinalAmount
    ? explicitFinalAmount
    : Math.max(calculatedFinalAmount, 0);

  // ==========================================================
  // DATES
  // ==========================================================

  const startDate = isRenewal
    ? firstValue(
        data.startDate,
        data.start_date,
        data.renewDate,
        data.renew_date,
        data.membershipStartDate,
        data.membership_start_date,
        getTodayDate()
      )
    : firstValue(
        data.membershipStartDate,
        data.membership_start_date,
        data.startDate,
        data.start_date,
        getTodayDate()
      );

  const previousExpiry = firstValue(
    data.oldExpiryDate,
    data.old_expiry_date,
    data.oldExpiry,
    data.old_expiry,
    data.previousExpiry,
    data.previous_expiry,
    data.expiryDate,
    data.expiry_date,
    data.membershipExpiryDate,
    data.membership_expiry_date,
    data.membership_end_date,
    data.endDate,
    data.end_date,
    ""
  );

  const newExpiry = firstValue(
    data.newExpiryDate,
    data.new_expiry_date,
    data.expiryDate,
    data.expiry_date,
    data.membershipExpiryDate,
    data.membership_expiry_date,
    data.membership_end_date,
    data.endDate,
    data.end_date,
    ""
  );

  // ==========================================================
  // STATUS
  // ==========================================================

  const memberStatus = firstValue(
    isRenewal ? renewalData?.status : null,
    data.status,
    "Active"
  );

  // ==========================================================
  // PAYMENT MODE
  // ==========================================================

  const paymentMode = firstValue(
    data.paymentMode,
    data.payment_mode,
    data.paymentMethod,
    data.payment_method,
    "Cash"
  );

  // ==========================================================
  // RECEIPT NUMBER
  // ==========================================================

  const receiptNumber = firstValue(
    `KM-${memberCode}`
  );

  // ==========================================================
  // RECEIPT DATE
  // ==========================================================

  const receiptDate = isRenewal
    ? firstValue(
        data.renewDate,
        data.renew_date,
        data.startDate,
        data.start_date,
        getTodayDate()
      )
    : firstValue(
        data.receiptDate,
        data.receipt_date,
        data.createdAt,
        data.created_at,
        startDate,
        getTodayDate()
      );

  // ==========================================================
  // DEBUG
  // ==========================================================

  console.log("========== KM FITNESS RECEIPT ==========");
  console.log("Receipt Type:", isRenewal ? "RENEWAL" : "NEW");
  console.log("Member:", data);
  console.log("Membership Amount:", baseAmount);
  console.log("Admission Fee:", admissionFee);
  console.log("Discount:", discount);
  console.log("Final Amount:", finalAmount);
  console.log("Payment Mode:", paymentMode);
  console.log("Receipt Number:", receiptNumber);
  console.log("========================================");

  // ==========================================================
  // NO MEMBER / NO DATA
  // ==========================================================

  if (!member && !savedReceipt && !routeReceiptData?.name) {
    return (
      <Home>
        <div className="receipt-page">
          <div className="receipt-error">
            <div className="error-icon">!</div>

            <h4>No receipt data found</h4>

            <p>
              Please create or renew a membership first.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => navigate("/member")}
            >
              Back to Members
            </button>
          </div>
        </div>
      </Home>
    );
  }

  // ==========================================================
  // PRINT
  // ==========================================================

  const handleDownload = () => {
    const oldTitle = document.title;

    document.title = isRenewal
      ? `KM-Fitness-Renewal-${memberCode}`
      : `KM-Fitness-Receipt-${memberCode}`;

    window.print();

    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  };

  // ==========================================================
  // WHATSAPP MESSAGE
  // ==========================================================

  const createWhatsAppMessage = () => {
    if (isRenewal) {
      return `KM FITNESS CLUB
RENEWAL RECEIPT

Receipt No: ${receiptNumber}

Member Code: ${memberCode}

Name: ${memberName}
Mobile: ${memberMobile}

Plan: ${memberPlan}
Duration: ${duration}

Renewal Date: ${formatDate(receiptDate)}

Previous Expiry: ${formatDate(previousExpiry)}

New Expiry: ${formatDate(newExpiry)}

Membership Amount: ₹${formatMoney(baseAmount)}

Discount: ₹${formatMoney(discount)}

Renewal Amount: ₹${formatMoney(finalAmount)}

Payment Mode: ${paymentMode}

Thank you for choosing KM Fitness Club.`;
    }

    return `KM FITNESS CLUB
MEMBERSHIP RECEIPT

Receipt No: ${receiptNumber}

Member Code: ${memberCode}

Name: ${memberName}
Mobile: ${memberMobile}

Plan: ${memberPlan}
Duration: ${duration}

Start Date: ${formatDate(startDate)}

Expiry Date: ${formatDate(newExpiry)}

Membership Amount: ₹${formatMoney(baseAmount)}

Admission Fee: ₹${formatMoney(admissionFee)}

Discount: ₹${formatMoney(discount)}

Total Paid: ₹${formatMoney(finalAmount)}

Payment Mode: ${paymentMode}

Thank you for joining KM Fitness Club.`;
  };

  // ==========================================================
  // SEND WHATSAPP
  // ==========================================================

  const handleSend = () => {
    const message = createWhatsAppMessage();

    const mobile = String(memberMobile || "").replace(
      /\D/g,
      ""
    );

    if (!mobile) {
      alert("Member mobile number is not available.");
      return;
    }

    const whatsappNumber = mobile.startsWith("91")
      ? mobile
      : `91${mobile}`;

    const url =
      `https://wa.me/${whatsappNumber}` +
      `?text=${encodeURIComponent(message)}`;

    window.open(url, "km_whatsapp_tab");
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Home>
      <div className="receipt-page">

        {/* ====================================================
            RECEIPT
        ==================================================== */}

        <div
          ref={receiptRef}
          className="receipt-wrapper"
        >

          {/* HEADER */}

          <div className="receipt-header">

            <div className="brand-area">

              <img
                src="/media/images/brand_logo.jpg"
                alt="KM Fitness Club"
                className="brand-logo"
              />

              <div>
                <div className="brand-name">
                  KM FITNESS CLUB
                </div>

                <div className="brand-location">
                  Kalyan East, Maharashtra
                </div>
              </div>

            </div>

            <div
              className={`receipt-type ${
                isRenewal
                  ? "renewal"
                  : "membership"
              }`}
            >
              {isRenewal
                ? "RENEWAL RECEIPT"
                : "MEMBERSHIP RECEIPT"}
            </div>

          </div>

          {/* RECEIPT META */}

          <div className="receipt-meta">

            <div>
              <span>Receipt No.</span>
              <strong>{receiptNumber}</strong>
            </div>

            <div>
              <span>Receipt Date</span>
              <strong>{formatDate(receiptDate)}</strong>
            </div>

          </div>

          {/* MEMBER DETAILS */}

          <section className="receipt-section">

            <div className="section-title">
              Member Details
            </div>

            <div className="details-grid">

              <div className="detail-item">
                <span>Member Code</span>
                <strong>{memberCode}</strong>
              </div>

              <div className="detail-item">
                <span>Member Name</span>
                <strong>{memberName}</strong>
              </div>

              <div className="detail-item">
                <span>Mobile Number</span>
                <strong>{memberMobile}</strong>
              </div>

              <div className="detail-item">
                <span>Membership Plan</span>
                <strong>{memberPlan}</strong>
              </div>

              <div className="detail-item">
                <span>Duration</span>
                <strong>{duration}</strong>
              </div>

              <div className="detail-item">
                <span>Status</span>
                <strong className="status-active">
                  {memberStatus}
                </strong>
              </div>

            </div>

          </section>

          {/* MEMBERSHIP DETAILS */}

          <section className="receipt-section">

            <div className="section-title">
              Membership Details
            </div>

            <div className="date-grid">

              {isRenewal ? (
                <>
                  <div>
                    <span>Renewal Date</span>
                    <strong>
                      {formatDate(receiptDate)}
                    </strong>
                  </div>

                  <div>
                    <span>Previous Expiry</span>
                    <strong>
                      {formatDate(previousExpiry)}
                    </strong>
                  </div>

                  <div>
                    <span>New Expiry</span>
                    <strong className="expiry">
                      {formatDate(newExpiry)}
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span>Start Date</span>
                    <strong>
                      {formatDate(startDate)}
                    </strong>
                  </div>

                  <div>
                    <span>Expiry Date</span>
                    <strong className="expiry">
                      {formatDate(newExpiry)}
                    </strong>
                  </div>
                </>
              )}

            </div>

          </section>

          {/* PAYMENT */}

          <section className="receipt-section payment-section">

            <div className="section-title">
              Payment Details
            </div>

            <div className="payment-table">

              <div className="payment-row">
                <span>
                  Membership Amount
                </span>

                <strong>
                  ₹{formatMoney(baseAmount)}
                </strong>
              </div>

              {!isRenewal && (
                <div className="payment-row">
                  <span>
                    Admission Fee
                  </span>

                  <strong>
                    ₹{formatMoney(admissionFee)}
                  </strong>
                </div>
              )}

              {discount > 0 && (
                <div className="payment-row discount-row">
                  <span>
                    Discount
                  </span>

                  <strong>
                    - ₹{formatMoney(discount)}
                  </strong>
                </div>
              )}

              <div className="payment-total">

                <div>
                  <span>
                    {isRenewal
                      ? "TOTAL RENEWAL AMOUNT"
                      : "TOTAL PAID"}
                  </span>

                  <small>
                    Payment Mode: {paymentMode}
                  </small>
                </div>

                <strong>
                  ₹{formatMoney(finalAmount)}
                </strong>

              </div>

            </div>

          </section>

          {/* FOOTER */}

          <div className="receipt-footer">

            <div className="thank-you">
              Thank you for choosing KM Fitness Club
            </div>

            <div className="footer-note">
              Please keep this receipt for your records.
            </div>

            <div className="footer-line">
              KM FITNESS CLUB • Kalyan East, Maharashtra
            </div>

          </div>

        </div>

        {/* ====================================================
            ACTION BUTTONS
        ==================================================== */}

        <div className="receipt-actions">

          <button
            type="button"
            className="receipt-btn print-btn"
            onClick={handleDownload}
          >
            <span>🖨</span>
            Download Receipt
          </button>

          <button
            type="button"
            className="receipt-btn whatsapp-btn"
            onClick={handleSend}
          >
            <span>☘</span>
            Send WhatsApp
          </button>

          <button
            type="button"
            className="receipt-btn back-btn"
            onClick={() => navigate("/member")}
          >
            ← Back to Members
          </button>

        </div>

      </div>

      {/* ======================================================
          STYLES
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .receipt-page {
          min-height: calc(100vh - 80px);
          background: #f3f5f8;
          padding: 35px 15px 50px;
        }

        .receipt-wrapper {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.10);
          color: #172033;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
        }

        /* ============================
           HEADER
        ============================ */

        .receipt-header {
          padding: 25px 30px;
          background:
            linear-gradient(
              135deg,
              #111827 0%,
              #1f2937 55%,
              #111827 100%
            );
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .brand-logo {
          width: 68px;
          height: 68px;
          object-fit: cover;
          border-radius: 50%;
          border: 3px solid #fbbf24;
          background: #ffffff;
        }

        .brand-name {
          font-size: 25px;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .brand-location {
          margin-top: 4px;
          font-size: 13px;
          color: #d1d5db;
        }

        .receipt-type {
          padding: 10px 15px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.7px;
          white-space: nowrap;
        }

        .receipt-type.membership {
          background: #fbbf24;
          color: #111827;
        }

        .receipt-type.renewal {
          background: #3b82f6;
          color: #ffffff;
        }

        /* ============================
           META
        ============================ */

        .receipt-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #e5e7eb;
          background: #fafafa;
        }

        .receipt-meta > div {
          padding: 16px 30px;
        }

        .receipt-meta > div + div {
          border-left: 1px solid #e5e7eb;
        }

        .receipt-meta span,
        .detail-item span,
        .date-grid span {
          display: block;
          color: #7b8494;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }

        .receipt-meta strong {
          font-size: 14px;
          color: #172033;
        }

        /* ============================
           SECTION
        ============================ */

        .receipt-section {
          padding: 22px 30px;
          border-bottom: 1px solid #edf0f4;
        }

        .section-title {
          position: relative;
          font-size: 14px;
          font-weight: 800;
          color: #111827;
          padding-bottom: 10px;
          margin-bottom: 17px;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-title::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -1px;
          width: 45px;
          height: 3px;
          background: #f59e0b;
          border-radius: 10px;
        }

        /* ============================
           MEMBER GRID
        ============================ */

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          column-gap: 40px;
          row-gap: 18px;
        }

        .detail-item strong {
          display: block;
          color: #202938;
          font-size: 14px;
          font-weight: 700;
          word-break: break-word;
        }

        .status-active {
          color: #15803d !important;
        }

        /* ============================
           DATES
        ============================ */

        .date-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .date-grid > div {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 13px;
        }

        .date-grid strong {
          display: block;
          font-size: 14px;
        }

        .date-grid .expiry {
          color: #15803d;
        }

        /* ============================
           PAYMENT
        ============================ */

        .payment-section {
          border-bottom: 0;
        }

        .payment-table {
          border: 1px solid #e1e5ea;
          border-radius: 12px;
          overflow: hidden;
        }

        .payment-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 17px;
          border-bottom: 1px solid #e8ebef;
          font-size: 14px;
        }

        .payment-row span {
          color: #4b5563;
          font-weight: 600;
        }

        .payment-row strong {
          color: #111827;
          font-size: 14px;
        }

        .discount-row span,
        .discount-row strong {
          color: #dc2626;
        }

        .payment-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px;
          background: #f0fdf4;
          border-top: 2px solid #bbf7d0;
        }

        .payment-total span {
          display: block;
          color: #166534;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .payment-total small {
          display: block;
          color: #4b5563;
          font-size: 11px;
          margin-top: 4px;
        }

        .payment-total > strong {
          color: #15803d;
          font-size: 24px;
          white-space: nowrap;
        }

        /* ============================
           FOOTER
        ============================ */

        .receipt-footer {
          text-align: center;
          padding: 24px 30px 28px;
          background: #fafafa;
          border-top: 1px solid #e5e7eb;
        }

        .thank-you {
          font-size: 15px;
          font-weight: 800;
          color: #111827;
        }

        .footer-note {
          margin-top: 5px;
          color: #6b7280;
          font-size: 12px;
        }

        .footer-line {
          margin-top: 14px;
          color: #9ca3af;
          font-size: 10px;
          letter-spacing: 0.4px;
        }

        /* ============================
           BUTTONS
        ============================ */

        .receipt-actions {
          max-width: 760px;
          margin: 22px auto 0;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .receipt-btn {
          border: 0;
          border-radius: 9px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .receipt-btn:hover {
          transform: translateY(-1px);
          box-shadow:
            0 5px 15px rgba(0, 0, 0, 0.12);
        }

        .receipt-btn span {
          margin-right: 6px;
        }

        .print-btn {
          background: #198754;
          color: white;
        }

        .whatsapp-btn {
          background: #0d6efd;
          color: white;
        }

        .back-btn {
          background: #6b7280;
          color: white;
        }

        /* ============================
           ERROR
        ============================ */

        .receipt-error {
          max-width: 500px;
          margin: 70px auto;
          padding: 40px;
          text-align: center;
          background: #ffffff;
          border-radius: 16px;
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.08);
        }

        .error-icon {
          width: 50px;
          height: 50px;
          margin: 0 auto 15px;
          border-radius: 50%;
          background: #fee2e2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          font-weight: 800;
        }

        /* ============================
           MOBILE
        ============================ */

        @media (max-width: 600px) {

          .receipt-page {
            padding: 15px 8px 30px;
          }

          .receipt-wrapper {
            border-radius: 12px;
          }

          .receipt-header {
            padding: 20px;
            flex-direction: column;
            align-items: flex-start;
          }

          .brand-name {
            font-size: 20px;
          }

          .brand-logo {
            width: 58px;
            height: 58px;
          }

          .receipt-meta {
            grid-template-columns: 1fr;
          }

          .receipt-meta > div {
            padding: 13px 20px;
          }

          .receipt-meta > div + div {
            border-left: 0;
            border-top: 1px solid #e5e7eb;
          }

          .receipt-section {
            padding: 18px 20px;
          }

          .details-grid {
            grid-template-columns: 1fr;
            row-gap: 15px;
          }

          .date-grid {
            grid-template-columns: 1fr;
          }

          .payment-total > strong {
            font-size: 20px;
          }

          .receipt-actions {
            padding: 0 8px;
          }

          .receipt-btn {
            width: 100%;
          }
        }

        /* ====================================================
           PRINT / PDF
        ==================================================== */

        @media print {

          @page {
            size: A4;
            margin: 8mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .receipt-wrapper,
          .receipt-wrapper * {
            visibility: visible;
          }

          .receipt-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .receipt-actions {
            display: none !important;
          }

          .receipt-page {
            padding: 0 !important;
            background: #ffffff !important;
            min-height: 0 !important;
          }

          .receipt-header {
            padding: 15px 20px !important;
          }

          .brand-logo {
            width: 55px !important;
            height: 55px !important;
          }

          .brand-name {
            font-size: 19px !important;
          }

          .receipt-section {
            padding: 13px 20px !important;
          }

          .receipt-meta > div {
            padding: 10px 20px !important;
          }

          .details-grid {
            row-gap: 10px !important;
          }

          .detail-item span,
          .date-grid span,
          .receipt-meta span {
            font-size: 9px !important;
          }

          .detail-item strong,
          .date-grid strong,
          .receipt-meta strong {
            font-size: 11px !important;
          }

          .section-title {
            font-size: 12px !important;
            padding-bottom: 6px !important;
            margin-bottom: 10px !important;
          }

          .payment-row {
            padding: 8px 12px !important;
            font-size: 11px !important;
          }

          .payment-row strong {
            font-size: 11px !important;
          }

          .payment-total {
            padding: 10px 12px !important;
          }

          .payment-total span {
            font-size: 10px !important;
          }

          .payment-total small {
            font-size: 8px !important;
          }

          .payment-total > strong {
            font-size: 17px !important;
          }

          .receipt-footer {
            padding: 12px 20px !important;
          }

          .thank-you {
            font-size: 11px !important;
          }

          .footer-note,
          .footer-line {
            font-size: 8px !important;
          }
        }

      `}</style>
    </Home>
  );
}

export default Receipt;