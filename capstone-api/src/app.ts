import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/error";
import apiRoutes from "./routes";

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

export default app;