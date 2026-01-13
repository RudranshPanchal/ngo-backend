export const generateTempPassword = (fullName = "", dob) => {
  const cleanName = fullName.replace(/\s+/g, "").toLowerCase();
  let year;
  if (dob) {
    const date = new Date(dob);
    year = !isNaN(date.getTime())
      ? date.getFullYear()
      : null;
  }
  if (!year) {
    year = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  }
  const namePart = cleanName.slice(0, 3) || "usr"; // first 3 chars
  const specialChars = ["@", "#", "$", "!"];
  // const special = specialChars[Math.floor(Math.random() * specialChars.length)];
  const special = specialChars[0];

  return `${namePart}${special}${year}`;
};
