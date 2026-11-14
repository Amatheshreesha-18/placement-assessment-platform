const { supabaseAdmin } = require('../../config/supabase');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { HTTP_STATUS, ROLES } = require('../../utils/constants');

/**
 * Calculate profile completion percentage based on student profile fields
 */
const calculateCompletion = (profile, skillsCount = 0, projectsCount = 0) => {
  const fields = [
    { name: 'full_name', value: profile?.full_name, weight: 10 },
    { name: 'phone', value: profile?.phone, weight: 5 },
    { name: 'usn', value: profile?.usn, weight: 15 },
    { name: 'college', value: profile?.college, weight: 10 },
    { name: 'department', value: profile?.department, weight: 10 },
    { name: 'semester', value: profile?.semester, weight: 10 },
    { name: 'cgpa', value: profile?.cgpa, weight: 15 },
    { name: 'graduation_year', value: profile?.graduation_year, weight: 10 },
    { name: 'skills', value: skillsCount > 0, weight: 15 },
    { name: 'projects', value: projectsCount > 0, weight: 10 },
  ];

  let completedWeight = 0;
  const missingFields = [];

  for (const field of fields) {
    if (field.value !== null && field.value !== undefined && field.value !== '') {
      completedWeight += field.weight;
    } else {
      missingFields.push(field.name);
    }
  }

  return {
    percentage: Math.min(100, completedWeight),
    missingFields,
  };
};

/**
 * Get student profile
 */
const getProfile = async (req, res, next) => {
  try {
    const studentId = req.params.id || req.user.id;

    // Non-TPO users can only access their own profile
    if (req.user.role !== ROLES.TPO && studentId !== req.user.id) {
      return errorResponse(res, HTTP_STATUS.FORBIDDEN, 'Access denied');
    }

    if (!supabaseAdmin) {
      return errorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Database client unconfigured');
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error || !profile) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Student profile not found');
    }

    // Fetch related skills, projects, and certifications
    const [skillsRes, projectsRes, certsRes] = await Promise.all([
      supabaseAdmin.from('student_skills').select('*').eq('student_id', studentId),
      supabaseAdmin.from('student_projects').select('*').eq('student_id', studentId),
      supabaseAdmin.from('student_certifications').select('*').eq('student_id', studentId),
    ]);

    const skills = skillsRes.data || [];
    const projects = projectsRes.data || [];
    const certifications = certsRes.data || [];

    const completion = calculateCompletion(profile, skills.length, projects.length);

    return successResponse(res, HTTP_STATUS.OK, 'Profile retrieved', {
      profile,
      skills,
      projects,
      certifications,
      completion,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    if (!supabaseAdmin) {
      return errorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Database client unconfigured');
    }

    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Failed to update profile', error.message);
    }

    return successResponse(res, HTTP_STATUS.OK, 'Profile updated successfully', {
      profile: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile completion breakdown
 */
const getCompletion = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    if (!supabaseAdmin) {
      return errorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Database client unconfigured');
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    const [skillsRes, projectsRes] = await Promise.all([
      supabaseAdmin.from('student_skills').select('id').eq('student_id', studentId),
      supabaseAdmin.from('student_projects').select('id').eq('student_id', studentId),
    ]);

    const completion = calculateCompletion(
      profile,
      skillsRes.data?.length || 0,
      projectsRes.data?.length || 0
    );

    return successResponse(res, HTTP_STATUS.OK, 'Completion status retrieved', completion);
  } catch (error) {
    next(error);
  }
};

/**
 * Manage Skills
 */
const getSkills = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('student_skills')
      .select('*')
      .eq('student_id', studentId);

    if (error) throw error;
    return successResponse(res, HTTP_STATUS.OK, 'Skills retrieved', data || []);
  } catch (error) {
    next(error);
  }
};

const addSkill = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { skill_name, proficiency_level } = req.body;

    const { data, error } = await supabaseAdmin
      .from('student_skills')
      .insert({
        student_id: studentId,
        skill_name,
        proficiency_level,
      })
      .select()
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.CREATED, 'Skill added successfully', data);
  } catch (error) {
    next(error);
  }
};

const deleteSkill = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('student_skills')
      .delete()
      .eq('id', id)
      .eq('student_id', studentId);

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.OK, 'Skill removed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Manage Projects
 */
const getProjects = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('student_projects')
      .select('*')
      .eq('student_id', studentId);

    if (error) throw error;
    return successResponse(res, HTTP_STATUS.OK, 'Projects retrieved', data || []);
  } catch (error) {
    next(error);
  }
};

const addProject = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { title, description, tech_stack, github_link, live_link } = req.body;

    const { data, error } = await supabaseAdmin
      .from('student_projects')
      .insert({
        student_id: studentId,
        title,
        description,
        tech_stack,
        github_link,
        live_link,
      })
      .select()
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.CREATED, 'Project added successfully', data);
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('student_projects')
      .delete()
      .eq('id', id)
      .eq('student_id', studentId);

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.OK, 'Project removed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Manage Certifications
 */
const getCertifications = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('student_certifications')
      .select('*')
      .eq('student_id', studentId);

    if (error) throw error;
    return successResponse(res, HTTP_STATUS.OK, 'Certifications retrieved', data || []);
  } catch (error) {
    next(error);
  }
};

const addCertification = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { title, issuer, issue_date, credential_url } = req.body;

    const { data, error } = await supabaseAdmin
      .from('student_certifications')
      .insert({
        student_id: studentId,
        title,
        issuer,
        issue_date,
        credential_url,
      })
      .select()
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.CREATED, 'Certification added successfully', data);
  } catch (error) {
    next(error);
  }
};

const deleteCertification = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('student_certifications')
      .delete()
      .eq('id', id)
      .eq('student_id', studentId);

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.OK, 'Certification removed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: List all students with search & filter
 */
const listStudents = async (req, res, next) => {
  try {
    const { department, min_cgpa, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', ROLES.STUDENT);

    if (department) {
      query = query.eq('department', department);
    }
    if (min_cgpa) {
      query = query.gte('cgpa', Number(min_cgpa));
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,usn.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .range(offset, offset + Number(limit) - 1)
      .order('full_name', { ascending: true });

    if (error) throw error;

    return successResponse(res, HTTP_STATUS.OK, 'Students list retrieved', {
      students: data || [],
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

module.exports = {
  getProfile,
  updateProfile,
  getCompletion,
  getSkills,
  addSkill,
  deleteSkill,
  getProjects,
  addProject,
  deleteProject,
  getCertifications,
  addCertification,
  deleteCertification,
  listStudents,
};
