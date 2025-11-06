import express from "express";
import { getContactInfo, updateContactInfo, initializeContactInfo } from "../controllers/contactController.js";
import { adminAuth } from "../middleware/adminAuth.js";

const contactRouter = express.Router();

// Public route - get contact information
contactRouter.get("/", getContactInfo);

// Admin only routes - PROTECTED with adminAuth middleware
contactRouter.put("/", adminAuth, updateContactInfo);
contactRouter.post("/initialize", adminAuth, initializeContactInfo);

export default contactRouter;