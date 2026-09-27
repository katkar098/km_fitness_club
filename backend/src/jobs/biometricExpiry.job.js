const cron = require("node-cron");

const {
  cleanupExpiredMembersAutomatically,
} = require(
  "../controllers/biometric.controller"
);

/*
|--------------------------------------------------------------------------
| RUN EXPIRED MEMBER CLEANUP
|--------------------------------------------------------------------------
|
| Runs every day at 12:05 AM.
|
| 5 0 * * *
|--------------------------------------------------------------------------
*/

function startBiometricExpiryJob() {
  cron.schedule(
    "5 0 * * *",
    async () => {
      try {
        console.log("");

        console.log(
          "=============================================="
        );

        console.log(
          "SCHEDULED BIOMETRIC EXPIRY JOB STARTED"
        );

        console.log(
          "=============================================="
        );

        const results =
          await cleanupExpiredMembersAutomatically();

        console.log(
          "Scheduled biometric cleanup completed."
        );

        console.log(
          "Processed members:",
          results.length
        );
      } catch (error) {
        console.error(
          "Scheduled biometric expiry job failed:",
          error
        );
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log(
    "Biometric expiry job scheduled successfully."
  );
}

module.exports = {
  startBiometricExpiryJob,
};