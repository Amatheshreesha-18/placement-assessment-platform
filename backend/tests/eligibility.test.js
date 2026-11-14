const { evaluateEligibility } = require('../src/modules/applications/applications.service');

describe('Deterministic Placement Eligibility Service', () => {
  const mockOpportunity = {
    id: 'opp-123',
    status: 'open',
    min_cgpa: 7.5,
    max_backlogs: 0,
    eligible_branches: ['CSE', 'ISE', 'ECE'],
    graduation_year: 2026,
    required_skills: ['JavaScript', 'React', 'SQL'],
    deadline: new Date(Date.now() + 86400000).toISOString(), // tomorrow
  };

  const eligibleStudent = {
    cgpa: 8.2,
    backlogs: 0,
    department: 'CSE',
    graduation_year: 2026,
  };

  const studentSkills = [
    { skill_name: 'JavaScript' },
    { skill_name: 'React' },
    { skill_name: 'SQL' },
    { skill_name: 'Node.js' },
  ];

  it('should qualify student meeting all criteria', () => {
    const result = evaluateEligibility(eligibleStudent, studentSkills, mockOpportunity);
    expect(result.is_eligible).toBe(true);
    expect(result.reasons.length).toBe(0);
    expect(result.missing_skills.length).toBe(0);
  });

  it('should disqualify student with low CGPA and state reason', () => {
    const lowCgpaStudent = { ...eligibleStudent, cgpa: 6.8 };
    const result = evaluateEligibility(lowCgpaStudent, studentSkills, mockOpportunity);
    expect(result.is_eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('Minimum CGPA'))).toBe(true);
  });

  it('should disqualify student with active backlogs', () => {
    const backlogStudent = { ...eligibleStudent, backlogs: 2 };
    const result = evaluateEligibility(backlogStudent, studentSkills, mockOpportunity);
    expect(result.is_eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('backlog'))).toBe(true);
  });

  it('should disqualify student from non-eligible branch', () => {
    const mechStudent = { ...eligibleStudent, department: 'Mechanical' };
    const result = evaluateEligibility(mechStudent, studentSkills, mockOpportunity);
    expect(result.is_eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('department'))).toBe(true);
  });

  it('should disqualify student with mismatched graduation year', () => {
    const batch2025Student = { ...eligibleStudent, graduation_year: 2025 };
    const result = evaluateEligibility(batch2025Student, studentSkills, mockOpportunity);
    expect(result.is_eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('graduation year'))).toBe(true);
  });

  it('should identify missing required skills without failing eligibility if other criteria met', () => {
    const partialSkills = [{ skill_name: 'JavaScript' }];
    const result = evaluateEligibility(eligibleStudent, partialSkills, mockOpportunity);
    expect(result.is_eligible).toBe(true);
    expect(result.missing_skills).toContain('React');
    expect(result.missing_skills).toContain('SQL');
  });

  it('should disqualify when opportunity is closed', () => {
    const closedOpp = { ...mockOpportunity, status: 'closed' };
    const result = evaluateEligibility(eligibleStudent, studentSkills, closedOpp);
    expect(result.is_eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('closed'))).toBe(true);
  });

  it('should disqualify when application deadline has passed', () => {
    const expiredOpp = {
      ...mockOpportunity,
      deadline: new Date(Date.now() - 86400000).toISOString(), // yesterday
    };
    const result = evaluateEligibility(eligibleStudent, studentSkills, expiredOpp);
    expect(result.is_eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('deadline'))).toBe(true);
  });
});
