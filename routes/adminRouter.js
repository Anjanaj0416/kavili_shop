// routes/adminRouter.js
import express from "express";
import { 
    createAdminAccount, 
    adminLogin, 
    getAllAdmins,
    updateAdminPassword,
    deleteAdminAccount
} from "../controllers/adminUserController.js";
import { adminAuth } from "../middleware/adminAuth.js";


const adminRouter = express.Router();

// Admin login (public - but only for admin credentials)
adminRouter.post("/login", adminLogin);

// Protected admin routes (require admin authentication)
adminRouter.post("/create", adminAuth, createAdminAccount);
adminRouter.get("/list", adminAuth, getAllAdmins);
adminRouter.put("/password", adminAuth, updateAdminPassword);
adminRouter.delete("/:adminId", adminAuth, deleteAdminAccount);


export default adminRouter;