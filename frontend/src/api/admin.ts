import { supabase } from './supabaseClient';

// For users applying to be hosts
export const submitHostApplication = async ({ userId }: { userId: string }) => {
  const { data, error } = await supabase
    .from('host_applications')
    .insert([{ user_id: userId, status: 'PENDING' }])
    .select();

  if (error) {
    console.error('Error submitting host application:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const checkHostApplicationStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('host_applications')
    .select('status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // It's okay if no record is found, just means they haven't applied
    if (error.code === 'PGRST116') return null;
    console.error('Error checking application status:', error);
    return null;
  }
  return data?.status;
};

// For approved hosts to create classes
export const createClass = async (classData: any) => {
  const { data, error } = await supabase
    .from('classes')
    .insert([classData])
    .select();

  if (error) {
    console.error('Error creating class:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
};


// Admin functions
export const getPendingHostApplications = async () => {
  const { data, error } = await supabase
    .from('host_applications')
    .select(`
      *,
      user:users(*)
    `)
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending applications:', error);
    return [];
  }
  return data;
};

export const updateHostApplicationStatus = async (applicationId: string, userId: string, status: 'approved' | 'rejected', adminUserId?: string) => {
  if (status === 'approved') {
    // Get current user ID for admin_user_id parameter
    const { data: { user } } = await supabase.auth.getUser();
    const currentAdminId = adminUserId || user?.id;
    
    if (!currentAdminId) {
      return { success: false, error: 'Admin user ID is required for approval' };
    }

    // Use the proper database function that handles all the required updates
    const { data, error } = await supabase.rpc('approve_host_application', {
      application_id: applicationId,
      admin_user_id: currentAdminId
    });

    if (error) {
      console.error('Error approving host application:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } else {
    // For rejection, just update the application status
    const { data: appData, error: appError } = await supabase
      .from('host_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .select();

    if (appError) {
      console.error('Error updating application status:', appError);
      return { success: false, error: appError.message };
    }

    return { success: true, data: appData };
  }
};

export const getPendingClasses = async () => {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      host:users(*),
      category:categories(*)
    `)
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending classes:', error);
    return [];
  }
  return data;
};

export const updateClassStatus = async (classId: string, status: 'approved' | 'rejected') => {
  const { data, error } = await supabase
    .from('classes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', classId)
    .select();

  if (error) {
    console.error('Error updating class status:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
};
