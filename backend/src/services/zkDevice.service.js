const ZKLib = require("zklib");
const { Commands } = require("zklib/zklib/constants");

// ============================================================
// DEVICE CONFIGURATION
// ============================================================

const DEVICE_IP =
  process.env.ZK_DEVICE_IP || "192.168.0.201";

const DEVICE_PORT = Number(
  process.env.ZK_DEVICE_PORT || 4370
);

const DEVICE_INPORT_BASE = Number(
  process.env.ZK_DEVICE_INPORT || 5200
);

const DEVICE_TIMEOUT = Number(
  process.env.ZK_DEVICE_TIMEOUT || 5000
);

const CONNECTION_RETRIES = 5;

// ============================================================
// BIOMETRIC OPERATION LOCK
// ============================================================

let biometricQueue = Promise.resolve();

function withBiometricLock(operation) {
  const nextOperation =
    biometricQueue.then(() => operation());

  biometricQueue =
    nextOperation.catch(() => {});

  return nextOperation;
}

// ============================================================
// LOCAL UDP PORT GENERATOR
// ============================================================

let portCounter = 0;

function getNextInport() {
  portCounter += 1;

  return (
    DEVICE_INPORT_BASE +
    (portCounter % 1000) +
    1
  );
}

// ============================================================
// WAIT
// ============================================================

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// ============================================================
// CONNECT DEVICE
// ============================================================

function connectDevice() {
  return withBiometricLock(async () => {
    return connectDeviceInternal();
  });
}

