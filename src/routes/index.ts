import express from "express";
import { getIndexPage, postIndexPage } from "../controllers/index";

const router = express.Router();

// Define routes
router.get("/", getIndexPage);
router.post("/", postIndexPage);

export default router;
