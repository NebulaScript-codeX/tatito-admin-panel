import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: { type: String, trim: true },
    city: { type: String, trim: true, default: "" },
    gender: { type: String, trim: true, default: "" },
    dateOfBirth: { type: String, trim: true, default: "" },
    bloodGroup: { type: String, trim: true, default: "" },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["patient", "doctor", "partner"],
      required: true,
    },
    doctorId: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "active",
        "blocked",
        "deactivated",
        "pending",
        "verified",
        "rejected",
        "suspended",
      ],
      default: "active",
    },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    walletTransactions: [
      {
        type: { type: String, enum: ["credit", "debit"], required: true },
        amount: { type: Number, required: true },
        reason: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    familyMembers: [
      {
        name: { type: String, trim: true },
        relation: { type: String, trim: true },
        dob: { type: String, trim: true },
        phone: { type: String, trim: true },
      },
    ],
    addresses: [
      {
        label: { type: String, trim: true, default: "Home" },
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pinCode: { type: String, trim: true },
        country: { type: String, trim: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
    partnerRole: { type: String, trim: true },
    availability: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "suspended"],
      default: "pending",
    },
    rejectionReason: { type: String, default: "" },
    suspensionReason: { type: String, default: "" },
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.safe = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    mobile: this.mobile || "",
    city: this.city || "",
    gender: this.gender || "",
    dateOfBirth: this.dateOfBirth || "",
    bloodGroup: this.bloodGroup || "",
    role: this.role,
    doctorId: this.doctorId || "",
    status:
      this.status ||
      (this.isBlocked
        ? "blocked"
        : this.isActive === false
          ? "deactivated"
          : "active"),
    isActive: this.isActive !== false,
    isBlocked: Boolean(this.isBlocked),
    walletBalance: Number(this.walletBalance || 0),
    walletTransactions: Array.isArray(this.walletTransactions)
      ? this.walletTransactions
      : [],
    familyMembers: Array.isArray(this.familyMembers) ? this.familyMembers : [],
    addresses: Array.isArray(this.addresses) ? this.addresses : [],
    partnerRole: this.partnerRole || "",
    availability: this.availability || "available",
    verificationStatus: this.verificationStatus || this.status || "pending",
    rejectionReason: this.rejectionReason || "",
    suspensionReason: this.suspensionReason || "",
  };
};

const User = mongoose.model("User", userSchema);
export default User;
