import mongoose from "mongoose";

const aboutSchema = mongoose.Schema({
    companyOverview: {
        title: {
            type: String,
            required: true,
            default: "Welcome to Udari Online Shop"
        },
        description: {
            type: String,
            required: true,
            default: "We are a leading spice retailer providing high-quality authentic spices."
        },
        images: [{
            type: String
        }]
    },
    story: {
        title: {
            type: String,
            required: true,
            default: "Our Story"
        },
        description: {
            type: String,
            required: true,
            default: "Founded with a passion for authentic flavors..."
        }
    },
    teamMembers: [{
        name: {
            type: String,
            required: true
        },
        position: {
            type: String,
            required: true
        },
        bio: {
            type: String,
            required: true
        },
        image: {
            type: String,
            required: false
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const About = mongoose.model("about", aboutSchema);
export default About;