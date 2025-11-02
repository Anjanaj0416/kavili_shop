import express from "express";
import { getContactInfo, updateContactInfo, initializeContactInfo } from "../controllers/contactController.js";

const contactRouter = express.Router();

// Public route - get contact information
contactRouter.get("/", getContactInfo);

// Admin only routes
contactRouter.put("/", updateContactInfo);
contactRouter.post("/initialize", initializeContactInfo);

export default contactRouter;