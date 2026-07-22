const hasText = (value) => typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "default";

module.exports = (user, testType) => {
  const fields = [
    ["first name", hasText(user.firstName)],
    ["last name", hasText(user.lastName)],
    ["date of birth", Boolean(user.dob)],
    ["licence number", hasText(user.licenceNo)],
    ["age", Number(user.age) >= 16],
    ["vehicle make", hasText(user.carDetails?.make)],
    ["vehicle model", hasText(user.carDetails?.model)],
    ["vehicle year", Number(user.carDetails?.year) >= 1900],
    ["plate number", hasText(user.carDetails?.plateNo)],
  ];
  const missing = fields.filter(([, complete]) => !complete).map(([label]) => label);
  const profile = {
    completed: fields.length - missing.length,
    total: fields.length,
    percent: Math.round(((fields.length - missing.length) / fields.length) * 100),
    missing,
    complete: missing.length === 0,
  };

  const currentTest = user.testType === testType;
  const pending = currentTest && user.status === "Pending" && user.appointmentDate;
  const passed = testType === "G2"
    ? ["G2", "G"].includes(user.qualified)
    : user.qualified === "G";
  const prerequisiteMet = testType === "G2" || ["G2", "G"].includes(user.qualified);
  const canBook = profile.complete && prerequisiteMet && !pending && !passed;

  let guidance = `Your profile is complete. You can book a ${testType} test.`;
  let tone = "success";
  if (!profile.complete) {
    guidance = `Complete the missing profile fields before booking: ${missing.join(", ")}.`;
    tone = "warning";
  } else if (!prerequisiteMet) {
    guidance = "Pass the G2 test before booking a G test.";
    tone = "warning";
  } else if (pending) {
    guidance = `Your ${testType} appointment is booked and awaiting completion.`;
    tone = "info";
  } else if (passed) {
    guidance = `You have passed the ${testType} test.`;
  }

  return { profile, canBook, guidance, tone };
};
