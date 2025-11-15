import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("MongoDB connected successfully");
  } catch (error) {
    if (error instanceof Error) {
      console.error("MongoDB connection error:", error.message);
    } else {
      console.error("MongoDB connection error:", error);
    }
    console.log("Server will continue running without database...");
    // Don't exit - let server start anyway for debugging
  }
};

export default connectDB;
