const { supabaseAdmin } = require('../../config/supabase');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { HTTP_STATUS } = require('../../utils/constants');

const getCompanies = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = supabaseAdmin
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: companies, error } = await query;
    if (error) throw error;

    return successResponse(res, HTTP_STATUS.OK, 'Companies retrieved', companies || []);
  } catch (error) {
    next(error);
  }
};

const getCompanyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('*, placement_opportunities(*)')
      .eq('id', id)
      .single();

    if (error || !company) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Company not found');
    }

    return successResponse(res, HTTP_STATUS.OK, 'Company retrieved', company);
  } catch (error) {
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const { name, website, description, industry, location, contact_email } = req.body;

    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        website,
        description,
        industry,
        location,
        contact_email,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);
    return successResponse(res, HTTP_STATUS.CREATED, 'Company created successfully', data);
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Failed to update company');
    }

    return successResponse(res, HTTP_STATUS.OK, 'Company updated successfully', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
};
