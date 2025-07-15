/*import mongoose from "mongoose";
const userSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    type : {
        type: String,
        default: "customer"
    },
    phonenumber: {
        type: String,
        required: true,
        unique: true
    },
    homeaddress: {
        type: String,
        required: true
    }
});

const User = mongoose.model("user", userSchema);

export default User*/

import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: "customer"
    },
    phonenumber: {
        type: String,
        required: true,   
    },
    homeaddress: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false, 
        unique: true
    },
    
    
});

const User = mongoose.model("user", userSchema);
export default User;
