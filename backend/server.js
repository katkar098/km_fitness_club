require("dotenv").config();

const app = require("./app");

const {
  connectDB,
} = require("./src/config/db");

const {
  startLocalJobs,
} = require("./src/jobs/localSync.job");

const {
  cleanupExpiredMembersAutomatically,
} = require("./src/controllers/biometric.controller");

const logger =
  require("./src/utils/logger");

const port = Number(
  process.env.PORT || 5000
);

/*
|--------------------------------------------------------------------------
| EXPIRED BIOMETRIC CLEANUP SETTINGS
|--------------------------------------------------------------------------
|
| 60 seconds = checks every minute.
|
| Change this value if required.
|
*/

const EXPIRED_MEMBER_CHECK_INTERVAL =
  Number(
    process.env
      .EXPIRED_MEMBER_CHECK_INTERVAL ||
      60 * 1000
  );

/*
|--------------------------------------------------------------------------
| PREVENT OVERLAPPING CLEANUP JOBS
|--------------------------------------------------------------------------
*/

let cleanupRunning = false;

/*
|--------------------------------------------------------------------------
| RUN EXPIRED BIOMETRIC CLEANUP
|--------------------------------------------------------------------------
*/

async function runExpiredBiometricCleanup() {
  /*
  |--------------------------------------------------------------------------
  | PREVENT MULTIPLE SIMULTANEOUS RUNS
  |--------------------------------------------------------------------------
  */

  if (cleanupRunning) {
    logger.warn(
      "Expired biometric cleanup skipped because the previous cleanup is still running."
    );

    return;
  }

  cleanupRunning = true;

  try {
    logger.info(
      "Starting expired biometric cleanup..."
    );

    const results =
      await cleanupExpiredMembersAutomatically();

    const total =
      Array.isArray(results)
        ? results.length
        : 0;

    const deleted =
      Array.isArray(results)
        ? results.filter(
            (item) =>
              item.deleted === true
          ).length
        : 0;

    const alreadyMissing =
      Array.isArray(results)
        ? results.filter(
            (item) =>
              item.alreadyMissing === true
          ).length
        : 0;

    const failed =
      Array.isArray(results)
        ? results.filter(
            (item) =>
              item.success === false ||
              item.error
          ).length
        : 0;

    logger.info(
      `Expired biometric cleanup completed | Total: ${total} | Deleted: ${deleted} | Already Missing: ${alreadyMissing} | Failed: ${failed}`
    );
  } catch (error) {
    logger.error(
      `Expired biometric cleanup failed: ${error.message}`
    );

    console.error(
      "Expired biometric cleanup error:",
      error
    );
  } finally {
    cleanupRunning = false;
  }
}

/*
|--------------------------------------------------------------------------
| START EXPIRED BIOMETRIC AUTO SYNC
|--------------------------------------------------------------------------
*/

function startExpiredBiometricCleanupScheduler() {
  /*
  |--------------------------------------------------------------------------
  | RUN IMMEDIATELY
  |--------------------------------------------------------------------------
  */

  runExpiredBiometricCleanup();

  /*
  |--------------------------------------------------------------------------
  | RUN CONTINUOUSLY
  |--------------------------------------------------------------------------
  */

  const interval =
    setInterval(
      runExpiredBiometricCleanup,
      EXPIRED_MEMBER_CHECK_INTERVAL
    );

  /*
  |--------------------------------------------------------------------------
  | ALLOW NODE TO EXIT NORMALLY
  |--------------------------------------------------------------------------
  */

  if (
    interval &&
    typeof interval.unref === "function"
  ) {
    interval.unref();
  }

  logger.info(
    `Expired biometric cleanup scheduled every ${
      EXPIRED_MEMBER_CHECK_INTERVAL / 1000
    } seconds`
  );
}

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

async function start() {
  try {
    /*
    |--------------------------------------------------------------------------
    | CONNECT DATABASE
    |--------------------------------------------------------------------------
    */

    await connectDB();

    /*
    |--------------------------------------------------------------------------
    | START EXPRESS SERVER
    |--------------------------------------------------------------------------
    */

    const server =
      app.listen(
        port,
        () => {
          logger.info(
            `KM Fitness backend listening on ${port}`
          );

          /*
          |--------------------------------------------------------------------------
          | START LOCAL MDB / ATTENDANCE JOBS
          |--------------------------------------------------------------------------
          */

          try {
            startLocalJobs();
          } catch (error) {
            logger.error(
              `Local jobs failed to start: ${error.message}`
            );
          }

          /*
          |--------------------------------------------------------------------------
          | START EXPIRED BIOMETRIC AUTO CLEANUP
          |--------------------------------------------------------------------------
          |
          | No server restart required after this.
          |
          | The backend will automatically check:
          |
          | memberships.end_date < CURRENT_DATE
          |
          | and delete expired users from the biometric machine.
          |--------------------------------------------------------------------------
          */

          startExpiredBiometricCleanupScheduler();
        }
      );

    /*
    |--------------------------------------------------------------------------
    | SERVER ERROR
    |--------------------------------------------------------------------------
    */

    server.on(
      "error",
      (error) => {
        logger.error(
          `Server error: ${error.message}`
        );

        console.error(
          "Server error:",
          error
        );
      }
    );
  } catch (error) {
    logger.error(
      `Startup failed: ${error.message}`
    );

    console.error(
      "Startup failed:",
      error
    );

    process.exit(1);
  }
}

/*
|--------------------------------------------------------------------------
| START APPLICATION
|--------------------------------------------------------------------------
*/

start();