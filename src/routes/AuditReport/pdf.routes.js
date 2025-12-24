import express from "express";
import { createAuditPDF } from "../../controller/AuditReport/pdfController.js";

const router = express.Router();
router.post("/pdf", createAuditPDF);

export default router;