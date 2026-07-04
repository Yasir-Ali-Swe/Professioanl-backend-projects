import { adminMiddleware } from "../middleware/admin.middleware.js";
import express from "express";
import { createUser, getAllUsers } from "../controllers/user.controler.js";

const router = express.Router();

router.post("/create-user", adminMiddleware, createUser);
router.get("/get-users", adminMiddleware, getAllUsers);

export default router;