async function connectDeviceInternal() {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= CONNECTION_RETRIES;
    attempt += 1
  ) {
    const inport = getNextInport();

    let zk = null;

    try {
      zk = new ZKLib({
        ip: DEVICE_IP,
        port: DEVICE_PORT,
        inport,
        timeout: DEVICE_TIMEOUT,
        connectionType: "udp",
      });

      await new Promise((resolve, reject) => {
        zk.connect((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      console.log(
        `Biometric connected successfully using local UDP port ${inport}`
      );

      return zk;
    } catch (error) {
      lastError = error;

      console.warn(
        `Biometric connection attempt ${attempt}/${CONNECTION_RETRIES} failed on local port ${inport}:`,
        error?.message || error
      );

      disconnectDevice(zk);

      await sleep(300);
    }
  }

  throw (
    lastError ||
    new Error(
      "Unable to connect to biometric device."
    )
  );
}

// ============================================================
// DISCONNECT DEVICE
// ============================================================

function disconnectDevice(zk) {
  if (!zk) {
    return;
  }

  try {
    if (typeof zk.disconnect === "function") {
      zk.disconnect();
    }
  } catch (error) {
    console.warn(
      "ZK disconnect warning:",
      error?.message || error
    );
  }
}

// ============================================================
// READ USERS
// ============================================================

function readUsers(zk) {
  return new Promise((resolve, reject) => {
    if (
      !zk ||
      typeof zk.getUser !== "function"
    ) {
      reject(
        new Error(
          "getUser() is not available in the installed zklib package."
        )
      );

      return;
    }

    let finished = false;

    const finish = (error, users) => {
      if (finished) {
        return;
      }

      finished = true;

      if (error) {
        reject(error);
        return;
      }

      resolve(users || []);
    };

    try {
      const result = zk.getUser(finish);

      if (
        result &&
        typeof result.then === "function"
      ) {
        result
          .then((users) => {
            finish(null, users);
          })
          .catch((error) => {
            finish(error);
          });
      }
    } catch (error) {
      finish(error);
    }
  });
}

// ============================================================
// NORMALIZE BIOMETRIC ID
// ============================================================

function normalizeBiometricId(value) {
  const valueString =
    String(value ?? "").trim();

  if (!valueString) {
    return "";
  }

  const normalized =
    valueString.replace(/^0+/, "");

  return normalized || "0";
}

// ============================================================
// NORMALIZE DEVICE USER
// ============================================================

function normalizeDeviceUser(user) {
  if (!user) {
    return null;
  }

  const biometricUserId =
    user.userid ??
    user.userId ??
    user.pin ??
    user.PIN ??
    user.employeeCode ??
    "";

  const uid =
    user.uid ??
    user.UID ??
    "";

  const name =
    user.name ??
    user.userName ??
    user.username ??
    "";

  const cardNo =
    user.cardno ??
    user.cardNo ??
    user.card ??
    "";

  const role =
    user.role ??
    user.privilege ??
    0;

  return {
    uid:
      String(uid ?? "").trim(),

    biometric_user_id:
      String(
        biometricUserId ?? ""
      ).trim(),

    employee_code:
      String(
        biometricUserId ?? ""
      ).trim(),

    full_name:
      String(name ?? "").trim(),

    mobile:
      String(user.mobile ?? "").trim(),

    gender:
      String(user.gender ?? "").trim(),

    address:
      String(user.address ?? "").trim(),

    card_no:
      String(cardNo ?? "").trim(),

    role,
  };
}

// ============================================================
// INTERNAL GET USERS
// ============================================================

async function getUsersInternal() {
  let zk = null;

  try {
    zk = await connectDeviceInternal();

    const rawUsers =
      await readUsers(zk);

    console.log("");
    console.log(
      "======================================"
    );

    console.log(
      "BIOMETRIC MACHINE:",
      `${DEVICE_IP}:${DEVICE_PORT}`
    );

    console.log(
      "RAW USERS FROM MACHINE:",
      rawUsers.length
    );

    const users =
      rawUsers
        .map(normalizeDeviceUser)
        .filter(
          (user) =>
            user &&
            user.biometric_user_id
        );

    console.log(
      "NORMALIZED USERS FROM MACHINE:",
      users.length
    );

    console.log(
      "======================================"
    );

    return users;
  } finally {
    disconnectDevice(zk);
  }
}

// ============================================================
// GET ALL USERS
// ============================================================

async function getUsers() {
  return withBiometricLock(async () => {
    return getUsersInternal();
  });
}

// ============================================================
// FIND USER BY BIOMETRIC ID
// ============================================================

async function findUserByBiometricId(
  biometricUserId
) {
  return withBiometricLock(async () => {
    const targetId =
      normalizeBiometricId(
        biometricUserId
      );

    if (!targetId) {
      return null;
    }

    const users =
      await getUsersInternal();

    return (
      users.find((user) => {
        const userId =
          normalizeBiometricId(
            user.biometric_user_id
          );

        return userId === targetId;
      }) || null
    );
  });
}

// ============================================================
// DELETE DEVICE USER
//
// IMPORTANT:
//
// Prefer zklib's native delUser() method.
// The previous implementation directly called executeCmd()
// with a Buffer. Your device returned:
//
// Invalid request
//
// even though bb00 is correct little-endian for UID 187.
//
// Therefore we use the installed library's own delete
// implementation whenever available.
//
// ============================================================

function deleteDeviceUser(
  zk,
  machineUid
) {
  return new Promise(
    (resolve, reject) => {
      if (!zk) {
        reject(
          new Error(
            "Biometric device connection is not available."
          )
        );

        return;
      }

      const uid =
        Number(machineUid);

      if (
        !Number.isInteger(uid) ||
        uid < 0 ||
        uid > 0xffff
      ) {
        reject(
          new Error(
            `Invalid machine UID for biometric deletion: ${machineUid}`
          )
        );

        return;
      }

      console.log(
        "Delete machine UID:",
        uid
      );

      // ======================================================
      // METHOD 1
      //
      // Use native zklib delete method if available.
      // ======================================================

      const deleteMethod =
        typeof zk.delUser === "function"
          ? "delUser"
          : typeof zk.deleteUser === "function"
          ? "deleteUser"
          : null;

      if (deleteMethod) {
        console.log(
          `Using zklib native ${deleteMethod}() method.`
        );

        try {
          let finished = false;

          const finish = (
            error,
            result
          ) => {
            if (finished) {
              return;
            }

            finished = true;

            if (error) {
              reject(error);
              return;
            }

            resolve(result);
          };

          let result;

          // --------------------------------------------------
          // Different zklib builds use different signatures.
          //
          // Most older zklib builds:
          //
          // delUser(uid, callback)
          //
          // Newer Promise-based builds:
          //
          // delUser(uid)
          // --------------------------------------------------

          if (zk[deleteMethod].length >= 2) {
            result =
              zk[deleteMethod](
                uid,
                finish
              );
          } else {
            result =
              zk[deleteMethod](uid);
          }

          if (
            result &&
            typeof result.then ===
              "function"
          ) {
            result
              .then((data) => {
                finish(null, data);
              })
              .catch((error) => {
                finish(error);
              });

            return;
          }

          // If callback-style method is used,
          // callback will call finish().
          if (
            zk[deleteMethod].length >= 2
          ) {
            return;
          }

          // Synchronous fallback.
          if (
            result !== undefined
          ) {
            finish(
              null,
              result
            );
          }
        } catch (error) {
          reject(error);
        }

        return;
      }

      // ======================================================
      // METHOD 2
      //
      // Raw protocol fallback.
      //
      // Only used if this installed zklib does not expose
      // delUser/deleteUser.
      //
      // CMD_DELETE_USER = 18
      // Payload = 2-byte little-endian UID.
      // ======================================================

      if (
        typeof zk.executeCmd !==
        "function"
      ) {
        reject(
          new Error(
            "This zklib package has neither delUser(), deleteUser(), nor executeCmd()."
          )
        );

        return;
      }

      console.log(
        "Native delete method unavailable."
      );

      console.log(
        "Using raw CMD_DELETE_USER fallback."
      );

      const uidBuffer =
        Buffer.alloc(2);

      uidBuffer.writeUInt16LE(
        uid,
        0
      );

      console.log(
        "Delete UID:",
        uid
      );

      console.log(
        "Delete UID HEX:",
        uidBuffer.toString("hex")
      );

      let finished = false;

      const finish = (
        error,
        result
      ) => {
        if (finished) {
          return;
        }

        finished = true;

        if (error) {
          if (result) {
            error.deviceResponse =
              result.toString("hex");
          }

          reject(error);
          return;
        }

        resolve(result);
      };

      try {
        const result =
          zk.executeCmd(
            Commands.DELETE_USER,
            uidBuffer,
            finish
          );

        if (
          result &&
          typeof result.then ===
            "function"
        ) {
          result
            .then((data) => {
              finish(null, data);
            })
            .catch((error) => {
              finish(error);
            });
        }
      } catch (error) {
        finish(error);
      }
    }
  );
}

// ============================================================
// REFRESH DEVICE DATA
// ============================================================

function refreshDeviceData(zk) {
  return new Promise(
    (resolve, reject) => {
      if (
        !zk ||
        typeof zk.executeCmd !==
          "function"
      ) {
        reject(
          new Error(
            "Biometric device refresh command is not available."
          )
        );

        return;
      }

      let finished = false;

      const finish = (
        error,
        response
      ) => {
        if (finished) {
          return;
        }

        finished = true;

        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      };

      try {
        const result =
          zk.executeCmd(
            Commands.REFRESHDATA,
            "",
            finish
          );

        if (
          result &&
          typeof result.then ===
            "function"
        ) {
          result
            .then((response) => {
              finish(
                null,
                response
              );
            })
            .catch((error) => {
              finish(error);
            });
        }
      } catch (error) {
        finish(error);
      }
    }
  );
}

// ============================================================
// ENABLE / DISABLE DEVICE
// ============================================================

function setDeviceEnabled(
  zk,
  enabled
) {
  const method =
    enabled
      ? "enableDevice"
      : "disableDevice";

  return new Promise(
    (resolve, reject) => {
      if (
        !zk ||
        typeof zk[method] !==
          "function"
      ) {
        reject(
          new Error(
            `Biometric device ${method} command is not available.`
          )
        );

        return;
      }

      let finished = false;

      const finish = (
        error,
        response
      ) => {
        if (finished) {
          return;
        }

        finished = true;

        if (error) {
          if (response) {
            error.deviceResponse =
              response.toString(
                "hex"
              );
          }

          reject(error);
          return;
        }

        resolve(response);
      };

      try {
        const result =
          zk[method](finish);

        if (
          result &&
          typeof result.then ===
            "function"
        ) {
          result
            .then((response) => {
              finish(
                null,
                response
              );
            })
            .catch((error) => {
              finish(error);
            });
        }
      } catch (error) {
        finish(error);
      }
    }
  );
}

// ============================================================
// CHECK USER EXISTS
// ============================================================

function userExists(
  users,
  targetId
) {
  return users.some(
    (rawUser) => {
      const normalized =
        normalizeDeviceUser(
          rawUser
        );

      if (!normalized) {
        return false;
      }

      return (
        normalizeBiometricId(
          normalized.biometric_user_id
        ) === targetId
      );
    }
  );
}

// ============================================================
// DELETE USER BY BIOMETRIC ID
// ============================================================

async function deleteUserByBiometricId(
  biometricUserId
) {
  return withBiometricLock(
    async () => {
      let zk = null;
      let deviceDisabled = false;

      try {
        const targetId =
          normalizeBiometricId(
            biometricUserId
          );

        if (!targetId) {
          throw new Error(
            "Biometric user ID is required."
          );
        }

        console.log("");
        console.log(
          "=============================================="
        );

        console.log(
          "DELETE BIOMETRIC USER"
        );

        console.log(
          "Target Biometric ID:",
          targetId
        );

        console.log(
          "Device:",
          `${DEVICE_IP}:${DEVICE_PORT}`
        );

        // ====================================================
        // CONNECT
        // ====================================================

        zk =
          await connectDeviceInternal();

        // ====================================================
        // READ USERS
        // ====================================================

        const rawUsers =
          await readUsers(zk);

        console.log(
          "Machine users found:",
          rawUsers.length
        );

        // ====================================================
        // FIND TARGET USER
        // ====================================================

        let machineUser =
          null;

        for (
          const rawUser of rawUsers
        ) {
          const normalized =
            normalizeDeviceUser(
              rawUser
            );

          if (!normalized) {
            continue;
          }

          const currentId =
            normalizeBiometricId(
              normalized.biometric_user_id
            );

          if (
            currentId ===
            targetId
          ) {
            machineUser = {
              raw: rawUser,
              normalized,
            };

            break;
          }
        }

        // ====================================================
        // ALREADY MISSING
        // ====================================================

        if (!machineUser) {
          console.log(
            "User not found on biometric machine."
          );

          console.log(
            "Nothing to delete."
          );

          console.log(
            "=============================================="
          );

          return {
            success: true,
            deleted: false,
            alreadyMissing: true,
            biometricUserId: targetId,
            message:
              "User was already not present on the biometric machine.",
          };
        }

        // ====================================================
        // MACHINE UID
        // ====================================================

        const machineUid =
          machineUser.raw.uid ??
          machineUser.raw.UID ??
          machineUser.normalized.uid;

        if (
          machineUid === null ||
          machineUid === undefined ||
          machineUid === ""
        ) {
          throw new Error(
            `Machine UID not found for biometric user ${targetId}.`
          );
        }

        console.log(
          "Matched machine user:",
          {
            biometricUserId:
              targetId,

            machineUid,

            name:
              machineUser
                .normalized
                .full_name,
          }
        );

        // ====================================================
        // DISABLE DEVICE
        // ====================================================

        try {
          console.log(
            "Disabling biometric device before delete..."
          );

          await setDeviceEnabled(
            zk,
            false
          );

          deviceDisabled = true;

          console.log(
            "Biometric device disabled."
          );
        } catch (disableError) {
          console.warn(
            "Could not disable biometric device before delete:",
            disableError?.message ||
              disableError
          );

          console.warn(
            "Continuing with deletion..."
          );
        }

        // ====================================================
        // DELETE
        // ====================================================

        console.log(
          "Deleting user from biometric machine..."
        );

        const deleteResult =
          await deleteDeviceUser(
            zk,
            machineUid
          );

        console.log(
          "Delete command accepted by biometric machine."
        );

        // ====================================================
        // REFRESH
        // ====================================================

        try {
          console.log(
            "Refreshing biometric device data..."
          );

          await refreshDeviceData(
            zk
          );

          console.log(
            "Biometric device data refreshed."
          );
        } catch (refreshError) {
          console.warn(
            "Refresh command failed:",
            refreshError?.message ||
              refreshError
          );
        }

        // ====================================================
        // WAIT
        // ====================================================

        await sleep(500);

        // ====================================================
        // VERIFY DELETION
        // ====================================================

        console.log(
          "Verifying deletion on biometric machine..."
        );

        const usersAfterDelete =
          await readUsers(zk);

        const stillPresent =
          userExists(
            usersAfterDelete,
            targetId
          );

        if (stillPresent) {
          throw new Error(
            `Biometric device accepted the delete command, but user ${targetId} is still present on the machine.`
          );
        }

        console.log(
          "=============================================="
        );

        console.log(
          "BIOMETRIC USER DELETED SUCCESSFULLY"
        );

        console.log(
          "Biometric ID:",
          targetId
        );

        console.log(
          "Machine UID:",
          machineUid
        );

        console.log(
          "Name:",
          machineUser.normalized.full_name
        );

        console.log(
          "=============================================="
        );

        return {
          success: true,

          deleted: true,

          alreadyMissing: false,

          biometricUserId:
            targetId,

          machineUid:
            String(machineUid),

          name:
            machineUser.normalized.full_name,

          result:
            deleteResult ?? null,

          message:
            "User deleted successfully from biometric machine.",
        };
      } catch (error) {
        console.error("");
        console.error(
          "=============================================="
        );

        console.error(
          "BIOMETRIC DELETE ERROR"
        );

        console.error(
          error?.message ||
            error
        );

        if (error?.deviceResponse) {
          console.error(
            "Device response (hex):",
            error.deviceResponse
          );
        }

        console.error(
          "=============================================="
        );

        throw error;
      } finally {
        // ====================================================
        // RE-ENABLE DEVICE
        // ====================================================

        if (deviceDisabled) {
          try {
            console.log(
              "Re-enabling biometric device..."
            );

            await setDeviceEnabled(
              zk,
              true
            );

            console.log(
              "Biometric device re-enabled."
            );
          } catch (enableError) {
            console.warn(
              "Failed to re-enable biometric device:",
              enableError?.message ||
                enableError
            );
          }
        }

        // ====================================================
        // DISCONNECT
        // ====================================================

        disconnectDevice(zk);
      }
    }
  );
}

// ============================================================
// DEVICE STATUS
// ============================================================

async function getStatus() {
  return withBiometricLock(
    async () => {
      let zk = null;

      try {
        zk =
          await connectDeviceInternal();

        return {
          connected: true,

          ip:
            DEVICE_IP,

          port:
            DEVICE_PORT,
        };
      } finally {
        disconnectDevice(zk);
      }
    }
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getUsers,

  getStatus,

  findUserByBiometricId,

  deleteUserByBiometricId,

  normalizeDeviceUser,

  normalizeBiometricId,

  connectDevice,

  disconnectDevice,
};
