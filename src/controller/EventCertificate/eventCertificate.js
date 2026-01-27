import PDFDocument from "pdfkit";
import { v2 as cloudinary } from "cloudinary";
import EventCertificate from "../../model/EventCertificate/eventCertificate.js";
import Event from "../../model/Event/event.js";
import User from "../../model/Auth/auth.js";
import Task from "../../model/Task/task.js";
import path from "path";

// Helper: Upload Buffer to Cloudinary
const uploadStreamToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "event_certificates", resource_type: "auto" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// Helper function to draw the certificate template (used in both functions)
const drawCertificateTemplate = (doc, data) => {
    const {
        recipientName,
        eventTitle,
        totalHours,
        tasksCount,
        role,
        certificateId,
        eventDate
    } = data;

    // ═══════════════════════════════════════════════════════════
    // REGISTER FONTS
    // ═══════════════════════════════════════════════════════════
    const fontPath = path.join(process.cwd(), 'assets', 'fonts');
    
    doc.registerFont('GreatVibes', path.join(fontPath, 'GreatVibes-Regular.ttf'));
    doc.registerFont('Playfair-Bold', path.join(fontPath, 'playfair-display.bold.ttf'));
    doc.registerFont('Playfair-Regular', path.join(fontPath, 'playfair-display.regular.ttf'));
    doc.registerFont('OpenSans-Regular', path.join(fontPath, 'open-sans.regular.ttf'));
    doc.registerFont('OpenSans-Bold', path.join(fontPath, 'open-sans.bold.ttf'));
    doc.registerFont('DancingScript', path.join(fontPath, 'dancing-script.regular.ttf'));
    doc.registerFont('Lato', path.join(fontPath, 'Lato-Regular.ttf'));

    // Colors matching the template
    const PRIMARY = "#8c2bee";
    const PRIMARY_LIGHT = "#d4b8f0";
    const PRIMARY_FAINT = "#f3e8fc";
    const TEXT_DARK = "#141118";
    const TEXT_MUTED = "#756189";

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // ═══════════════════════════════════════════════════════════
    // BACKGROUND
    // ═══════════════════════════════════════════════════════════
    doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");

    // ═══════════════════════════════════════════════════════════
    // DECORATIVE FRAME - Double border effect
    // ═══════════════════════════════════════════════════════════
    const frameInset = 24;

    // Outer double border
    doc.lineWidth(4);
    doc.rect(frameInset, frameInset, pageWidth - frameInset * 2, pageHeight - frameInset * 2)
        .stroke(PRIMARY_LIGHT);

    doc.lineWidth(1.5);
    doc.rect(frameInset + 6, frameInset + 6, pageWidth - (frameInset + 6) * 2, pageHeight - (frameInset + 6) * 2)
        .stroke(PRIMARY_LIGHT);

    // Inner subtle border
    const innerInset = 48;
    doc.lineWidth(0.5);
    doc.rect(innerInset, innerInset, pageWidth - innerInset * 2, pageHeight - innerInset * 2)
        .stroke(PRIMARY_FAINT);

    // ═══════════════════════════════════════════════════════════
    // DECORATIVE CORNER TRIANGLES
    // ═══════════════════════════════════════════════════════════
    doc.save();
    doc.fillColor(PRIMARY).opacity(0.08);
    // Top-left corner
    doc.moveTo(0, 0).lineTo(100, 0).lineTo(0, 100).closePath().fill();
    // Bottom-right corner
    doc.moveTo(pageWidth, pageHeight).lineTo(pageWidth - 100, pageHeight).lineTo(pageWidth, pageHeight - 100).closePath().fill();
    doc.restore();

    // ═══════════════════════════════════════════════════════════
    // CONTENT POSITIONING
    // ═══════════════════════════════════════════════════════════
    const centerX = pageWidth / 2;
    let currentY = 70;

    // ═══════════════════════════════════════════════════════════
    // LOGO / DECORATIVE SEAL (Top)
    // ═══════════════════════════════════════════════════════════
    // try {
    //     doc.image("signatures/orbosis.png", centerX - 40, currentY, {
    //         width: 80,
    //         align: 'center'
    //     });
    //     currentY += 75;
    // } catch (e) {
    //     // Fallback decorative circle if no logo
    //     doc.save();
    //     doc.circle(centerX, currentY + 30, 28).lineWidth(2).stroke(PRIMARY_LIGHT);
    //     doc.circle(centerX, currentY + 30, 22).lineWidth(1).stroke(PRIMARY_FAINT);
    //     doc.restore();
    //     currentY += 75;
    // }
    const LOGO_WIDTH = 140;  // 🔧 Your desired width

    try {
        doc.image("signatures/orbosis.png", centerX - (LOGO_WIDTH / 2), currentY, {
            width: LOGO_WIDTH,
            align: 'center'
        });
        currentY += 75;  // 🔧 Increased spacing for larger logo
    } catch (e) {
        // Fallback decorative circle if no logo
        doc.save();
        doc.circle(centerX, currentY + 35, 35).lineWidth(2).stroke(PRIMARY_LIGHT);
        doc.circle(centerX, currentY + 35, 28).lineWidth(1).stroke(PRIMARY_FAINT);
        doc.restore();
        currentY += 100;
    }

    // ═══════════════════════════════════════════════════════════
    // "OFFICIAL CERTIFICATION" LABEL
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(9)
        .font("OpenSans-Bold")
        .fillColor(PRIMARY)
        .opacity(0.6)
        .text("OFFICIAL CERTIFICATION", 0, currentY, {
            width: pageWidth,
            align: "center",
            characterSpacing: 5
        });
    doc.opacity(1);

    currentY += 35;

    // ═══════════════════════════════════════════════════════════
    // MAIN TITLE
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(40)
        .font("GreatVibes") // Elegant script font
        .fillColor(TEXT_DARK)
        .text("Certificate of Appreciation", 0, currentY, {
            width: pageWidth,
            align: "center"
        });

    currentY += 50;

    // ═══════════════════════════════════════════════════════════
    // SUBTITLE
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(14)
        .font("Playfair-Regular")
        .fillColor(TEXT_MUTED)
        .text("This recognition is proudly presented to", 0, currentY, {
            width: pageWidth,
            align: "center"
        });

    currentY += 40;

    // ═══════════════════════════════════════════════════════════
    // RECIPIENT NAME WITH DECORATIVE UNDERLINE
    // ═══════════════════════════════════════════════════════════
    const nameWidth = 420;
    const nameX = (pageWidth - nameWidth) / 2;

    doc.fontSize(30)
        .font("Playfair-Bold")
        .fillColor(PRIMARY)
        .text(recipientName.toUpperCase(), 0, currentY, {
            width: pageWidth,
            align: "center"
        });

    currentY += 42;

    // Decorative underline
    doc.lineWidth(2)
        .strokeColor(PRIMARY_LIGHT)
        .moveTo(nameX, currentY)
        .lineTo(nameX + nameWidth, currentY)
        .stroke();

    currentY += 25;

    // ═══════════════════════════════════════════════════════════
    // DESCRIPTION TEXT
    // ═══════════════════════════════════════════════════════════
    const descriptionText = `In recognition of your outstanding dedication and exceptional volunteer service during the "${eventTitle}". Your ${totalHours} hours of contribution across ${tasksCount} tasks as a ${role || 'Volunteer'} have made a profound impact on our community.`;

    doc.fontSize(12)
        .font("OpenSans-Regular")
        .fillColor(TEXT_MUTED)
        .text(descriptionText, 100, currentY, {
            width: pageWidth - 200,
            align: "center",
            lineGap: 5
        });

    // // ═══════════════════════════════════════════════════════════
    // // SIGNATURES SECTION
    // // ═══════════════════════════════════════════════════════════
    // const sigY = pageHeight - 130;
    // const sigBlockWidth = 180;
    // const leftSigX = 100;
    // const rightSigX = pageWidth - leftSigX - sigBlockWidth;
    // const sealRadius = 45;

    // // ─────────────────────────────────────────────────────────
    // // LEFT SIGNATURE BLOCK (Coordinator)
    // // ─────────────────────────────────────────────────────────

    // // Signature image or placeholder
    // try {
    //     doc.image("signatures/coordinator.png", leftSigX + 15, sigY - 55, {
    //         width: 150,
    //         height: 55
    //     });
    // } catch (e) {
    //     doc.fontSize(22)
    //         .font("Helvetica-Oblique")
    //         .fillColor("#cccccc")
    //         .opacity(0.4)
    //         .text("Signature", leftSigX, sigY - 35, { width: sigBlockWidth, align: "center" });
    //     doc.opacity(1);
    // }

    // // Signature line
    // doc.lineWidth(1)
    //     .strokeColor(TEXT_DARK)
    //     .moveTo(leftSigX, sigY)
    //     .lineTo(leftSigX + sigBlockWidth, sigY)
    //     .stroke();

    // // Name and title
    // doc.fontSize(9)
    //     .font("Helvetica-Bold")
    //     .fillColor(TEXT_DARK)
    //     .text("EVENT COORDINATOR", leftSigX, sigY + 12, {
    //         width: sigBlockWidth,
    //         align: "center",
    //         characterSpacing: 2
    //     });

    // doc.fontSize(8)
    //     .font("Helvetica")
    //     .fillColor(TEXT_MUTED)
    //     .text("Orbosis NGO", leftSigX, sigY + 28, {
    //         width: sigBlockWidth,
    //         align: "center"
    //     });

    // // ─────────────────────────────────────────────────────────
    // // CENTER SEAL / BADGE
    // // ─────────────────────────────────────────────────────────
    // const sealCenterX = pageWidth / 2;
    // const sealCenterY = sigY - 5;

    // // Outer circle
    // doc.circle(sealCenterX, sealCenterY, sealRadius)
    //     .lineWidth(4)
    //     .strokeColor(PRIMARY_LIGHT)
    //     .stroke();

    // // Inner dashed circle
    // doc.circle(sealCenterX, sealCenterY, sealRadius - 10)
    //     .lineWidth(1)
    //     .dash(4, { space: 3 })
    //     .strokeColor(PRIMARY_LIGHT)
    //     .stroke();
    // doc.undash();

    // // Center decoration (simple star pattern)
    // doc.save();
    // doc.fillColor(PRIMARY).opacity(0.25);
    // const starPoints = 8;
    // const innerR = 12;
    // const outerR = 22;
    // doc.moveTo(sealCenterX, sealCenterY - outerR);
    // for (let i = 1; i <= starPoints * 2; i++) {
    //     const angle = (i * Math.PI) / starPoints - Math.PI / 2;
    //     const r = i % 2 === 0 ? outerR : innerR;
    //     doc.lineTo(
    //         sealCenterX + Math.cos(angle) * r,
    //         sealCenterY + Math.sin(angle) * r
    //     );
    // }
    // doc.closePath().fill();
    // doc.restore();

    // // ─────────────────────────────────────────────────────────
    // // RIGHT SIGNATURE BLOCK (Director/Date)
    // // ─────────────────────────────────────────────────────────

    // // Director signature
    // try {
    //     doc.image("signatures/director.png", rightSigX + 15, sigY - 55, {
    //         width: 150,
    //         height: 55
    //     });
    // } catch (e) {
    //     // Show date if no signature
    //     const formattedDate = new Date(eventDate || Date.now()).toLocaleDateString('en-US', {
    //         year: 'numeric',
    //         month: 'long',
    //         day: 'numeric'
    //     });
    //     doc.fontSize(13)
    //         .font("Helvetica-Bold")
    //         .fillColor(TEXT_DARK)
    //         .text(formattedDate, rightSigX, sigY - 25, {
    //             width: sigBlockWidth,
    //             align: "center"
    //         });
    // }

    // // Signature line
    // doc.lineWidth(1)
    //     .strokeColor(TEXT_DARK)
    //     .moveTo(rightSigX, sigY)
    //     .lineTo(rightSigX + sigBlockWidth, sigY)
    //     .stroke();

    // // Title and certificate ID
    // doc.fontSize(9)
    //     .font("Helvetica-Bold")
    //     .fillColor(TEXT_DARK)
    //     .text("DIRECTOR, ORBOSIS NGO", rightSigX, sigY + 12, {
    //         width: sigBlockWidth,
    //         align: "center",
    //         characterSpacing: 2
    //     });

    // doc.fontSize(8)
    //     .font("Helvetica")
    //     .fillColor(TEXT_MUTED)
    //     .text(`ID: ${certificateId}`, rightSigX, sigY + 28, {
    //         width: sigBlockWidth,
    //         align: "center"
    //     });



    // ═══════════════════════════════════════════════════════════
    // SIGNATURES SECTION
    // ═══════════════════════════════════════════════════════════

    // 🔧 ADJUSTABLE SETTINGS
    const SIG_WIDTH = 250;
    const SIG_HEIGHT = 150;
    const sigBlockWidth = 220;
    const sigY = pageHeight - 120;
    const leftSigX = 80;
    const rightSigX = pageWidth - leftSigX - sigBlockWidth;
    const sealRadius = 45;
    const SIG_OFFSET_Y = 50;

    // ─────────────────────────────────────────────────────────
    // LEFT SIGNATURE BLOCK (Coordinator)
    // ─────────────────────────────────────────────────────────
    try {
        doc.image("signatures/coordinator.png",
            leftSigX + (sigBlockWidth - SIG_WIDTH) / 2,
            sigY - SIG_OFFSET_Y,
            {
                width: SIG_WIDTH,
                height: SIG_HEIGHT,
                fit: [SIG_WIDTH, SIG_HEIGHT]
            }
        );
    } catch (e) {
        doc.fontSize(22)
            .font("DancingScript") // Looks like a signature
            .fillColor("#cccccc")
            .opacity(0.4)
            .text("Signature", leftSigX, sigY - 40, { width: sigBlockWidth, align: "center" });
        doc.opacity(1);
    }

    // Signature line
    doc.lineWidth(1)
        .strokeColor(TEXT_DARK)
        .moveTo(leftSigX, sigY)
        .lineTo(leftSigX + sigBlockWidth, sigY)
        .stroke();

    // Name and title
    doc.fontSize(9)
        .font("OpenSans-Bold")
        .fillColor(TEXT_DARK)
        .text("EVENT COORDINATOR", leftSigX, sigY + 12, {
            width: sigBlockWidth,
            align: "center",
            characterSpacing: 2
        });

    doc.fontSize(8)
        .font("OpenSans-Regular")
        .fillColor(TEXT_MUTED)
        .text("Orbosis NGO", leftSigX, sigY + 28, {
            width: sigBlockWidth,
            align: "center"
        });

    // ─────────────────────────────────────────────────────────
    // CENTER SEAL / BADGE
    // ─────────────────────────────────────────────────────────
    const sealCenterX = pageWidth / 2;
    const sealCenterY = sigY - 10;

    // Outer circle
    doc.circle(sealCenterX, sealCenterY, sealRadius)
        .lineWidth(4)
        .strokeColor(PRIMARY_LIGHT)
        .stroke();

    // Inner dashed circle
    doc.circle(sealCenterX, sealCenterY, sealRadius - 10)
        .lineWidth(1)
        .dash(4, { space: 3 })
        .strokeColor(PRIMARY_LIGHT)
        .stroke();
    doc.undash();

    // Center decoration (simple star pattern)
    doc.save();
    doc.fillColor(PRIMARY).opacity(0.25);
    const starPoints = 8;
    const innerR = 12;
    const outerR = 22;
    doc.moveTo(sealCenterX, sealCenterY - outerR);
    for (let i = 1; i <= starPoints * 2; i++) {
        const angle = (i * Math.PI) / starPoints - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        doc.lineTo(
            sealCenterX + Math.cos(angle) * r,
            sealCenterY + Math.sin(angle) * r
        );
    }
    doc.closePath().fill();
    doc.restore();

    // ─────────────────────────────────────────────────────────
    // RIGHT SIGNATURE BLOCK (Director)
    // ─────────────────────────────────────────────────────────
    try {
        doc.image("signatures/director.png",
            rightSigX + (sigBlockWidth - SIG_WIDTH) / 2,
            sigY - SIG_OFFSET_Y,
            {
                width: SIG_WIDTH,
                height: SIG_HEIGHT,
                fit: [SIG_WIDTH, SIG_HEIGHT]
            }
        );
    } catch (e) {
        const formattedDate = new Date(eventDate || Date.now()).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.fontSize(13)
            .font("Playfair-Bold")
            .fillColor(TEXT_DARK)
            .text(formattedDate, rightSigX, sigY - 30, {
                width: sigBlockWidth,
                align: "center"
            });
    }

    // Signature line
    doc.lineWidth(1)
        .strokeColor(TEXT_DARK)
        .moveTo(rightSigX, sigY)
        .lineTo(rightSigX + sigBlockWidth, sigY)
        .stroke();

    // Title and certificate ID
    doc.fontSize(9)
        .font("OpenSans-Bold")
        .fillColor(TEXT_DARK)
        .text("DIRECTOR, ORBOSIS NGO", rightSigX, sigY + 12, {
            width: sigBlockWidth,
            align: "center",
            characterSpacing: 2
        });

    doc.fontSize(8)
        .font("OpenSans-Regular")
        .fillColor(TEXT_MUTED)
        .text(`ID: ${certificateId}`, rightSigX, sigY + 28, {
            width: sigBlockWidth,
            align: "center"
        });

    // ═══════════════════════════════════════════════════════════
    // BOTTOM DECORATIVE LINE
    // ═══════════════════════════════════════════════════════════
    const bottomLineY = pageHeight - 45;
    doc.lineWidth(0.5)
        .strokeColor(PRIMARY_FAINT)
        .moveTo(100, bottomLineY)
        .lineTo(pageWidth - 100, bottomLineY)
        .stroke();

    // Event date at bottom
    const eventDateFormatted = new Date(eventDate || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.fontSize(8)
        .font("OpenSans-Regular")
        .fillColor(TEXT_MUTED)
        .text(`Event held on ${eventDateFormatted}`, 0, bottomLineY + 8, {
            width: pageWidth,
            align: "center"
        });
};

// ═══════════════════════════════════════════════════════════════════════
// GENERATE EVENT CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════
export const generateEventCertificate = async (req, res) => {
    try {
        const { eventId, userId, userRole } = req.body;
        const adminId = req.user._id;

        // 1. Validation
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: "Event not found" });

        if (event.status !== "completed") {
            return res.status(400).json({ success: false, message: "Event must be marked as completed first." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Check if certificate already exists
        const existingCert = await EventCertificate.findOne({ event: eventId, recipient: userId });
        if (existingCert) {
            return res.status(400).json({ success: false, message: "Certificate already generated for this user." });
        }

        // 2. Calculate Stats & Eligibility
        const tasks = await Task.find({ event: eventId, assignedTo: userId });

        if (tasks.length === 0) {
            return res.status(400).json({ success: false, message: "No tasks assigned to this user." });
        }

        const pendingTasks = tasks.filter(t => t.status !== 'completed');
        if (pendingTasks.length > 0) {
            return res.status(400).json({ success: false, message: "All assigned tasks must be completed." });
        }

        const totalHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
        if (totalHours <= 0) {
            return res.status(400).json({ success: false, message: "Total contributed hours must be greater than 0." });
        }

        // 3. Generate PDF
        const doc = new PDFDocument({
            layout: "landscape",
            size: "A4",
            margin: 0,
            bufferPages: true
        });

        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));

        // Generate unique certificate ID
        const certId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Draw the certificate template
        drawCertificateTemplate(doc, {
            recipientName: user.fullName,
            eventTitle: event.title,
            totalHours: totalHours,
            tasksCount: tasks.length,
            role: userRole,
            certificateId: certId,
            eventDate: event.eventDate
        });

        doc.end();

        // Wait for PDF generation
        await new Promise((resolve) => doc.on("end", resolve));
        const pdfBuffer = Buffer.concat(buffers);

        // 4. Upload to Cloudinary
        const uploadResult = await uploadStreamToCloudinary(pdfBuffer);

        // 5. Save Record
        const newCertificate = await EventCertificate.create({
            certificateId: certId,
            event: eventId,
            recipient: userId,
            recipientName: user.fullName,
            role: userRole,
            hoursCredited: totalHours,
            tasksCompleted: tasks.length,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            issuedBy: adminId
        });

        // 6. Lock Tasks
        await Task.updateMany(
            { event: eventId, assignedTo: userId },
            { $set: { status: "completed", isLocked: true } }
        );

        res.status(201).json({ success: true, data: newCertificate });

    } catch (error) {
        console.error("Event Certificate Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// DOWNLOAD EVENT CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════
export const downloadEventCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        const cert = await EventCertificate.findById(id).populate("event");

        if (!cert) {
            return res.status(404).json({ success: false, message: "Certificate not found" });
        }

        // Generate PDF for download
        const doc = new PDFDocument({
            layout: "landscape",
            size: "A4",
            margin: 0,
            bufferPages: true
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${cert.recipientName.replace(/\s+/g, '_')}-Certificate.pdf`);

        doc.pipe(res);

        // Draw the certificate template using stored data
        drawCertificateTemplate(doc, {
            recipientName: cert.recipientName,
            eventTitle: cert.event.title,
            totalHours: cert.hoursCredited,
            tasksCount: cert.tasksCompleted,
            role: cert.role,
            certificateId: cert.certificateId,
            eventDate: cert.event.eventDate
        });

        doc.end();

    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getEventCertificates = async (req, res) => {
    try {
        const { eventId } = req.params;
        const certificates = await EventCertificate.find({ event: eventId })
            .populate("recipient", "fullName email")
            .sort({ createdAt: -1 });

        res.json({ success: true, data: certificates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteEventCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        await EventCertificate.findByIdAndDelete(id);
        res.json({ success: true, message: "Certificate deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
