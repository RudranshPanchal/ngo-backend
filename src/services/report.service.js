export function parseSections(reportText) {
  const sections = {
    executiveSummary: "",
    ngoOverview: "",
    objectivesVision: "",
    auditScope: "",
    financialAnalysis: "",
    financialTables: "",
    projectHighlights: "",
    keyAchievements: "",
    complianceSection: "",
    recommendations: "",
    futureRoadmap: "",
    annexures: ""
  };

  const map = {
    executiveSummary: /1\. Executive Summary([\s\S]*?)(?=2\. NGO Overview)/i,
    ngoOverview: /2\. NGO Overview([\s\S]*?)(?=3\. Objectives & Vision)/i,
    objectivesVision: /3\. Objectives & Vision([\s\S]*?)(?=4\. Audit Scope)/i,
    auditScope: /4\. Audit Scope([\s\S]*?)(?=5\. Financial Analysis)/i,
    financialAnalysis: /5\. Financial Analysis([\s\S]*?)(?=6\. Income & Expenditure Table)/i,
    financialTables: /6\. Income & Expenditure Table([\s\S]*?)(?=7\. Program\/Project Summary)/i,
    projectHighlights: /7\. Program\/Project Summary([\s\S]*?)(?=8\. Key Achievements)/i,
    keyAchievements: /8\. Key Achievements([\s\S]*?)(?=9\. Compliance & Legal Overview)/i,
    complianceSection: /9\. Compliance & Legal Overview([\s\S]*?)(?=10\. Recommendations)/i,
    recommendations: /10\. Recommendations([\s\S]*?)(?=11\. Future Roadmap)/i,
    futureRoadmap: /11\. Future Roadmap([\s\S]*?)(?=12\. Annexures)/i,
    annexures: /12\. Annexures([\s\S]*)/i,
  };

  for (const key in map) {
    const match = reportText.match(map[key]);
    sections[key] = match ? match[1].trim() : "<p>No data available.</p>";
  }

  return sections;
}
