const { supabaseAdmin } = require('../../config/supabase');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { HTTP_STATUS, OPPORTUNITY_STATUS, ROLES } = require('../../utils/constants');

/**
 * Get placement opportunities with filters
 */
const getOpportunities = async (req, res, next) => {
  try {
    const { status, branch, search, graduation_year, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('placement_opportunities')
      .select('*, companies(*)', { count: 'exact' });

    // Students by default only see open opportunities unless explicitly filtered
    if (status) {
      query = query.eq('status', status);
    } else if (req.user?.role !== ROLES.TPO) {
      query = query.eq('status', OPPORTUNITY_STATUS.OPEN);
    }

    if (graduation_year) {
      query = query.eq('graduation_year', Number(graduation_year));
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,job_role.ilike.%${search}%`);
    }

    const { data: opportunities, count, error } = await query
      .range(offset, offset + Number(limit) - 1)
      .order('deadline', { ascending: true });

    if (error) throw error;

    // Filter by branch in application code if array format
    let filtered = opportunities || [];
    if (branch) {
      filtered = filtered.filter(
        (opp) => !opp.eligible_branches || opp.eligible_branches.includes(branch)
      );
    }

    return successResponse(res, HTTP_STATUS.OK, 'Placement opportunities retrieved', {
      opportunities: filtered,
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
 * Get opportunity details by ID
 */
const getOpportunityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: opportunity, error } = await supabaseAdmin
      .from('placement_opportunities')
      .select('*, companies(*)')
      .eq('id', id)
      .single();

    if (error || !opportunity) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Opportunity not found');
    }

    return successResponse(res, HTTP_STATUS.OK, 'Opportunity retrieved', opportunity);
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: Create placement opportunity
 */
const createOpportunity = async (req, res, next) => {
  try {
    const opportunityData = {
      ...req.body,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('placement_opportunities')
      .insert(opportunityData)
      .select('*, companies(*)')
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);

    return successResponse(
      res,
      HTTP_STATUS.CREATED,
      'Placement opportunity published successfully',
      data
    );
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: Update placement opportunity
 */
const updateOpportunity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('placement_opportunities')
      .update(req.body)
      .eq('id', id)
      .select('*, companies(*)')
      .single();

    if (error || !data) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Failed to update opportunity');
    }

    return successResponse(res, HTTP_STATUS.OK, 'Opportunity updated successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * TPO: Close placement opportunity
 */
const closeOpportunity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('placement_opportunities')
      .update({ status: OPPORTUNITY_STATUS.CLOSED })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Failed to close opportunity');
    }

    return successResponse(res, HTTP_STATUS.OK, 'Placement opportunity closed', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  closeOpportunity,
};
