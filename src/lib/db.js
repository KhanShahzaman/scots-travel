import mongoose from "mongoose";
import "@/models/register-models";

const cached = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || "scot_travels",
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
