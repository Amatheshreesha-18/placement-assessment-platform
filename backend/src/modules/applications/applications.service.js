/**
 * Deterministic Placement Eligibility Engine
 * Evaluates student academic and skill profile against opportunity criteria without AI/ML.
 */

const evaluateEligibility = (studentProfile, studentSkills = [], opportunity) => {
  const reasons = [];
  const missingSkills = [];

  // 1. Check Opportunity Status
  if (opportunity.status !== 'open') {
    reasons.push('This placement opportunity is currently closed.');
  }

  // 2. Check Application Deadline
  if (opportunity.deadline) {
    const deadlineTime = new Date(opportunity.deadline).getTime();
    if (Date.now() > deadlineTime) {
      reasons.push('The deadline to apply for this opportunity has passed.');
    }
  }

  // 3. Check CGPA
  if (opportunity.min_cgpa && opportunity.min_cgpa > 0) {
    const studentCgpa = studentProfile?.cgpa ?? 0;
    if (studentCgpa < opportunity.min_cgpa) {
      reasons.push(
        `Minimum CGPA requirement is ${opportunity.min_cgpa}. Your CGPA is ${studentCgpa}.`
      );
    }
  }

  // 4. Check Backlogs
  if (opportunity.max_backlogs !== null && opportunity.max_backlogs !== undefined) {
    const studentBacklogs = studentProfile?.backlogs ?? 0;
    if (studentBacklogs > opportunity.max_backlogs) {
      reasons.push(
        `Maximum allowed backlogs is ${opportunity.max_backlogs}. You have ${studentBacklogs} backlog(s).`
      );
    }
  }

  // 5. Check Department / Branch
  if (opportunity.eligible_branches && opportunity.eligible_branches.length > 0) {
    const studentDept = studentProfile?.department;
    if (!studentDept || !opportunity.eligible_branches.includes(studentDept)) {
      reasons.push(
        `Eligible branches: [${opportunity.eligible_branches.join(', ')}]. Your department '${studentDept || 'Not specified'}' is not eligible.`
      );
    }
  }

  // 6. Check Graduation Year
  if (opportunity.graduation_year) {
    const studentGradYear = studentProfile?.graduation_year;
    if (studentGradYear && studentGradYear !== opportunity.graduation_year) {
      reasons.push(
        `Eligible graduation year is ${opportunity.graduation_year}. Your graduation year is ${studentGradYear}.`
      );
    }
  }

  // 7. Check Required Skills
  if (opportunity.required_skills && opportunity.required_skills.length > 0) {
    const studentSkillNames = new Set(
      studentSkills.map((s) => s.skill_name?.toLowerCase().trim())
    );

    for (const reqSkill of opportunity.required_skills) {
      const normalizedReq = reqSkill.toLowerCase().trim();
      if (!studentSkillNames.has(normalizedReq)) {
        missingSkills.push(reqSkill);
      }
    }
  }

  const isEligible = reasons.length === 0;

  return {
    is_eligible: isEligible,
    reasons,
    missing_skills: missingSkills,
  };
};

module.exports = {
  evaluateEligibility,
};
