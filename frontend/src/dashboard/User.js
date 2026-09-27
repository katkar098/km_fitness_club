import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import Home from "./Home";
import { useParams } from "react-router-dom";
import { useMember } from "./MemberContext";
import * as XLSX from "xlsx";
import api from "../services/api";

// =====================================================
// USER PROFILE
// =====================================================

function User() {
  const { id } = useParams();

  const {
    members = [],
    updateMember,
    paymentHistory = [],
    attendanceHistory = [],
  } = useMember();

  // =====================================================
  // LIVE ATTENDANCE STATE
  // Uses the same /attendance API as Attendance.jsx
  // =====================================================

  const [
    liveAttendanceHistory,
    setLiveAttendanceHistory,
  ] = useState([]);

  const [
    attendanceLoading,
    setAttendanceLoading,
  ] = useState(false);

  // =====================================================
  // IMPORTANT
  //
  // ATTENDANCE WILL START ONLY FROM THIS DATE.
  //
  // ALL ATTENDANCE BEFORE THIS DATE IS IGNORED.
  // =====================================================

  const ATTENDANCE_START_DATE = "2026-08-23";

  // =====================================================
  // MONTHS
  // =====================================================

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

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
  // INDIA DATE KEY
  // =====================================================

  const getIndiaDateKey = useCallback((value) => {
    if (!value) {
      return "";
    }

    const text = String(value).trim();

    // KEEP DATE WITHOUT TIMEZONE SHIFT
    const ymd = text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (ymd) {
      return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    }

    const date =
      value instanceof Date
        ? value
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const parts = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

    const year =
      parts.find((part) => part.type === "year")
        ?.value;

    const month =
      parts.find((part) => part.type === "month")
        ?.value;

    const day =
      parts.find((part) => part.type === "day")
        ?.value;

    if (!year || !month || !day) {
      return "";
    }

    return `${year}-${month}-${day}`;
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
  // FORMAT EXACT TIME
  //
  // SAME LOGIC AS ATTENDANCE PAGE
  // =====================================================

  const formatTime = useCallback(
    (value) => {
      if (!value) {
        return "-";
      }

      const date = parseDate(value);

      if (!date) {
        return "-";
      }

      return date.toLocaleTimeString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }
      );
    },
    [parseDate]
  );

  // =====================================================
  // GET PUNCH TIME
  //
  // SAME FIELDS AS ATTENDANCE PAGE
  // =====================================================

  const getPunchTime = useCallback((record) => {
    if (!record) {
      return null;
    }

    return (
      record.punched_at ??
      record.punchedAt ??
      record.punch_time ??
      record.punchTime ??
      record.att_time ??
      record.attTime ??
      record.record_time ??
      record.recordTime ??
      record.LogDate ??
      record.log_date ??
      record.attendance_date ??
      record.attendanceDate ??
      record.timestamp ??
      record.date_time ??
      record.created_at ??
      record.createdAt ??
      null
    );
  }, []);

  // =====================================================
  // GET ATTENDANCE IDENTIFIERS
  // =====================================================

  const getAttendanceIdentifiers = useCallback(
    (attendance) => {
      if (!attendance) {
        return [];
      }

      return [
        attendance.memberId,
        attendance.member_id,

        attendance.memberCode,
        attendance.member_code,

        attendance.employeeId,
        attendance.employee_id,

        attendance.employeeCode,
        attendance.employee_code,

        attendance.userId,
        attendance.user_id,

        attendance.biometricId,
        attendance.biometric_id,

        attendance.biometricUserId,
        attendance.biometric_user_id,

        attendance.databaseId,
        attendance.uuid,

        attendance.UserId,
        attendance.EmployeeCode,

        attendance.member?.id,
        attendance.member?.memberId,
        attendance.member?.memberCode,
        attendance.member?.employeeCode,
        attendance.member?.biometricUserId,
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
    },
    [normalizeId]
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
      payment?.payment_date ||
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
  // LOAD LIVE BIOMETRIC ATTENDANCE
  //
  // Uses the SAME endpoint as Attendance Management.
  // This makes the latest biometric punch appear here too.
  // =====================================================

  const loadLiveAttendance = useCallback(async () => {
    try {
      setAttendanceLoading(true);

      const response = await api.get("/attendance");
      const responseData = response?.data;

      let rows = [];

      if (Array.isArray(responseData?.data)) {
        rows = responseData.data;
      } else if (Array.isArray(responseData?.attendance)) {
        rows = responseData.attendance;
      } else if (Array.isArray(responseData?.rows)) {
        rows = responseData.rows;
      } else if (Array.isArray(responseData)) {
        rows = responseData;
      }

      setLiveAttendanceHistory(rows);
    } catch (error) {
      console.error(
        "Unable to load live attendance:",
        error
      );

      setLiveAttendanceHistory([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  // Load immediately.
  useEffect(() => {
    loadLiveAttendance();
  }, [loadLiveAttendance]);

  // Refresh every 5 seconds so new biometric punches appear.
  useEffect(() => {
    const interval = setInterval(() => {
      loadLiveAttendance();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [loadLiveAttendance]);

  // =====================================================
  // COMBINE STORED + LIVE ATTENDANCE
  //
  // Duplicate records are removed. Stored history is kept
  // and current biometric API records are added.
  // =====================================================

  const allAttendanceHistory = useMemo(() => {
    const records = [
      ...(Array.isArray(attendanceHistory)
        ? attendanceHistory
        : []),
      ...(Array.isArray(liveAttendanceHistory)
        ? liveAttendanceHistory
        : []),
    ];

    const uniqueRecords = new Map();

    records.forEach((record, index) => {
      if (!record) {
        return;
      }

      const identifiers = getAttendanceIdentifiers(record);

      const punchTime = getPunchTime(record);

      const stableId =
        record.id ??
        record._id ??
        record.log_id ??
        record.logId ??
        "";

      const key =
        stableId
          ? `id-${stableId}`
          : `${identifiers.join("|")}-${punchTime || ""}`;

      // Keep one copy when the same punch exists in both sources.
      if (!uniqueRecords.has(key)) {
        uniqueRecords.set(
          key || `fallback-${index}`,
          record
        );
      }
    });

    return Array.from(uniqueRecords.values());
  }, [
    attendanceHistory,
    liveAttendanceHistory,
    getAttendanceIdentifiers,
    getPunchTime,
  ]);

  // =====================================================
  // MEMBER ATTENDANCE
  //
  // IMPORTANT:
  // ONLY THIS MEMBER
  // ONLY FROM ATTENDANCE_START_DATE
  // =====================================================

  const memberAttendance = useMemo(() => {
    if (
      !user ||
      !Array.isArray(allAttendanceHistory)
    ) {
      return [];
    }

    const uniqueRecords = new Map();

    allAttendanceHistory.forEach(
      (attendance, index) => {
        const attendanceIdentifiers =
          getAttendanceIdentifiers(attendance);

        const isCurrentMember =
          attendanceIdentifiers.some(
            (attendanceId) =>
              normalizedMemberIdentifiers.has(
                attendanceId
              )
          );

        if (!isCurrentMember) {
          return;
        }

        const punchTime =
          getPunchTime(attendance);

        if (!punchTime) {
          return;
        }

        const attendanceDate =
          getIndiaDateKey(punchTime);

        // Ignore attendance before the chosen start date.
        if (
          !attendanceDate ||
          attendanceDate < ATTENDANCE_START_DATE
        ) {
          return;
        }

        const stableId =
          attendance.id ??
          attendance._id ??
          attendance.log_id ??
          attendance.logId ??
          "";

        const uniqueKey =
          stableId
            ? `id-${stableId}`
            : `${attendanceIdentifiers.join("|")}-${punchTime}`;

        if (!uniqueRecords.has(uniqueKey)) {
          uniqueRecords.set(
            uniqueKey || `record-${index}`,
            attendance
          );
        }
      }
    );

    return Array.from(uniqueRecords.values());
  }, [
    allAttendanceHistory,
    user,
    getAttendanceIdentifiers,
    normalizedMemberIdentifiers,
    getPunchTime,
    getIndiaDateKey,
    ATTENDANCE_START_DATE,
  ]);

  // =====================================================
  // SORTED ACTUAL PUNCHES
  //
  // EVERY PUNCH IS KEPT.
  // NO GROUPING.
  // =====================================================

  const actualAttendanceRecords = useMemo(() => {
    return memberAttendance
      .map((attendance, index) => {
        const punchTime =
          getPunchTime(attendance);

        const dateKey =
          getIndiaDateKey(punchTime);

        const date = parseDate(punchTime);

        return {
          ...attendance,

          punchTime,

          dateKey,

          timestamp:
            date?.getTime() || 0,

          _key:
            attendance.id ||
            attendance._id ||
            `${dateKey}-${punchTime}-${index}`,
        };
      })
      .filter(
        (item) =>
          item.punchTime &&
          item.dateKey
      )
      .sort(
        (a, b) =>
          b.timestamp - a.timestamp
      );
  }, [
    memberAttendance,
    getPunchTime,
    getIndiaDateKey,
    parseDate,
  ]);

  // =====================================================
  // CURRENT YEAR
  //
  // AUTOMATICALLY CHANGES EVERY NEW YEAR
  // =====================================================

  const currentYear =
    new Date().getFullYear();

  // =====================================================
  // MONTH-WISE ATTENDANCE
  //
  // COUNTS UNIQUE DAYS ONLY
  // FROM ATTENDANCE START DATE
  // =====================================================

  const monthWiseAttendance = useMemo(() => {
    return months.map((month, monthIndex) => {
      const records =
        actualAttendanceRecords.filter(
          (record) => {
            const date =
              parseDate(record.punchTime);

            if (!date) {
              return false;
            }

            const indiaDate =
              getIndiaDateKey(
                record.punchTime
              );

            const year =
              Number(
                indiaDate.slice(0, 4)
              );

            const monthNumber =
              Number(
                indiaDate.slice(5, 7)
              ) - 1;

            return (
              year === currentYear &&
              monthNumber === monthIndex
            );
          }
        );

      const uniqueDays =
        new Set(
          records.map(
            (record) =>
              record.dateKey
          )
        );

      return {
        month,
        days: uniqueDays.size,
        records: records.length,
      };
    });
  }, [
    actualAttendanceRecords,
    currentYear,
    parseDate,
    getIndiaDateKey,
  ]);

  // =====================================================
  // SELECTED MONTH
  // =====================================================

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState("");

  // =====================================================
  // SELECTED MONTH ATTENDANCE
  //
  // EVERY ACTUAL PUNCH
  // =====================================================

  const selectedMonthAttendance =
    useMemo(() => {
      if (!selectedMonth) {
        return [];
      }

      const selectedMonthIndex =
        months.indexOf(
          selectedMonth
        );

      if (
        selectedMonthIndex === -1
      ) {
        return [];
      }

      return actualAttendanceRecords
        .filter((record) => {
          const dateKey =
            record.dateKey;

          if (!dateKey) {
            return false;
          }

          const year =
            Number(
              dateKey.slice(0, 4)
            );

          const month =
            Number(
              dateKey.slice(5, 7)
            ) - 1;

          return (
            year === currentYear &&
            month ===
              selectedMonthIndex
          );
        })
        .sort(
          (a, b) =>
            b.timestamp -
            a.timestamp
        );
    }, [
      selectedMonth,
      actualAttendanceRecords,
      currentYear,
    ]);

  // =====================================================
  // DOWNLOAD EXCEL
  // =====================================================

  const downloadAttendanceExcel =
    useCallback(() => {
      if (!selectedMonth) {
        alert(
          "Please select a month first."
        );

        return;
      }

      if (
        selectedMonthAttendance.length ===
        0
      ) {
        alert(
          "No attendance found for this month."
        );

        return;
      }

      const excelData =
        selectedMonthAttendance.map(
          (item, index) => {
            const date =
              parseDate(
                item.punchTime
              );

            const dayName =
              date
                ? date.toLocaleDateString(
                    "en-IN",
                    {
                      timeZone:
                        "Asia/Kolkata",
                      weekday:
                        "long",
                    }
                  )
                : "-";

            return {
              "Sr. No.": index + 1,

              Date:
                formatDateDDMMYYYY(
                  item.punchTime
                ),

              Day:
                dayName,

              "Visit Time":
                formatTime(
                  item.punchTime
                ),

              "Member Name":
                user?.name || "-",

              "Member ID":
                user?.memberCode ||
                user?.employeeCode ||
                user?.memberId ||
                user?.id ||
                "-",
            };
          }
        );

      const worksheet =
        XLSX.utils.json_to_sheet(
          excelData
        );

      worksheet["!cols"] = [
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 28 },
        { wch: 20 },
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        `${selectedMonth} Attendance`
      );

      const safeName = String(
        user?.name ||
          "Member"
      )
        .replace(
          /[^a-z0-9]/gi,
          "_"
        )
        .replace(
          /_+/g,
          "_"
        );

      const fileName =
        `${safeName}_${selectedMonth}_${currentYear}_Attendance.xlsx`;

      XLSX.writeFile(
        workbook,
        fileName
      );
    }, [
      selectedMonth,
      selectedMonthAttendance,
      parseDate,
      formatDateDDMMYYYY,
      formatTime,
      user,
      currentYear,
    ]);

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
    dob: "",
    address: "",
    plan: "",
    duration: "",
    startDate: "",
    expiryDate: "",
    paymentMode: "",
    finalAmount: "",
    email: "",
    emergency: "",
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

      dob:
        user.dob || "",

      address:
        user.address || "",

      plan:
        user.plan || "",

      duration:
        user.duration || "",

      startDate:
        user.startDate ||
        user.joinDate ||
        "",

      expiryDate:
        user.expiryDate ||
        "",

      paymentMode:
        user.paymentMode ||
        "",

      finalAmount:
        user.finalAmount ||
        "",

      email:
        user.email || "",

      emergency:
        user.emergency || "",
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

        startDate:
          editData.startDate ||
          user.startDate ||
          user.joinDate ||
          "",

        joinDate:
          editData.startDate ||
          user.startDate ||
          user.joinDate ||
          "",

        // MANUALLY SELECTED EXPIRY DATE
        // WILL NOT BE RECALCULATED
        expiryDate:
          editData.expiryDate ||
          user.expiryDate ||
          "",

        finalAmount: Number(
          editData.finalAmount ||
            user.finalAmount ||
            0
        ),

        updateMembership: true,
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
        {/* ATTENDANCE SUMMARY */}
        {/* ================================================= */}

        <div className="card shadow-sm border-0 mt-4">

          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">

            <span>
              Attendance Summary ({currentYear})
            </span>

            <div className="d-flex align-items-center gap-2">
              {attendanceLoading && (
                <span className="small">
                  Updating...
                </span>
              )}

              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={loadLiveAttendance}
                disabled={attendanceLoading}
              >
                Refresh Attendance
              </button>
            </div>

          </div>

          <div className="card-body">

            <div className="row g-3">

              {monthWiseAttendance.map(
                (item) => (

                  <div
                    className="col-md-3"
                    key={item.month}
                  >

                    <div
                      className={`card text-center shadow-sm ${
                        selectedMonth ===
                        item.month
                          ? "border-primary border-3"
                          : ""
                      }`}
                      style={{
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setSelectedMonth(
                          item.month
                        )
                      }
                    >

                      <div className="card-body">

                        <h6>
                          {item.month}
                        </h6>

                        <h2 className="text-primary">

                          {item.days}

                        </h2>

                        <small>
                          Days Attended
                        </small>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* SELECTED MONTH ATTENDANCE */}
        {/* ================================================= */}

        {selectedMonth && (

          <div className="card shadow-sm border-0 mt-4">

            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">

              <div>

                <span>
                  {selectedMonth} Attendance
                </span>

                <span className="badge bg-light text-dark ms-2">

                  {
                    selectedMonthAttendance.length
                  } Punch Records

                </span>

              </div>

              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={
                  downloadAttendanceExcel
                }
              >
                Download Excel
              </button>

            </div>

            <div className="card-body table-responsive">

              <table className="table table-bordered table-hover text-center">

                <thead className="table-dark">

                  <tr>

                    <th>
                      Date
                    </th>

                    <th>
                      Day
                    </th>

                    <th>
                      Exact Visit Time
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {selectedMonthAttendance.length >
                  0 ? (

                    selectedMonthAttendance.map(
                      (
                        item,
                        index
                      ) => {

                        const itemDate =
                          parseDate(
                            item.punchTime
                          );

                        return (

                          <tr
                            key={
                              item._key ||
                              `${item.dateKey}-${index}`
                            }
                          >

                            <td>

                              {formatDateDDMMYYYY(
                                item.punchTime
                              )}

                            </td>

                            <td>

                              {itemDate
                                ? itemDate.toLocaleDateString(
                                    "en-IN",
                                    {
                                      timeZone:
                                        "Asia/Kolkata",
                                      weekday:
                                        "long",
                                    }
                                  )
                                : "-"}

                            </td>

                            <td className="fw-bold text-primary">

                              {formatTime(
                                item.punchTime
                              )}

                            </td>

                            <td>

                              <span className="badge bg-success">

                                Present

                              </span>

                            </td>

                          </tr>

                        );
                      }
                    )

                  ) : (

                    <tr>

                      <td colSpan="4">

                        No Attendance Found

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}

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
                        Date of Birth
                      </label>

                      <input
                        type="date"
                        className="form-control"
                        value={
                          editData.dob
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            dob:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Plan
                      </label>

                      <input
                        className="form-control"
                        value={
                          editData.plan
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            plan:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Duration
                      </label>

                      <input
                        className="form-control"
                        value={
                          editData.duration
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            duration:
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
                        value={
                          editData.startDate
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            startDate:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Membership Expiry Date
                      </label>

                      <input
                        type="date"
                        className="form-control"
                        value={
                          editData.expiryDate
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            expiryDate:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Payment Mode
                      </label>

                      <select
                        className="form-select"
                        value={
                          editData.paymentMode
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            paymentMode:
                              e.target.value,
                          })
                        }
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

                        <option value="Bank Transfer">
                          Bank Transfer
                        </option>

                      </select>

                    </div>

                    <div className="col-md-6">

                      <label>
                        Amount Paid
                      </label>

                      <input
                        type="number"
                        className="form-control"
                        value={
                          editData.finalAmount
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            finalAmount:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Email
                      </label>

                      <input
                        className="form-control"
                        value={
                          editData.email
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            email:
                              e.target.value,
                          })
                        }
                      />

                    </div>

                    <div className="col-md-6">

                      <label>
                        Emergency Contact
                      </label>

                      <input
                        className="form-control"
                        value={
                          editData.emergency
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            emergency:
                              e.target.value,
                          })
                        }
                      />

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
