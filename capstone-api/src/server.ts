import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/error";
import apiRoutes from "./routes";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: env.clientOrigin
  })
);
app.use(morgan("dev"));
app.use(express.json());

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

start();
