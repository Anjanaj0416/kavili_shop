import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: false
    },
    userId: {
        type: String,
        unique: true,
        required: true
    },
    type: {
        type: String,
        enum: ["customer", "admin"],
        default: "customer"
    },
    phonenumber: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    homeaddress: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false,
        sparse: true,
        default: null
    },
    // 👇 unified authentication fields
    providerName: {
        type: String,
        enum: ["local", "google", "facebook"],
        default: "local"
    },
    providerId: {
        type: String,
        sparse: true,
        default: null
    }
});

// Create sparse unique indexes manually
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ providerId: 1 }, { unique: true, sparse: true });

const User = mongoose.model("user", userSchema);
export default User;