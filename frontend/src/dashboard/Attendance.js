import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Home from "./Home";
import { useMember } from "./MemberContext";
import api from "../services/api";

// ============================================================
// ATTENDANCE MANAGEMENT
// ============================================================

function Attendance() {
  const { members = [] } = useMember();

  // ==========================================================
  // STATE
  // ==========================================================

  const [attendance, setAttendance] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [lastUpdated, setLastUpdated] =
    useState(new Date());

  // ==========================================================
  // NORMALIZE ID
  // ==========================================================

  const normalizeId = useCallback((value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "";
    }

    return String(value)
      .trim()
      .replace(/^0+(\d)/, "$1");
  }, []);

  // ==========================================================
  // GET MEMBER BIOMETRIC / EMPLOYEE CODE
  // ==========================================================

  const getMemberBiometricId = useCallback(
    (member) => {
      if (!member) {
        return "";
      }

      return normalizeId(
        member.biometricUserId ??
          member.biometric_user_id ??
          member.employeeCode ??
          member.employee_code ??
          member.memberCode ??
          member.member_code ??
          member.id
      );
    },
    [normalizeId]
  );

  // ==========================================================
  // GET EMPLOYEE CODE
  // ==========================================================

  const getEmployeeCode = useCallback(
    (member) => {
      if (!member) {
        return "";
      }

      return (
        member.employeeCode ??
        member.employee_code ??
        member.memberCode ??
        member.member_code ??
        member.biometricUserId ??
        member.biometric_user_id ??
        ""
      );
    },
    []
  );

  // ==========================================================
  // MEMBER MAP
  //
  // biometric ID -> member
  // ==========================================================

  const memberMap = useMemo(() => {
    const map = new Map();

    console.log(
      "================ MEMBER MAP ================"
    );

    console.log(
      "Members available:",
      members.length
    );

    members.forEach((member) => {
      const biometricId =
        getMemberBiometricId(member);

      console.log(
        "REGISTERED MEMBER:",
        {
          databaseId:
            member.id,

          memberId:
            member.memberId,

          employeeCode:
            member.employeeCode ??
            member.employee_code ??
            member.memberCode ??
            member.member_code,

          biometricUserId:
            member.biometricUserId ??
            member.biometric_user_id,

          name:
            member.name ??
            member.fullName ??
            member.full_name,

          expiry:
            member.expiryDate ??
            member.expiry_date ??
            member.endDate ??
            member.end_date ??
            member.membership_end_date,
        }
      );

      if (biometricId) {
        map.set(
          biometricId,
          member
        );
      }
    });

    console.log(
      "Member map IDs:",
      [...map.keys()]
    );

    console.log(
      "============================================"
    );

    return map;
  }, [
    members,
    getMemberBiometricId,
  ]);

  // ==========================================================
  // DATE PARSER
  //
  // IMPORTANT:
  // DATE-ONLY values are handled without timezone shifting.
  // ==========================================================

  const parseDate = useCallback(
    (value) => {
      if (!value) {
        return null;
      }

      if (
        value instanceof Date
      ) {
        if (
          Number.isNaN(
            value.getTime()
          )
        ) {
          return null;
        }

        return value;
      }

      const stringValue =
        String(value).trim();

      // ========================================================
      // YYYY-MM-DD
      // ========================================================

      const ymd =
        stringValue.match(
          /^(\d{4})-(\d{2})-(\d{2})$/
        );

      if (ymd) {
        const date =
          new Date(
            Number(ymd[1]),
            Number(ymd[2]) - 1,
            Number(ymd[3])
          );

        return Number.isNaN(
          date.getTime()
        )
          ? null
          : date;
      }

      // ========================================================
      // DD-MM-YYYY
      // ========================================================

      const dmy =
        stringValue.match(
          /^(\d{2})-(\d{2})-(\d{4})$/
        );

      if (dmy) {
        const date =
          new Date(
            Number(dmy[3]),
            Number(dmy[2]) - 1,
            Number(dmy[1])
          );

        return Number.isNaN(
          date.getTime()
        )
          ? null
          : date;
      }

      // ========================================================
      // ISO / DATETIME
      // ========================================================

      const date =
        new Date(
          stringValue
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return date;
    },
    []
  );

  // ==========================================================
  // INDIA DATE KEY
  // ==========================================================

  const getIndiaDateKey =
    useCallback(
      (value) => {
        if (!value) {
          return "";
        }

        // ------------------------------------------------------
        // DATE-ONLY VALUE
        // ------------------------------------------------------

        const stringValue =
          String(value).trim();

        const ymd =
          stringValue.match(
            /^(\d{4})-(\d{2})-(\d{2})/
          );

        if (ymd) {
          return (
            `${ymd[1]}-${ymd[2]}-${ymd[3]}`
          );
        }

        // ------------------------------------------------------
        // DATETIME
        // ------------------------------------------------------

        const date =
          value instanceof Date
            ? value
            : new Date(value);

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return "";
        }

        return new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              "Asia/Kolkata",

            year: "numeric",

            month: "2-digit",

            day: "2-digit",
          }
        ).format(date);
      },
      []
    );

  // ==========================================================
  // TODAY INDIA
  // ==========================================================

  const todayIndia =
    useMemo(() => {
      return getIndiaDateKey(
        new Date()
      );
    }, [
      getIndiaDateKey,
    ]);

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate =
    useCallback(
      (value) => {
        if (!value) {
          return "-";
        }

        const stringValue =
          String(value).trim();

        // ------------------------------------------------------
        // YYYY-MM-DD
        // ------------------------------------------------------

        const ymd =
          stringValue.match(
            /^(\d{4})-(\d{2})-(\d{2})/
          );

        if (ymd) {
          return (
            `${ymd[3]}-${ymd[2]}-${ymd[1]}`
          );
        }

        // ------------------------------------------------------
        // DD-MM-YYYY
        // ------------------------------------------------------

        const dmy =
          stringValue.match(
            /^(\d{2})-(\d{2})-(\d{4})$/
          );

        if (dmy) {
          return (
            `${dmy[1]}-${dmy[2]}-${dmy[3]}`
          );
        }

        const date =
          parseDate(value);

        if (!date) {
          return "-";
        }

        return date.toLocaleDateString(
          "en-GB",
          {
            timeZone:
              "Asia/Kolkata",

            day: "2-digit",

            month: "2-digit",

            year: "numeric",
          }
        );
      },
      [parseDate]
    );

  // ==========================================================
  // FORMAT TIME
  // ==========================================================

  const formatTime =
    useCallback(
      (value) => {
        const date =
          parseDate(value);

        if (!date) {
          return "-";
        }

        return date.toLocaleTimeString(
          "en-IN",
          {
            timeZone:
              "Asia/Kolkata",

            hour: "2-digit",

            minute: "2-digit",

            second: "2-digit",

            hour12: true,
          }
        );
      },
      [parseDate]
    );

  // ==========================================================
  // GET ATTENDANCE BIOMETRIC ID
  // ==========================================================

  const getAttendanceBiometricId =
    useCallback(
      (record) => {
        if (!record) {
          return "";
        }

        return normalizeId(
          record.biometric_user_id ??
            record.biometricUserId ??
            record.user_id ??
            record.userId ??
            record.UserId ??
            record.employee_code ??
            record.employeeCode ??
            record.member_code ??
            record.memberCode ??
            record.EmployeeCode
        );
      },
      [normalizeId]
    );

  // ==========================================================
  // GET PUNCH TIME
  // ==========================================================

  const getPunchTime =
    useCallback(
      (record) => {
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
          record.created_at ??
          record.createdAt
        );
      },
      []
    );

  // ==========================================================
  // GET MEMBER EXPIRY
  // ==========================================================

  const getExpiryDate =
    useCallback(
      (member) => {
        if (!member) {
          return null;
        }

        // ------------------------------------------------------
        // DIRECT FIELDS
        // ------------------------------------------------------

        const direct =
          member.expiryDate ??
          member.expiry_date ??
          member.membershipExpiryDate ??
          member.membership_expiry_date ??
          member.membershipEnd ??
          member.membership_end ??
          member.endDate ??
          member.end_date ??
          member.membership_end_date;

        if (direct) {
          return direct;
        }

        // ------------------------------------------------------
        // MEMBERSHIP OBJECT
        // ------------------------------------------------------

        if (
          member.membership
        ) {
          return (
            member.membership.end_date ??
            member.membership.endDate ??
            member.membership.expiryDate ??
            member.membership.expiry_date ??
            null
          );
        }

        // ------------------------------------------------------
        // MEMBERSHIP ARRAY
        // ------------------------------------------------------

        if (
          Array.isArray(
            member.memberships
          ) &&
          member.memberships.length > 0
        ) {
          const sorted =
            [
              ...member.memberships,
            ].sort(
              (a, b) => {
                const dateA =
                  parseDate(
                    a.end_date ??
                      a.endDate ??
                      a.expiryDate ??
                      a.expiry_date
                  );

                const dateB =
                  parseDate(
                    b.end_date ??
                      b.endDate ??
                      b.expiryDate ??
                      b.expiry_date
                  );

                return (
                  (dateB?.getTime() ||
                    0) -
                  (dateA?.getTime() ||
                    0)
                );
              }
            );

          return (
            sorted[0]?.end_date ??
            sorted[0]?.endDate ??
            sorted[0]?.expiryDate ??
            sorted[0]?.expiry_date ??
            null
          );
        }

        return null;
      },
      [parseDate]
    );

  // ==========================================================
  // GET MEMBER START DATE
  // ==========================================================

  const getStartDate =
    useCallback(
      (member) => {
        if (!member) {
          return null;
        }

        return (
          member.startDate ??
          member.start_date ??
          member.membershipStartDate ??
          member.membership_start_date ??
          member.membership?.start_date ??
          member.membership?.startDate ??
          null
        );
      },
      []
    );

  // ==========================================================
  // GET MEMBER STATUS
  // ==========================================================

  const getStatus =
    useCallback(
      (member) => {
        if (!member) {
          return "Unknown";
        }

        const expiry =
          getExpiryDate(
            member
          );

        // ------------------------------------------------------
        // IF EXPIRY IS AVAILABLE, USE IT
        // ------------------------------------------------------

        if (expiry) {
          const expiryDate =
            parseDate(
              expiry
            );

          if (expiryDate) {
            const today =
              new Date();

            today.setHours(
              0,
              0,
              0,
              0
            );

            expiryDate.setHours(
              23,
              59,
              59,
              999
            );

            return expiryDate >=
              today
              ? "Active"
              : "Expired";
          }
        }

        // ------------------------------------------------------
        // FALLBACK DATABASE STATUS
        // ------------------------------------------------------

        const existingStatus =
          member.membershipStatus ??
          member.membership_status ??
          member.status;

        const normalized =
          String(
            existingStatus || ""
          ).toLowerCase();

        if (
          normalized ===
          "active"
        ) {
          return "Active";
        }

        if (
          normalized ===
          "expired"
        ) {
          return "Expired";
        }

        return "Unknown";
      },
      [
        getExpiryDate,
        parseDate,
      ]
    );

  // ==========================================================
  // GET MEMBER NAME
  // ==========================================================

  const getMemberName =
    useCallback(
      (
        member,
        biometricId
      ) => {
        if (!member) {
          return (
            biometricId ||
            "Unknown Member"
          );
        }

        return (
          member.name ??
          member.fullName ??
          member.full_name ??
          member.memberName ??
          member.member_name ??
          biometricId
        );
      },
      []
    );

  // ==========================================================
  // GET MEMBER MOBILE
  // ==========================================================

  const getMemberMobile =
    useCallback(
      (member) => {
        if (!member) {
          return "-";
        }

        return (
          member.mobile ??
          member.phone ??
          member.phone_number ??
          "-"
        );
      },
      []
    );

  // ==========================================================
  // LOAD ATTENDANCE
  //
  // IMPORTANT:
  // We now:
  //
  // 1. Get all attendance records.
  // 2. Keep today's records.
  // 3. Match them with members.
  // 4. Add members who have no punch today as
  //    "Not Checked In".
  //
  // Therefore a newly created member does not disappear.
  // ==========================================================

  const loadAttendance =
    useCallback(
      async (
        showLoading = true
      ) => {
        try {
          if (
            showLoading
          ) {
            setLoading(true);
          }

          console.log(
            "\n========================================"
          );

          console.log(
            "ATTENDANCE API REQUEST"
          );

          console.log(
            "Today India:",
            todayIndia
          );

          // ====================================================
          // GET ATTENDANCE
          // ====================================================

          const response =
            await api.get(
              "/attendance"
            );

          console.log(
            "Attendance API response:",
            response?.data
          );

          const responseData =
            response?.data;

          let rows = [];

          // ====================================================
          // RESPONSE SHAPES
          // ====================================================

          if (
            Array.isArray(
              responseData?.data
            )
          ) {
            rows =
              responseData.data;
          } else if (
            Array.isArray(
              responseData?.attendance
            )
          ) {
            rows =
              responseData.attendance;
          } else if (
            Array.isArray(
              responseData?.rows
            )
          ) {
            rows =
              responseData.rows;
          } else if (
            Array.isArray(
              responseData
            )
          ) {
            rows =
              responseData;
          }

          console.log(
            "Total attendance records:",
            rows.length
          );

          // ====================================================
          // PROCESS TODAY'S ACTUAL PUNCHES
          // ====================================================

          const processed = [];

          rows.forEach(
            (
              record,
              index
            ) => {
              const biometricId =
                getAttendanceBiometricId(
                  record
                );

              const punchTime =
                getPunchTime(
                  record
                );

              if (
                !biometricId
              ) {
                console.warn(
                  "Attendance record has no biometric ID:",
                  record
                );

                return;
              }

              if (
                !punchTime
              ) {
                console.warn(
                  "Attendance record has no punch time:",
                  record
                );

                return;
              }

              // =================================================
              // ONLY TODAY
              // =================================================

              const punchDate =
                getIndiaDateKey(
                  punchTime
                );

              if (
                punchDate !==
                todayIndia
              ) {
                return;
              }

              // =================================================
              // FIND MEMBER
              // =================================================

              const member =
                memberMap.get(
                  biometricId
                );

              // =================================================
              // IMPORTANT
              //
              // Do NOT throw away the attendance record
              // if member mapping fails.
              // =================================================

              if (!member) {
                console.warn(
                  `Attendance found for biometric user ${biometricId}, but no registered member matched it.`,
                  record
                );

                processed.push({
                  ...record,

                  _key:
                    record.id ||
                    `${biometricId}-${punchTime}-${index}`,

                  biometricId,

                  employeeCode:
                    biometricId,

                  name:
                    record.full_name ??
                    record.fullName ??
                    record.name ??
                    `Employee ${biometricId}`,

                  mobile:
                    record.phone ??
                    record.mobile ??
                    "-",

                  punchTime,

                  expiryDate:
                    null,

                  status:
                    "Unknown",

                  checkedIn:
                    true,

                  member:
                    null,
                });

                return;
              }

              // =================================================
              // MEMBER DETAILS
              // =================================================

              const employeeCode =
                getEmployeeCode(
                  member
                ) ||
                biometricId;

              const name =
                getMemberName(
                  member,
                  biometricId
                );

              const mobile =
                getMemberMobile(
                  member
                );

              const expiry =
                getExpiryDate(
                  member
                );

              const status =
                getStatus(
                  member
                );

              console.log(
                "MATCHED ATTENDANCE:",
                {
                  biometricId,
                  employeeCode,
                  name,
                  mobile,
                  expiry,
                  status,
                  punchTime,
                }
              );

              processed.push({
                ...record,

                _key:
                  record.id ||
                  `${biometricId}-${punchTime}-${index}`,

                biometricId,

                employeeCode,

                name,

                mobile,

                punchTime,

                expiryDate:
                  expiry,

                startDate:
                  getStartDate(
                    member
                  ),

                status,

                checkedIn:
                  true,

                member,
              });
            }
          );

          // ====================================================
          // ADD MEMBERS WITHOUT ATTENDANCE
          //
          // This is the major change.
          // ====================================================

          members.forEach(
            (
              member
            ) => {
              const biometricId =
                getMemberBiometricId(
                  member
                );

              if (
                !biometricId
              ) {
                return;
              }

              // ------------------------------------------------
              // CHECK WHETHER MEMBER ALREADY HAS A PUNCH
              // ------------------------------------------------

              const hasAttendance =
                processed.some(
                  (row) =>
                    normalizeId(
                      row.biometricId
                    ) ===
                    biometricId
                );

              // ------------------------------------------------
              // IF NO PUNCH, ADD "NOT CHECKED IN"
              // ------------------------------------------------

              if (
                !hasAttendance
              ) {
                const employeeCode =
                  getEmployeeCode(
                    member
                  ) ||
                  biometricId;

                const name =
                  getMemberName(
                    member,
                    biometricId
                  );

                const mobile =
                  getMemberMobile(
                    member
                  );

                const expiry =
                  getExpiryDate(
                    member
                  );

                const status =
                  getStatus(
                    member
                  );

                processed.push({
                  _key:
                    `member-${biometricId}`,

                  biometricId,

                  employeeCode,

                  name,

                  mobile,

                  punchTime:
                    null,

                  expiryDate:
                    expiry,

                  startDate:
                    getStartDate(
                      member
                    ),

                  status,

                  checkedIn:
                    false,

                  member,
                });
              }
            }
          );

          // ====================================================
          // SORT
          //
          // Checked-in members first.
          // Newest punch first.
          // Not checked-in members after them.
          // ====================================================

          processed.sort(
            (a, b) => {
              if (
                a.checkedIn &&
                !b.checkedIn
              ) {
                return -1;
              }

              if (
                !a.checkedIn &&
                b.checkedIn
              ) {
                return 1;
              }

              const timeA =
                parseDate(
                  a.punchTime
                )?.getTime() ||
                0;

              const timeB =
                parseDate(
                  b.punchTime
                )?.getTime() ||
                0;

              return (
                timeB -
                timeA
              );
            }
          );

          console.log(
            "FINAL ATTENDANCE TABLE:",
            processed
          );

          console.log(
            "Total displayed:",
            processed.length
          );

          console.log(
            "Checked in:",
            processed.filter(
              (row) =>
                row.checkedIn
            ).length
          );

          console.log(
            "Not checked in:",
            processed.filter(
              (row) =>
                !row.checkedIn
            ).length
          );

          console.log(
            "========================================\n"
          );

          setAttendance(
            processed
          );

          setLastUpdated(
            new Date()
          );
        } catch (
          error
        ) {
          console.error(
            "========================================"
          );

          console.error(
            "ATTENDANCE API ERROR:",
            error
          );

          console.error(
            "Status:",
            error?.response?.status
          );

          console.error(
            "Response:",
            error?.response?.data
          );

          console.error(
            "========================================"
          );

          if (
            showLoading
          ) {
            setAttendance([]);
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        todayIndia,
        getAttendanceBiometricId,
        getPunchTime,
        getIndiaDateKey,
        memberMap,
        members,
        normalizeId,
        getEmployeeCode,
        getMemberName,
        getMemberMobile,
        getExpiryDate,
        getStartDate,
        getStatus,
        parseDate,
        getMemberBiometricId,
      ]
    );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadAttendance(true);
  }, [
    loadAttendance,
  ]);

  // ==========================================================
  // LIVE REFRESH
  // ==========================================================

  useEffect(() => {
    const interval =
      setInterval(
        () => {
          loadAttendance(
            false
          );
        },
        5000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    loadAttendance,
  ]);

  // ==========================================================
  // MANUAL REFRESH
  // ==========================================================

  const handleRefresh =
    async () => {
      setRefreshing(true);

      await loadAttendance(
        false
      );
    };

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredAttendance =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return attendance.filter(
        (row) => {
          const employeeCode =
            String(
              row.employeeCode ||
                ""
            ).toLowerCase();

          const name =
            String(
              row.name ||
                ""
            ).toLowerCase();

          const mobile =
            String(
              row.mobile ||
                ""
            ).toLowerCase();

          const matchesSearch =
            !value ||
            employeeCode.includes(
              value
            ) ||
            name.includes(
              value
            ) ||
            mobile.includes(
              value
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            row.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      attendance,
      search,
      statusFilter,
    ]);

  // ==========================================================
  // COUNTS
  // ==========================================================

  const checkedInCount =
    attendance.filter(
      (row) =>
        row.checkedIn
    ).length;

  const notCheckedInCount =
    attendance.filter(
      (row) =>
        !row.checkedIn
    ).length;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Home>

      <div
        className="container-fluid"
        style={{
          padding:
            "20px 22px",
        }}
      >

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div
          className="d-flex justify-content-between align-items-start mb-4"
        >

          <div>

            <h1
              className="fw-bold mb-1"
              style={{
                fontSize:
                  "42px",
              }}
            >
              Attendance Management
            </h1>

            <div
              className="text-muted"
              style={{
                fontSize:
                  "20px",
              }}
            >
              Real Time Biometric Attendance
            </div>

          </div>

          <div
            className="text-end"
          >

            <span
              className="badge bg-success"
              style={{
                fontSize:
                  "15px",
                padding:
                  "8px 12px",
              }}
            >
              • LIVE
            </span>

            <div
              className="text-muted mt-2"
              style={{
                fontSize:
                  "16px",
              }}
            >
              Updated:{" "}
              {lastUpdated.toLocaleTimeString(
                "en-IN",
                {
                  hour:
                    "2-digit",

                  minute:
                    "2-digit",

                  second:
                    "2-digit",

                  hour12:
                    true,
                }
              )}
            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* SUMMARY */}
        {/* ================================================== */}

        <div
          className="row g-3 mb-4"
        >

          <div
            className="col-md-4"
          >

            <div
              className="card border-0 shadow-sm"
            >

              <div
                className="card-body"
              >

                <div
                  className="text-muted"
                >
                  Registered Members
                </div>

                <div
                  className="fw-bold"
                  style={{
                    fontSize:
                      "30px",
                  }}
                >
                  {
                    members.length
                  }
                </div>

              </div>

            </div>

          </div>

          <div
            className="col-md-4"
          >

            <div
              className="card border-0 shadow-sm"
            >

              <div
                className="card-body"
              >

                <div
                  className="text-muted"
                >
                  Checked In Today
                </div>

                <div
                  className="fw-bold text-success"
                  style={{
                    fontSize:
                      "30px",
                  }}
                >
                  {
                    checkedInCount
                  }
                </div>

              </div>

            </div>

          </div>

          <div
            className="col-md-4"
          >

            <div
              className="card border-0 shadow-sm"
            >

              <div
                className="card-body"
              >

                <div
                  className="text-muted"
                >
                  Not Checked In
                </div>

                <div
                  className="fw-bold text-danger"
                  style={{
                    fontSize:
                      "30px",
                  }}
                >
                  {
                    notCheckedInCount
                  }
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* SEARCH */}
        {/* ================================================== */}

        <div
          className="card border-0 shadow-sm mb-4"
        >

          <div
            className="card-body"
          >

            <div
              className="row g-3"
            >

              <div
                className="col-md-8"
              >

                <input
                  type="text"
                  className="form-control"
                  placeholder="Search Employee Code / Name / Mobile"
                  value={
                    search
                  }
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  style={{
                    height:
                      "52px",

                    fontSize:
                      "18px",
                  }}
                />

              </div>

              <div
                className="col-md-4"
              >

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
                  style={{
                    height:
                      "52px",

                    fontSize:
                      "18px",
                  }}
                >

                  <option value="All">
                    All Status
                  </option>

                  <option value="Active">
                    Active
                  </option>

                  <option value="Expired">
                    Expired
                  </option>

                  <option value="Unknown">
                    Unknown
                  </option>

                </select>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* TODAY ATTENDANCE */}
        {/* ================================================== */}

        <div
          className="card border-0 shadow-sm"
        >

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div
            className="card-header bg-dark text-white d-flex justify-content-between align-items-center"
            style={{
              padding:
                "15px 20px",
            }}
          >

            <span
              style={{
                fontSize:
                  "20px",
              }}
            >
              Today's Attendance
            </span>

            <div
              className="d-flex align-items-center gap-2"
            >

              <span
                className="badge bg-success"
                style={{
                  fontSize:
                    "14px",
                }}
              >
                {
                  checkedInCount
                }{" "}
                Check-ins
              </span>

              <span
                className="badge bg-danger"
                style={{
                  fontSize:
                    "14px",
                }}
              >
                {
                  notCheckedInCount
                }{" "}
                Not Checked In
              </span>

              <button
                type="button"
                className="btn btn-sm btn-light"
                onClick={
                  handleRefresh
                }
                disabled={
                  refreshing
                }
              >
                {
                  refreshing
                    ? "Refreshing..."
                    : "Refresh"
                }
              </button>

            </div>

          </div>

          {/* ================================================= */}
          {/* TABLE */}
          {/* ================================================= */}

          <div
            className="table-responsive"
          >

            <table
              className="table table-hover mb-0"
            >

              <thead
                className="table-light"
              >

                <tr>

                  <th
                    className="text-center"
                  >
                    Employee Code
                  </th>

                  <th>
                    Name
                  </th>

                  <th>
                    Mobile
                  </th>

                  <th
                    className="text-center"
                  >
                    Check In
                  </th>

                  <th
                    className="text-center"
                  >
                    Expiry Date
                  </th>

                  <th
                    className="text-center"
                  >
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="text-center py-5"
                    >
                      Loading attendance...
                    </td>

                  </tr>

                ) : filteredAttendance.length ===
                  0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="text-center py-5 text-muted"
                    >
                      No registered members found.
                    </td>

                  </tr>

                ) : (

                  filteredAttendance.map(
                    (row) => (

                      <tr
                        key={
                          row._key
                        }
                      >

                        {/* ================================= */}
                        {/* EMPLOYEE CODE */}
                        {/* ================================= */}

                        <td
                          className="text-center fw-bold"
                          style={{
                            fontSize:
                              "18px",
                          }}
                        >
                          {
                            row.employeeCode ||
                            row.biometricId ||
                            "-"
                          }
                        </td>

                        {/* ================================= */}
                        {/* NAME */}
                        {/* ================================= */}

                        <td
                          className="fw-semibold"
                          style={{
                            fontSize:
                              "17px",
                          }}
                        >
                          {
                            row.name
                          }
                        </td>

                        {/* ================================= */}
                        {/* MOBILE */}
                        {/* ================================= */}

                        <td>
                          {
                            row.mobile ||
                            "-"
                          }
                        </td>

                        {/* ================================= */}
                        {/* CHECK IN */}
                        {/* ================================= */}

                        <td
                          className="text-center fw-bold"
                          style={{
                            fontSize:
                              "17px",
                          }}
                        >

                          {row.checkedIn ? (

                            <span
                              className="text-success"
                            >
                              {formatTime(
                                row.punchTime
                              )}
                            </span>

                          ) : (

                            <span
                              className="text-danger"
                              style={{
                                fontSize:
                                  "15px",
                              }}
                            >
                              Not Checked In
                            </span>

                          )}

                        </td>

                        {/* ================================= */}
                        {/* EXPIRY */}
                        {/* ================================= */}

                        <td
                          className="text-center"
                          style={{
                            fontSize:
                              "16px",
                          }}
                        >

                          {
                            row.expiryDate
                              ? formatDate(
                                  row.expiryDate
                                )
                              : "-"
                          }

                        </td>

                        {/* ================================= */}
                        {/* STATUS */}
                        {/* ================================= */}

                        <td
                          className="text-center"
                        >

                          <span
                            className={
                              row.status ===
                              "Active"
                                ? "badge bg-success"
                                : row.status ===
                                  "Expired"
                                ? "badge bg-danger"
                                : "badge bg-secondary"
                            }
                            style={{
                              fontSize:
                                "14px",

                              padding:
                                "7px 10px",
                            }}
                          >
                            {
                              row.status
                            }
                          </span>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </Home>
  );
}

export default Attendance;