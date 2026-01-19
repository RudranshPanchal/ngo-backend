// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import handlebars from "handlebars";
// import puppeteer from "puppeteer";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export const generatePDFBuffer = async (data) => {
//   const templatePath = path.join(__dirname, "../templates/AuditReport/pdfTemplate.html");
//   const html = fs.readFileSync(templatePath, "utf8");

//   const template = handlebars.compile(html);
//   const finalHTML = template(data);

//   const browser = await puppeteer.launch({
//     headless: "new",
//     args: ["--no-sandbox"],
//   });

//   const page = await browser.newPage();
//   await page.setContent(finalHTML, { waitUntil: "networkidle0" });

//   const pdf = await page.pdf({
//     format: "A4",
//     printBackground: true,
//   });

//   await browser.close();
//   return pdf;
// };
// // src/utils/pdfHelper.js mein niche add karein
// export const generateDonationPDF = async (data) => {
//   // Naya path jo humne Step 1 mein banaya
//   const templatePath = path.join(__dirname, "../templates/donationReceipt.html");
//   const html = fs.readFileSync(templatePath, "utf8");

//   const template = handlebars.compile(html);
//   const finalHTML = template(data);

//   const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
//   const page = await browser.newPage();
//   await page.setContent(finalHTML, { waitUntil: "networkidle0" });
  
//   const pdf = await page.pdf({ format: "A4", printBackground: true });
//   await browser.close();
//   return pdf;
// };
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import handlebars from "handlebars";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generatePDFBuffer = async (data, type = "donation") => {
  try {
    let templateFileName = "";
    
    // Yahan hum decide kar rahe hain ki kaunsa template kholna hai
    if (type === "audit") {
        templateFileName = "../templates/AuditReport/pdfTemplate.html";
    } else {
        templateFileName = "../templates/donationReceipt.html";
    }

    const templatePath = path.join(__dirname, templateFileName);
    
    // Check karo ki template folder mein hai ya nahi
    if (!fs.existsSync(templatePath)) {
        console.error(`❌ Template missing at: ${templatePath}`);
        throw new Error(`Template file not found!`);
    }

    const html = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(html);
    const finalHTML = template(data);

    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ["--no-sandbox", "--disable-setuid-sandbox"] 
    });
    
    const page = await browser.newPage();
    await page.setContent(finalHTML, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();
    
    return pdf;
  } catch (err) {
    console.error("PDF Generation Error:", err);
    throw err;
  }
};