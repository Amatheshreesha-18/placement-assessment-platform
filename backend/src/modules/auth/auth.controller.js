const { supabaseAdmin, supabaseClient } = require('../../config/supabase');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { HTTP_STATUS, ROLES } = require('../../utils/constants');

/**
 * Register a new Student or TPO user
 */
const register = async (req, res, next) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!supabaseAdmin) {
      return errorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Supabase is not configured on the server.'
      );
    }

    // 1. Create auth user in Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm for college platform setup
      user_metadata: { full_name, role: role || ROLES.STUDENT },
    });

    if (authError) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, authError.message);
    }

    const userId = authData.user.id;

    // 2. Insert into profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name,
        role: role || ROLES.STUDENT,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('Failed to create profile record:', profileError);
      // Even if profile insert encounters an issue, return the user info
    }

    return successResponse(
      res,
      HTTP_STATUS.CREATED,
      'User registered successfully. You may now log in.',
      {
        user: {
          id: userId,
          email,
          full_name,
          role: role || ROLES.STUDENT,
        },
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * User Login via Supabase Auth
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!supabaseClient) {
      return errorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Supabase client is not configured on the server.'
      );
    }

    // Authenticate with Supabase
    const { data: sessionData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
    }

    const user = sessionData.user;
    const session = sessionData.session;

    // Retrieve verified profile role
    let role = ROLES.STUDENT;
    let profile = null;

    if (supabaseAdmin) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        role = profileData.role || ROLES.STUDENT;
        profile = profileData;
      }
    }

    return successResponse(res, HTTP_STATUS.OK, 'Login successful', {
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        role,
        profile,
      },
      token: session.access_token,
      expires_at: session.expires_at,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details and profile
 */
const getMe = async (req, res, next) => {
  try {
    return successResponse(res, HTTP_STATUS.OK, 'Current user profile retrieved', {
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
const logout = async (req, res, next) => {
  try {
    // Supabase tokens are JWTs invalidated on client-side or through revoke
    return successResponse(res, HTTP_STATUS.OK, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
