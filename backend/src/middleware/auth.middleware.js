const { supabaseAdmin, supabaseClient } = require('../config/supabase');
const { errorResponse } = require('../utils/apiResponse');
const { HTTP_STATUS, ROLES } = require('../utils/constants');

/**
 * Authentication Middleware:
 * Extracts Bearer token, verifies via Supabase Auth,
 * and fetches the verified role from the 'profiles' database table.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'Authorization header missing or invalid format. Expected Bearer token.'
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'Token missing');
    }

    // Verify token using Supabase Auth
    if (!supabaseAdmin && !supabaseClient) {
      // In development/testing when Supabase is not yet connected
      if (process.env.NODE_ENV === 'test' && req.headers['x-mock-user-id']) {
        req.user = {
          id: req.headers['x-mock-user-id'],
          email: req.headers['x-mock-user-email'] || 'test@example.com',
          role: req.headers['x-mock-user-role'] || ROLES.STUDENT,
        };
        return next();
      }
      return errorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Supabase client is not configured on the server.'
      );
    }

    const client = supabaseAdmin || supabaseClient;
    const { data: authData, error: authError } = await client.auth.getUser(token);

    if (authError || !authData || !authData.user) {
      return errorResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'Invalid or expired token',
        authError ? authError.message : null
      );
    }

    const user = authData.user;

    // Fetch user profile from database to determine verified role
    let role = ROLES.STUDENT; // fallback
    let profile = null;

    if (supabaseAdmin) {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileError && profileData) {
        role = profileData.role || ROLES.STUDENT;
        profile = profileData;
      } else {
        // Check user_metadata as fallback if profiles row is not yet created
        role = user.user_metadata?.role || ROLES.STUDENT;
      }
    } else {
      role = user.user_metadata?.role || ROLES.STUDENT;
    }

    // Attach verified user details to request object
    req.user = {
      id: user.id,
      email: user.email,
      role,
      profile,
      token,
    };

    next();
  } catch (error) {
    console.error('Auth Middleware Exception:', error);
    return errorResponse(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      'Authentication failed due to an unexpected error',
      error.message
    );
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles 
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        `Forbidden: Role '${req.user.role}' does not have permission to access this resource.`
      );
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};
