const { supabaseAdmin } = require('../../config/supabase');
const { evaluateEligibility } = require('./applications.service');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { HTTP_STATUS, APPLICATION_STATUS, ROLES } = require('../../utils/constants');

/**
 * Check deterministic eligibility for a student for a specific opportunity
 */
const checkEligibility = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { opportunityId } = req.params;

    // Fetch opportunity details
    const { data: opportunity, error: oppError } = await supabaseAdmin
      .from('placement_opportunities')
      .select('*, companies(*)')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Opportunity not found');
    }

    // Fetch student profile and skills
    const [profileRes, skillsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', studentId).single(),
      supabaseAdmin.from('student_skills').select('*').eq('student_id', studentId),
    ]);

    const studentProfile = profileRes.data || {};
    const studentSkills = skillsRes.data || [];

    const result = evaluateEligibility(studentProfile, studentSkills, opportunity);

    return successResponse(res, HTTP_STATUS.OK, 'Eligibility evaluated', {
      opportunity,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Student applies for an eligible placement opportunity
 */
const applyForOpportunity = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { opportunity_id, resume_id } = req.body;

    // 1. Fetch opportunity
    const { data: opportunity, error: oppError } = await supabaseAdmin
      .from('placement_opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .single();

    if (oppError || !opportunity) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Opportunity not found');
    }

    // 2. Prevent duplicate application
    const { data: existingApp } = await supabaseAdmin
      .from('placement_applications')
      .select('id, status')
      .eq('opportunity_id', opportunity_id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingApp) {
      return errorResponse(
        res,
        HTTP_STATUS.CONFLICT,
        `You have already applied for this opportunity. Current status: ${existingApp.status}`
      );
    }

    // 3. Evaluate deterministic eligibility
    const [profileRes, skillsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', studentId).single(),
      supabaseAdmin.from('student_skills').select('*').eq('student_id', studentId),
    ]);

    const eligibility = evaluateEligibility(
      profileRes.data || {},
      skillsRes.data || [],
      opportunity
    );

    if (!eligibility.is_eligible) {
      return errorResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'You are not eligible for this opportunity',
        eligibility.reasons
      );
    }

    // 4. Create application
    const { data: application, error: appError } = await supabaseAdmin
      .from('placement_applications')
      .insert({
        opportunity_id,
        student_id: studentId,
        resume_id: resume_id || null,
        status: APPLICATION_STATUS.APPLIED,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*, placement_opportunities(*, companies(*))')
      .single();

    if (appError) throw appError;

    return successResponse(
      res,
      HTTP_STATUS.CREATED,
      'Application submitted successfully',
      application
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get current student's placement applications
 */
const getMyApplications = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const { data: applications, error } = await supabaseAdmin
      .from('placement_applications')
      .select('*, placement_opportunities(*, companies(*)), resumes(title, file_path)')
      .eq('student_id', studentId)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    return successResponse(res, HTTP_STATUS.OK, 'Applications retrieved', applications || []);
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: List all applications or applications for a specific opportunity
 */
const getApplicationsForTpo = async (req, res, next) => {
  try {
    const { opportunityId } = req.params;
    const { status, page = 1, limit = 30 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('placement_applications')
      .select('*, profiles(*), placement_opportunities(*, companies(*)), resumes(*)', {
        count: 'exact',
      });

    if (opportunityId) {
      query = query.eq('opportunity_id', opportunityId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: applications, count, error } = await query
      .range(offset, offset + Number(limit) - 1)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    return successResponse(res, HTTP_STATUS.OK, 'Applications retrieved', {
      applications: applications || [],
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
 * TPO: Update application status (shortlisted, selected, rejected, under_review)
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const updatePayload = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (remarks !== undefined) {
      updatePayload.remarks = remarks;
    }

    const { data, error } = await supabaseAdmin
      .from('placement_applications')
      .update(updatePayload)
      .eq('id', id)
      .select('*, profiles(full_name, email, usn), placement_opportunities(title, job_role)')
      .single();

    if (error || !data) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Failed to update application status');
    }

    return successResponse(
      res,
      HTTP_STATUS.OK,
      `Application status updated to '${status}'`,
      data
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkEligibility,
  applyForOpportunity,
  getMyApplications,
  getApplicationsForTpo,
  updateApplicationStatus,
};
