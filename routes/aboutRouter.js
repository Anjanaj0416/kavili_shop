import express from "express";
import { getAboutInfo, updateAboutInfo, initializeAboutInfo } from "../controllers/aboutController.js";

const aboutRouter = express.Router();

// Public route - get about information
aboutRouter.get("/", getAboutInfo);

// Admin only routes
aboutRouter.put("/", updateAboutInfo);
aboutRouter.post("/initialize", initializeAboutInfo);

export default aboutRouter;