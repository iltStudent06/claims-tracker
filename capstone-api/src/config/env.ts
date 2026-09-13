import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

const required = ["JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (!mongoUri) {
  throw new Error("Missing required environment variable: MONGODB_URI");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongoUri,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d"
};
