import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const generateAuditReport = async (req, res) => {
  try {
    const d = req.body;
    console.log("🔹 Advanced Audit Generation Started");

    // ===== PROFESSIONAL SYSTEM PROMPT (CA-LEVEL EXPERTISE) =====
    const systemPrompt = `You are a Senior Chartered Accountant with 15+ years of experience in NGO audit and compliance. You follow:
1. ICAI's Standards on Auditing (SAs) and Reporting (SREs)
2. Companies Act 2013 & Section 8 Company requirements
3. FCRA 2010 compliance guidelines
4. Income Tax Act 1961 (Section 12A/12AA/80G)
5. CSR Rules 2014 (if applicable)

**CRITICAL RULES:**
- Use EXACT data from user - NO invention, NO placeholder values
- Missing data = explicitly state "Not Provided" or "Not Available"
- Financial figures must be internally consistent
- Maintain professional skepticism tone
- Follow ICAI's 7-part audit report structure
- Add analytical commentary on financial ratios/trends
- Highlight compliance gaps professionally
- Use standard audit terminology (True & Fair, Material Misstatement, etc.)

**Report Structure to Follow:**
1. COVER PAGE (Formal with all identifiers)
2. AUDIT REPORT (Independent Auditor's Report - Standard Format)
3. FINANCIAL STATEMENTS:
   a) Balance Sheet
   b) Income & Expenditure Account
   c) Receipts & Payments Account (If data available then only mention else leave)
   d) Schedules forming part of accounts (If data available then only mention else leave)
4. NOTES TO ACCOUNTS (Detailed with accounting policies)
5. COMPLIANCE CERTIFICATES SECTION
6. ANNEXURES & DISCLOSURES
7. RECOMMENDATIONS (Practical, actionable items)

**Financial Analysis Required:**
- Calculate key ratios (Current Ratio, Program Efficiency, Admin Cost %)
- Compare with previous year (if data available)
- Identify financial health indicators
- Comment on fund utilization efficiency
- Assess going concern status`;

    // ===== ENHANCED USER PROMPT (STRUCTURED FOR PERFECTION) =====
    const userPrompt = `
# NGO COMPREHENSIVE AUDIT REPORT GENERATION
## STRICTLY USE ONLY PROVIDED DATA - NO ASSUMPTIONS

## SECTION A: BASIC IDENTIFICATION
**NGO Registration Details:**
- Legal Name: ${d.ngoName || "Not Provided"}
- Registration No: ${d.registrationNumber || "Not Provided"}
- PAN: ${d.panNumber || "Not Provided"}
- Financial Year: ${d.financialYear || "Not Provided"}
- Period: ${d.financialYearStart || "Not Provided"} to ${d.financialYearEnd || "Not Provided"}
- Date of Report: ${d.dateOfReport || "Not Provided"}

**Contact Information:**
- Address: ${d.address || "Not Provided"}
- Contact Person: ${d.contactPerson || "Not Provided"}
- Email: ${d.contactEmail || "Not Provided"}
- Phone: ${d.contactPhone || "Not Provided"}

## SECTION B: AUDITOR CREDENTIALS
**Audit Firm Details:**
- Auditor Name: ${d.auditorName || "Not Provided"}
- Firm Name: ${d.firmName || "Not Provided"}
- Firm Address: ${d.firmAddress || "Not Provided"}
- ICAI Membership No: ${d.membershipNumber || "Not Provided"}
- UDIN: ${d.udin || "Will be generated upon signing"}

## SECTION C: OPERATIONAL CONTEXT
**NGO Activities & Impact Summary:**
${d.projectHighlights || "No operational highlights provided"}

**Scale of Operations:**
- Total Beneficiaries: ${d.numberOfBeneficiaries || "Not Specified"}

## SECTION D: FINANCIAL DATA (USE VERBATIM)
**INCOME ANALYSIS:**
${d.totalIncome || "Total Income: Not Provided"}

**EXPENDITURE ANALYSIS:**
${d.totalExpenditure || "Total Expenditure: Not Provided"}

**FINANCIAL POSITION:**
- Surplus/Deficit: ${d.surplusDeficit || "Not Calculated"}
- Bank Balance: ${d.bankBalance || "Not Provided"}
- Foreign Contributions: ${d.foreigncontribution || "No foreign contributions reported"}

**FUND FLOW DETAILS:**
Sources of Funds:
${d.sourcesOfFunds || "Sources not detailed"}

Areas of Expenditure:
${d.areasOfExpenditure || "Expenditure break-up not provided"}

## SECTION E: COMPLIANCE STATUS
**Statutory Compliance Checklist:**
- Books of Accounts Maintained: ${d.booksMaintained || "Not Confirmed"}
- Statutory Returns Filed: ${d.returnsFiled || "Not Confirmed"}
- No Violations Found: ${d.noViolation || "Not Confirmed"}
- FCRA Compliance Status: ${d.fcraCompliance || "Not Confirmed"}

## SECTION F: AUDIT SCOPE & METHODOLOGY
**Audit Procedures Performed:**
1. Verification of books of accounts and vouchers
2. Bank reconciliation statement verification
3. Compliance with Income Tax Act provisions
4. FCRA fund utilization review (if applicable)
5. Internal controls assessment
6. Asset verification (if data available)

## SECTION G: ADDITIONAL CONTEXT FOR ANALYSIS
**Key Areas for Auditor's Focus:**
1. Whether funds utilized for stated objectives
2. Administrative vs program expenditure ratio
3. Related party transactions (if any)
4. Going concern assessment
5. Compliance with donor restrictions

## INSTRUCTIONS FOR REPORT GENERATION:
1. Generate COMPLETE audit report with ALL standard sections
2. Present financial data in PROFESSIONAL TABLES with proper headings
3. Add NOTES TO ACCOUNTS with accounting policy disclosures
4. Include DISCLAIMERS where information is incomplete
5. Provide BALANCE SHEET even with limited data (structure it properly)
6. Add COMPLIANCE OBSERVATIONS section based on checklist
7. End with SPECIFIC, ACTIONABLE RECOMMENDATIONS
8. Use formal audit language throughout
9. Add section headers with numbering
10. Ensure mathematical accuracy of all calculations

**CRITICAL: If any data is missing, state "Information Not Provided for Audit Verification" in relevant section.**

---
BEGIN REPORT GENERATION NOW:
`;
    // ===== OPTIMIZED AI CALL =====
    const completion = await openai.chat.completions.create({
      model: "google/gemma-3-27b-it:free", // Better for structured reporting
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1, // Lower for more consistency
      max_tokens: 3500,
      top_p: 0.95,
      // frequency_penalty: 0.3,
      // presence_penalty: 0.2,
      // response_format: { type: "text" },
      // timeout: 120000
    });

    const reportText = completion.choices[0]?.message?.content || "";
    
    // ===== QUALITY CHECK ENHANCEMENT =====
    if (reportText.length < 500) {
      console.warn("⚠️ Report may be too brief");
    }

    console.log(`✅ Professional Audit Report Generated (${reportText.length} characters)`);
    
    // Send response with additional metadata
    res.json({
      success: true,
      reportText: reportText,
      metadata: {
        generatedAt: new Date().toISOString(),
        modelUsed: "gemini-2.0-flash-exp",
        length: reportText.length,
        sections: reportText.split('\n').filter(line => line.includes('SECTION') || line.includes('**')).length
      }
    });

  } catch (error) {
    console.error("❌ Audit Generation Failed:", {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: "Professional audit report generation failed",
      error: process.env.NODE_ENV === 'development' ? error.message : "Contact system administrator",
      recoverySuggestion: "Please verify all input data and try again with complete information"
    });
  }
};
