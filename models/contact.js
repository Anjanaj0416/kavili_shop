import mongoose from "mongoose";

const contactSchema = mongoose.Schema({
    shopName: {
        type: String,
        required: true,
        default: "Udari Online Shop"
    },
    address: {
        type: String,
        required: true,
        default: "369/1/1, Kendaliyadda paluwa , Ganemulla."
    },
    phoneNumbers: [{
        type: {
            type: String,
            enum: ["mobile", "landline"],
            default: "mobile"
        },
        number: {
            type: String,
            required: true
        }
    }],
    email: {
        type: String,
        required: true,
        default: "anjan@.com"
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Contact = mongoose.model("contact", contactSchema);
export default Contact;