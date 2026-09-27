require("dotenv").config();

const app = require("./app");
const { connectDB } = require("./src/config/db");
const logger = require("./src/utils/logger");

const port = Number(process.env.PORT || 5000);

async function start() {
  try {
    await connectDB();

    const server = app.listen(port, () => {
      logger.info(`KM Fitness backend listening on ${port}`);
    });

    server.on("error", (error) => {
      logger.error(`Server error: ${error.message}`);
      console.error("Server error:", error);
    });
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);

    console.error("Startup failed:", error);

    process.exit(1);
  }
}

start();