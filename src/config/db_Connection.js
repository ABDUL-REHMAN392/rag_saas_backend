import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(
      `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME}`
    );
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB Error ❌", error.message);
    process.exit(1);
  }
};

export default connectDB;
