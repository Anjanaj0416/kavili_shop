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
        unique: true   // Phone number is the unique identifier
    },
    password: {
        type: String,
        required: true // This will store hashed phone number for customers
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
    // 👇 new unified authentication fields
    providerName: {
        type: String,
        enum: ["local", "google", "facebook"],
        default: "local"
    },
    providerId: {
        type: String,
        unique: true,
        sparse: true, // multiple nulls allowed
        default: null
    }
});

const User = mongoose.model("user", userSchema);
export default User;