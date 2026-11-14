const { supabaseAdmin } = require('../../config/supabase');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { HTTP_STATUS } = require('../../utils/constants');

/**
 * List preparation resources with search and filter
 */
const getResources = async (req, res, next) => {
  try {
    const { category, difficulty, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!supabaseAdmin) {
      return errorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Database client unconfigured');
    }

    let query = supabaseAdmin
      .from('resources')
      .select('*', { count: 'exact' });

    if (category) {
      query = query.eq('category', category);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: resources, count, error } = await query
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // If user is authenticated, attach their completion status for each resource
    let studentProgressMap = {};
    if (req.user) {
      const resourceIds = (resources || []).map((r) => r.id);
      if (resourceIds.length > 0) {
        const { data: progressList } = await supabaseAdmin
          .from('student_resource_progress')
          .select('resource_id, is_completed, completed_at')
          .eq('student_id', req.user.id)
          .in('resource_id', resourceIds);

        (progressList || []).forEach((p) => {
          studentProgressMap[p.resource_id] = p.is_completed;
        });
      }
    }

    const enrichedResources = (resources || []).map((r) => ({
      ...r,
      is_completed: Boolean(studentProgressMap[r.id]),
    }));

    return successResponse(res, HTTP_STATUS.OK, 'Resources retrieved', {
      resources: enrichedResources,
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
 * Get details for a specific resource
 */
const getResourceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: resource, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !resource) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Resource not found');
    }

    let is_completed = false;
    if (req.user) {
      const { data: progress } = await supabaseAdmin
        .from('student_resource_progress')
        .select('is_completed')
        .eq('student_id', req.user.id)
        .eq('resource_id', id)
        .single();

      is_completed = Boolean(progress?.is_completed);
    }

    return successResponse(res, HTTP_STATUS.OK, 'Resource details retrieved', {
      ...resource,
      is_completed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student's progress for a resource (mark complete / incomplete)
 */
const updateResourceProgress = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { id: resourceId } = req.params;
    const { is_completed } = req.body;

    const progressRecord = {
      student_id: studentId,
      resource_id: resourceId,
      is_completed,
      completed_at: is_completed ? new Date().toISOString() : null,
    };

    const { data, error } = await supabaseAdmin
      .from('student_resource_progress')
      .upsert(progressRecord, { onConflict: 'student_id,resource_id' })
      .select()
      .single();

    if (error) throw error;

    return successResponse(
      res,
      HTTP_STATUS.OK,
      `Resource marked as ${is_completed ? 'completed' : 'incomplete'}`,
      data
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's overall preparation hub progress
 */
const getStudentProgress = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // Get total resources count by category
    const { data: resources } = await supabaseAdmin
      .from('resources')
      .select('id, category');

    // Get completed resources by student
    const { data: completed } = await supabaseAdmin
      .from('student_resource_progress')
      .select('resource_id')
      .eq('student_id', studentId)
      .eq('is_completed', true);

    const completedSet = new Set((completed || []).map((c) => c.resource_id));

    const categoryStats = {};
    (resources || []).forEach((r) => {
      if (!categoryStats[r.category]) {
        categoryStats[r.category] = { total: 0, completed: 0 };
      }
      categoryStats[r.category].total += 1;
      if (completedSet.has(r.id)) {
        categoryStats[r.category].completed += 1;
      }
    });

    const totalResources = (resources || []).length;
    const totalCompleted = completedSet.size;
    const overallPercentage = totalResources > 0 ? Math.round((totalCompleted / totalResources) * 100) : 0;

    return successResponse(res, HTTP_STATUS.OK, 'Preparation progress retrieved', {
      totalResources,
      totalCompleted,
      overallPercentage,
      categoryStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: Create a learning resource
 */
const createResource = async (req, res, next) => {
  try {
    const { title, description, category, difficulty, url, type } = req.body;

    const { data, error } = await supabaseAdmin
      .from('resources')
      .insert({
        title,
        description,
        category,
        difficulty,
        url,
        type,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);

    return successResponse(res, HTTP_STATUS.CREATED, 'Resource created successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: Delete a resource
 */
const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);

    return successResponse(res, HTTP_STATUS.OK, 'Resource deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResources,
  getResourceById,
  updateResourceProgress,
  getStudentProgress,
  createResource,
  deleteResource,
};
