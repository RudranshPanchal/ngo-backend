import {
  generateCertificate,
  getAllCertificates,
  verifyCertificate,
  deleteCertificate,
  updateCertificate,
  downloadCertificatePDF,
  sendCertificateEmailController
} from "../../controller/Certificate/certificate.js";

import express from "express";
const router = express.Router();

router.post("/generate", generateCertificate);
router.get("/all", getAllCertificates);
router.get("/verify/:id", verifyCertificate);
router.delete("/delete/:id", deleteCertificate);
router.patch("/update/:id", updateCertificate);

// PDF download route
router.get("/pdf/:id", downloadCertificatePDF);

//  EMAIL SEND ROUTE (this was missing)
router.post("/send-email", sendCertificateEmailController);

export default router;
