import { registerOrganization } from "../controllers/auth.controller.js";
import express from "express";
import { authMiddleware } from "../middleware/auht.middleware.js";

const router = express.Router();

router.post("/register-organization", registerOrganization);


export default router;
