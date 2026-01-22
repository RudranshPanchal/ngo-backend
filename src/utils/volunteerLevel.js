// 👇 helper function (same file)
const LEVELS = [
  { level: 1, name: "Beginner", minScore: 0 },
  { level: 2, name: "Helper", minScore: 200 },
  { level: 3, name: "Supporter", minScore: 500 },
  { level: 4, name: "Champion", minScore: 1000 },
  { level: 5, name: "Hero", minScore: 2000 }
];

// const LEVELS = [
//   { level: 1, name: "New Volunteer", minScore: 0 },
//   { level: 2, name: "Active Volunteer", minScore: 200 },
//   { level: 3, name: "Committed Volunteer", minScore: 500 },
//   { level: 4, name: "Senior Volunteer", minScore: 1000 },
//   { level: 5, name: "Community Leader", minScore: 2000 }
// ];

// const LEVELS = [
//   { level: 1, name: "Starter", minScore: 0 },
//   { level: 2, name: "Contributor", minScore: 200 },
//   { level: 3, name: "Changemaker", minScore: 500 },
//   { level: 4, name: "Impact Champion", minScore: 1000 },
//   { level: 5, name: "Impact Leader", minScore: 2000 }
// ];


const calculateVolunteerLevel = (impactScore) => {
  let currentLevel = LEVELS[0];

  for (const lvl of LEVELS) {
    if (impactScore >= lvl.minScore) {
      currentLevel = lvl;
    }
  }

  return currentLevel;
};

export { calculateVolunteerLevel };