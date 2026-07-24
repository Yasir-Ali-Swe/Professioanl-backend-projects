import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI = "mongodb://localhost:27017/SIMS";

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");

    const hashedPassword = await hashPassword("Password123!");

    const emailsToUpdate = ["platformAdmin@gmail.com", "ali.yasirswe@gmail.com", "aiproductengineer288@gmail.com"];

    for (const email of emailsToUpdate) {
      const res = await User.updateOne({ email }, { $set: { password: hashedPassword } });
      console.log(`Updated user ${email}:`, res);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

main();
