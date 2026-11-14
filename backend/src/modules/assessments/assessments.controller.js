const { supabaseAdmin } = require('../../config/supabase');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { HTTP_STATUS, ATTEMPT_STATUS, ROLES } = require('../../utils/constants');

/**
 * List all active assessments
 */
const getAssessments = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!supabaseAdmin) {
      return errorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Database client unconfigured');
    }

    let query = supabaseAdmin
      .from('assessments')
      .select('*', { count: 'exact' });

    // Students only see active assessments; TPO can see all
    if (req.user?.role !== ROLES.TPO) {
      query = query.eq('is_active', true);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: assessments, count, error } = await query
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return successResponse(res, HTTP_STATUS.OK, 'Assessments retrieved', {
      assessments: assessments || [],
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get assessment details
 */
const getAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: assessment, error } = await supabaseAdmin
      .from('assessments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !assessment) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Assessment not found');
    }

    // Count number of questions without returning correct answers
    const { count: questionsCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', id);

    return successResponse(res, HTTP_STATUS.OK, 'Assessment details retrieved', {
      ...assessment,
      questions_count: questionsCount || 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start an assessment attempt
 */
const startAttempt = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { id: assessmentId } = req.params;

    // Check if assessment exists and is active
    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !assessment) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Assessment not found');
    }

    if (!assessment.is_active && req.user.role !== ROLES.TPO) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Assessment is currently inactive');
    }

    // Check for an active unfinished attempt
    const { data: existingAttempt } = await supabaseAdmin
      .from('attempts')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('student_id', studentId)
      .eq('status', ATTEMPT_STATUS.IN_PROGRESS)
      .maybeSingle();

    if (existingAttempt) {
      // Calculate remaining time
      const startTime = new Date(existingAttempt.started_at).getTime();
      const maxDurationMs = assessment.duration_minutes * 60 * 1000;
      const elapsedMs = Date.now() - startTime;

      if (elapsedMs < maxDurationMs) {
        return successResponse(
          res,
          HTTP_STATUS.OK,
          'Active attempt in progress resumed',
          {
            attempt: existingAttempt,
            remaining_seconds: Math.round((maxDurationMs - elapsedMs) / 1000),
          }
        );
      } else {
        // Timed out attempt, mark it
        await supabaseAdmin
          .from('attempts')
          .update({ status: ATTEMPT_STATUS.TIMED_OUT })
          .eq('id', existingAttempt.id);
      }
    }

    // Create a new attempt record
    const { data: newAttempt, error: attemptError } = await supabaseAdmin
      .from('attempts')
      .insert({
        assessment_id: assessmentId,
        student_id: studentId,
        started_at: new Date().toISOString(),
        status: ATTEMPT_STATUS.IN_PROGRESS,
        total_marks: assessment.total_marks,
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    return successResponse(
      res,
      HTTP_STATUS.CREATED,
      'Assessment attempt started',
      {
        attempt: newAttempt,
        duration_minutes: assessment.duration_minutes,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve questions for an ongoing active attempt (EXCLUDES correct answers)
 */
const getAttemptQuestions = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user.id;

    // Verify attempt ownership & status
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('attempts')
      .select('*, assessments(*)')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Attempt not found');
    }

    if (attempt.student_id !== studentId && req.user.role !== ROLES.TPO) {
      return errorResponse(res, HTTP_STATUS.FORBIDDEN, 'Unauthorized access to this attempt');
    }

    // Check if time limit exceeded
    const startTime = new Date(attempt.started_at).getTime();
    const durationMs = attempt.assessments.duration_minutes * 60 * 1000;
    const elapsedMs = Date.now() - startTime;

    if (elapsedMs > durationMs && attempt.status === ATTEMPT_STATUS.IN_PROGRESS) {
      // Mark timed out
      await supabaseAdmin
        .from('attempts')
        .update({ status: ATTEMPT_STATUS.TIMED_OUT })
        .eq('id', attemptId);

      return errorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Assessment time limit has expired. Please submit answers.'
      );
    }

    // Fetch questions without correct_option or explanation
    const { data: questions, error: qError } = await supabaseAdmin
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, marks')
      .eq('assessment_id', attempt.assessment_id)
      .order('id', { ascending: true });

    if (qError) throw qError;

    const remainingSeconds = Math.max(0, Math.round((durationMs - elapsedMs) / 1000));

    return successResponse(res, HTTP_STATUS.OK, 'Questions retrieved', {
      attempt_id: attempt.id,
      remaining_seconds: remainingSeconds,
      questions: questions || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit assessment attempt and calculate score server-side
 */
const submitAttempt = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { attempt_id, answers } = req.body;

    // 1. Verify attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('attempts')
      .select('*, assessments(*)')
      .eq('id', attempt_id)
      .single();

    if (attemptError || !attempt) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Attempt not found');
    }

    if (attempt.student_id !== studentId) {
      return errorResponse(res, HTTP_STATUS.FORBIDDEN, 'Unauthorized submission');
    }

    if (attempt.status === ATTEMPT_STATUS.COMPLETED) {
      return errorResponse(
        res,
        HTTP_STATUS.CONFLICT,
        'Assessment has already been submitted'
      );
    }

    // 2. Fetch all questions with correct answers for this assessment
    const { data: questions, error: qError } = await supabaseAdmin
      .from('questions')
      .select('id, correct_option, marks')
      .eq('assessment_id', attempt.assessment_id);

    if (qError) throw qError;

    const questionMap = new Map();
    let totalMarks = 0;
    (questions || []).forEach((q) => {
      questionMap.set(q.id, q);
      totalMarks += q.marks;
    });

    // 3. Evaluate answers
    let score = 0;
    const submissionRecords = [];

    const answerMap = new Map();
    (answers || []).forEach((a) => {
      answerMap.set(a.question_id, a.selected_option);
    });

    for (const [qId, q] of questionMap.entries()) {
      const selected = answerMap.get(qId) || null;
      const isCorrect = selected && selected.toUpperCase() === q.correct_option.toUpperCase();
      const marksAwarded = isCorrect ? q.marks : 0;

      score += marksAwarded;
      submissionRecords.push({
        attempt_id,
        question_id: qId,
        selected_option: selected,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
      });
    }

    const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;
    const submittedAt = new Date().toISOString();
    const startTime = new Date(attempt.started_at).getTime();
    const timeSpentSeconds = Math.round((new Date(submittedAt).getTime() - startTime) / 1000);

    // 4. Record submissions in database
    if (submissionRecords.length > 0) {
      await supabaseAdmin.from('submissions').insert(submissionRecords);
    }

    // 5. Update attempt status and score
    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from('attempts')
      .update({
        status: ATTEMPT_STATUS.COMPLETED,
        submitted_at: submittedAt,
        time_spent_seconds: timeSpentSeconds,
        score,
        total_marks: totalMarks,
        percentage,
      })
      .eq('id', attempt_id)
      .select()
      .single();

    if (updateError) throw updateError;

    const isPassed = score >= (attempt.assessments?.pass_marks || 0);

    return successResponse(res, HTTP_STATUS.OK, 'Assessment submitted successfully', {
      result: {
        attempt_id,
        score,
        total_marks: totalMarks,
        percentage,
        is_passed: isPassed,
        time_spent_seconds: timeSpentSeconds,
        pass_marks: attempt.assessments?.pass_marks || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve detailed results for a completed attempt
 */
const getAttemptResult = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user.id;

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('attempts')
      .select('*, assessments(*)')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Attempt not found');
    }

    if (attempt.student_id !== studentId && req.user.role !== ROLES.TPO) {
      return errorResponse(res, HTTP_STATUS.FORBIDDEN, 'Unauthorized access to this result');
    }

    if (attempt.status !== ATTEMPT_STATUS.COMPLETED) {
      return errorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Attempt is not completed yet'
      );
    }

    // Fetch questions and student submissions
    const { data: submissions } = await supabaseAdmin
      .from('submissions')
      .select('*, questions(*)')
      .eq('attempt_id', attemptId);

    return successResponse(res, HTTP_STATUS.OK, 'Attempt result retrieved', {
      attempt,
      submissions: submissions || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve assessment history for the student
 */
const getAssessmentHistory = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.user.id;

    if (studentId !== req.user.id && req.user.role !== ROLES.TPO) {
      return errorResponse(res, HTTP_STATUS.FORBIDDEN, 'Access denied');
    }

    const { data: history, error } = await supabaseAdmin
      .from('attempts')
      .select('*, assessments(title, category, pass_marks)')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    return successResponse(res, HTTP_STATUS.OK, 'Assessment history retrieved', {
      history: history || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: Create a new assessment
 */
const createAssessment = async (req, res, next) => {
  try {
    const { title, description, category, duration_minutes, total_marks, pass_marks, is_active } =
      req.body;

    const { data, error } = await supabaseAdmin
      .from('assessments')
      .insert({
        title,
        description,
        category,
        duration_minutes,
        total_marks,
        pass_marks,
        is_active,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.CREATED, 'Assessment created successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: Add question to an assessment
 */
const addQuestion = async (req, res, next) => {
  try {
    const {
      assessment_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      marks,
      explanation,
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert({
        assessment_id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        marks,
        explanation,
      })
      .select()
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.CREATED, 'Question added successfully', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssessments,
  getAssessmentById,
  startAttempt,
  getAttemptQuestions,
  submitAttempt,
  getAttemptResult,
  getAssessmentHistory,
  createAssessment,
  addQuestion,
};
