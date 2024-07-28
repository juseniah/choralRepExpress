import express from "express";
import { handleGetIndexPage, handlePostIndexPage } from "../controllers";

const router = express.Router();

// Define routes
router.get("/", handleGetIndexPage);
router.post("/", handlePostIndexPage);

export default router;
