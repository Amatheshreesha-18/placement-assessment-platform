const { supabaseAdmin } = require('../../config/supabase');
const config = require('../../config/env');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { HTTP_STATUS, ROLES } = require('../../utils/constants');

const BUCKET_NAME = config.supabase.resumeBucket || 'resumes';

/**
 * Get all resumes for current student
 */
const getResumes = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const { data: resumes, error } = await supabaseAdmin
      .from('resumes')
      .select('*')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return successResponse(res, HTTP_STATUS.OK, 'Resumes retrieved', resumes || []);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific resume by ID
 */
const getResumeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: resume, error } = await supabaseAdmin
      .from('resumes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !resume) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Resume not found');
    }

    if (resume.student_id !== req.user.id && req.user.role !== ROLES.TPO) {
      return errorResponse(res, HTTP_STATUS.FORBIDDEN, 'Access denied');
    }

    // Generate signed download URL if file_path exists in private storage
    let downloadUrl = null;
    if (resume.file_path && supabaseAdmin) {
      const { data: signedData } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(resume.file_path, 60 * 60); // 1 hour validity

      downloadUrl = signedData?.signedUrl || null;
    }

    return successResponse(res, HTTP_STATUS.OK, 'Resume retrieved', {
      ...resume,
      download_url: downloadUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or save structured resume metadata
 */
const createResumeMetadata = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { title, template_id, resume_data } = req.body;

    const { data, error } = await supabaseAdmin
      .from('resumes')
      .insert({
        student_id: studentId,
        title,
        template_id: template_id || 'template-1',
        resume_data: resume_data || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return errorResponse(res, HTTP_STATUS.BAD_REQUEST, error.message);

    return successResponse(res, HTTP_STATUS.CREATED, 'Resume metadata saved', data);
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing resume metadata
 */
const updateResumeMetadata = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;
    const { title, template_id, resume_data } = req.body;

    const { data, error } = await supabaseAdmin
      .from('resumes')
      .update({
        title,
        template_id,
        resume_data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('student_id', studentId)
      .select()
      .single();

    if (error || !data) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Failed to update resume');
    }

    return successResponse(res, HTTP_STATUS.OK, 'Resume updated', data);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload or replace PDF resume to Supabase Storage
 */
const uploadResumePdf = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const file = req.file;

    if (!file) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Please upload a PDF file');
    }

    if (!supabaseAdmin) {
      return errorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Storage unconfigured');
    }

    const { id } = req.params; // optional resume record id
    const fileName = `${studentId}/${Date.now()}_resume.pdf`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, file.buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return errorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, uploadError.message);
    }

    // Upsert or update resume record in database
    let resumeRecord = null;

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('resumes')
        .update({
          file_path: fileName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('student_id', studentId)
        .select()
        .single();

      if (error) throw error;
      resumeRecord = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('resumes')
        .insert({
          student_id: studentId,
          title: file.originalname.replace('.pdf', '') || 'Uploaded Resume',
          file_path: fileName,
          template_id: 'uploaded-pdf',
          resume_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      resumeRecord = data;
    }

    // Generate signed download URL for preview
    const { data: signedData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 60 * 60);

    return successResponse(res, HTTP_STATUS.OK, 'Resume uploaded successfully', {
      resume: resumeRecord,
      download_url: signedData?.signedUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a resume and its stored file
 */
const deleteResume = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;

    const { data: resume, error: fetchError } = await supabaseAdmin
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('student_id', studentId)
      .single();

    if (fetchError || !resume) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Resume not found');
    }

    // Delete file from storage if present
    if (resume.file_path && supabaseAdmin) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([resume.file_path]);
    }

    // Delete row from database
    const { error: deleteError } = await supabaseAdmin
      .from('resumes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return successResponse(res, HTTP_STATUS.OK, 'Resume deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResumes,
  getResumeById,
  createResumeMetadata,
  updateResumeMetadata,
  uploadResumePdf,
  deleteResume,
};
