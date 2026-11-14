const ROLES = {
  STUDENT: 'student',
  TPO: 'tpo',
};

const APPLICATION_STATUS = {
  APPLIED: 'applied',
  UNDER_REVIEW: 'under_review',
  SHORTLISTED: 'shortlisted',
  SELECTED: 'selected',
  REJECTED: 'rejected',
};

const OPPORTUNITY_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
};

const RESOURCE_CATEGORY = {
  APTITUDE: 'aptitude',
  TECHNICAL: 'technical',
  CODING: 'coding',
  INTERVIEW: 'interview',
};

const RESOURCE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  TIMED_OUT: 'timed_out',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

module.exports = {
  ROLES,
  APPLICATION_STATUS,
  OPPORTUNITY_STATUS,
  RESOURCE_CATEGORY,
  RESOURCE_DIFFICULTY,
  ATTEMPT_STATUS,
  HTTP_STATUS,
};
