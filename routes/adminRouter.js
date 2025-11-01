// routes/adminRouter.js - COMPLETE VERSION WITH CUSTOMER MANAGEMENT
import express from 'express';
import { 
    loginAdmin, 
    getAllAdmins, 
    getAllCustomers,
    updateAdminPassword, 
    createAdminUser, 
    deleteAdminUser 
} from '../controllers/adminUserController.js';
import { adminAuth } from '../middleware/adminAuth.js';

const adminRouter = express.Router();

// PUBLIC ROUTES
adminRouter.post("/login", loginAdmin);

// PROTECTED ADMIN ROUTES (require admin authentication)
adminRouter.get("/admins", adminAuth, getAllAdmins);
adminRouter.get("/customers", adminAuth, getAllCustomers);
adminRouter.put("/password", adminAuth, updateAdminPassword);
adminRouter.post("/create", adminAuth, createAdminUser);
adminRouter.delete("/:userId", adminAuth, deleteAdminUser);

export default adminRouter;