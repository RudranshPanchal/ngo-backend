import path from "path";
import { generatePDFBuffer } from "../../services/pdf.service.js";
import { toBase64File } from "../../utils/auditReport/helper.js";
import { fileURLToPath } from "url";

export const createAuditPDF = async (req, res) => {
    try {
        const {
            ngoName,
            financialYear,
            financialYearStart,
            financialYearEnd,
            auditorName,
            firmName,
            firmAddress,
            reportHTML,
            dateOfReport,
            membershipNumber,
            presidentDate,
            auditorDate,
            presidentName,
        } = req.body;

        if (!ngoName || !financialYear || !auditorName || !reportHTML) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Load CA logo (once)
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const logoPath = path.resolve(__dirname,  "../../templates/AuditReport/assets/caLogo.png");
        // const logoBuffer = fs.readFileSync(logoPath);
        // const caLogoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        const caLogoBase64 = toBase64File(logoPath);
        // const logoSrc = `data:image/png;base64,${logoBase64}`;


        // Signature
        // const auditorSigBase64 = req.files?.auditorSignature
        //     ? bufferToBase64(req.files.auditorSignature[0].buffer)
        //     : null;

        // const presidentSigBase64 = req.files?.presidentSignature
        //     ? bufferToBase64(req.files.presidentSignature[0].buffer)
        //     : null;


        const pdfBuffer = await generatePDFBuffer({
            ngoName,
            financialYear,
            financialYearStart,
            financialYearEnd,
            auditorName,
            firmName,
            firmAddress,
            membershipNumber,
            reportHTML,
            date: dateOfReport || new Date().toLocaleDateString(),
            caLogoBase64,
            auditorDate,
            presidentDate,
            // auditorSigBase64,
            // presidentSigBase64,
            presidentName
        });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=audit-report.pdf",
        });

        res.send(pdfBuffer);
    } catch (err) {
        console.error("PDF ERROR:", err);
        res.status(500).json({ error: "PDF generation failed" });
    }
};


