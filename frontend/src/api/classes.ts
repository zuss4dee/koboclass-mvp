import { supabase } from '../lib/supabase';

export interface ClassCreationData {
  title: string;
  description: string;
  category: string;
  price: number; // in kobo
  date: string;
  time: string;
  duration: number;
  coverImageUrl?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface ClassCreationResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const createClass = async (
  hostId: string,
  classData: ClassCreationData
): Promise<ClassCreationResponse> => {
  try {
    // Validate required fields
    if (!classData.title.trim()) {
      return { success: false, error: 'Class title is required' };
    }
    
    if (classData.title.length < 5 || classData.title.length > 200) {
      return { success: false, error: 'Title must be between 5 and 200 characters' };
    }
    
    if (!classData.description.trim()) {
      return { success: false, error: 'Class description is required' };
    }
    
    if (classData.description.length < 20 || classData.description.length > 2000) {
      return { success: false, error: 'Description must be between 20 and 2000 characters' };
    }
    
    if (!classData.category) {
      return { success: false, error: 'Category is required' };
    }
    
    if (classData.price < 100000 || classData.price > 500000) {
      return { success: false, error: 'Price must be between ₦1,000 and ₦5,000' };
    }
    
    if (classData.duration < 30 || classData.duration > 240) {
      return { success: false, error: 'Duration must be between 30 and 240 minutes' };
    }

    // Validate date/time is in the future
    const classDateTime = new Date(`${classData.date}T${classData.time}`);
    if (classDateTime <= new Date()) {
      return { success: false, error: 'Class date and time must be in the future' };
    }

    // Get category ID
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', classData.category)
      .single();

    if (categoryError || !categoryData) {
      return { success: false, error: 'Invalid category selected' };
    }

    // Create the class
    const { data, error } = await supabase
      .from('classes')
      .insert([
        {
          title: classData.title.trim(),
          description: classData.description.trim(),
          host_id: hostId,
          category_id: categoryData.id,
          price: classData.price,
          currency: 'NGN',
          date_time: classDateTime.toISOString(),
          duration_minutes: classData.duration,
          status: 'pending_approval',
          cover_image_url: classData.coverImageUrl,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating class:', error);
      return { success: false, error: 'Failed to create class. Please try again.' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error creating class:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
};

export const getHostClasses = async (hostId: string) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        users!classes_host_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        categories (
          id,
          name
        ),
        whereby_links (
          whereby_url,
          status
        )
      `)
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching host classes:', error);
      return { success: false, error: 'Failed to fetch classes' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error fetching host classes:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

export const getAllApprovedClasses = async () => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        users!classes_host_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        categories (
          id,
          name
        ),
        whereby_links (
          whereby_url,
          status
        )
      `)
      .eq('status', 'approved')
      .gte('date_time', new Date().toISOString()) // Only future classes
      .order('date_time', { ascending: true });

    if (error) {
      console.error('Error fetching approved classes:', error);
      return { success: false, error: 'Failed to fetch classes' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error fetching approved classes:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

export const getClassById = async (classId: string) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        categories (
          id,
          name
        ),
        users!classes_host_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('id', classId)
      .eq('status', 'approved')
      .single();

    if (error) {
      console.error('Error fetching class:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching class:', error);
    return { success: false, error: 'Failed to fetch class details' };
  }
};

export const getClassForEdit = async (classId: string, hostId: string) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('id', classId)
      .eq('host_id', hostId)
      .single();

    if (error) {
      console.error('Error fetching class for edit:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching class for edit:', error);
    return { success: false, error: 'Failed to fetch class details' };
  }
};

export const deleteClass = async (classId: string, hostId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Attempting to delete class:', { classId, hostId });
    
    // First verify the class exists and belongs to the host
    const { data: existingClass, error: checkError } = await supabase
      .from('classes')
      .select('id, host_id, status')
      .eq('id', classId)
      .eq('host_id', hostId)
      .single();

    console.log('Class check result:', { existingClass, checkError });

    if (checkError) {
      console.error('Error checking class:', checkError);
      return { success: false, error: `Permission error: ${checkError.message}` };
    }

    if (!existingClass) {
      return { success: false, error: 'Class not found or you do not have permission to delete it' };
    }

    // Delete the class
    const { error, data } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)
      .eq('host_id', hostId)
      .select();

    console.log('Delete result:', { error, data });

    if (error) {
      console.error('Error deleting class:', error);
      return { success: false, error: `Failed to delete class: ${error.message}` };
    }

    // Check if any rows were actually deleted
    if (!data || data.length === 0) {
      return { success: false, error: 'No class was deleted - class may not exist or you lack permission' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting class:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
};

export const updateClass = async (classId: string, classData: ClassCreationData, hostId: string): Promise<ClassCreationResponse> => {
  try {
    // Validate required fields
    if (!classData.title || classData.title.trim().length < 3) {
      return { success: false, error: 'Title must be at least 3 characters long' };
    }
    
    if (classData.description.length < 20 || classData.description.length > 2000) {
      return { success: false, error: 'Description must be between 20 and 2000 characters' };
    }
    
    if (!classData.category) {
      return { success: false, error: 'Category is required' };
    }
    
    if (classData.price < 100000 || classData.price > 500000) {
      return { success: false, error: 'Price must be between ₦1,000 and ₦5,000' };
    }
    
    if (classData.duration < 30 || classData.duration > 240) {
      return { success: false, error: 'Duration must be between 30 and 240 minutes' };
    }

    // Validate date/time is in the future
    const classDateTime = new Date(`${classData.date}T${classData.time}`);
    if (classDateTime <= new Date()) {
      return { success: false, error: 'Class date and time must be in the future' };
    }

    // Get category ID
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', classData.category)
      .single();

    if (categoryError) {
      console.error('Error finding category:', categoryError);
      return { success: false, error: 'Invalid category selected' };
    }

    console.log('Attempting to update class:', { classId, hostId });
    
    // First verify the class exists and belongs to the host
    const { data: existingClass, error: checkError } = await supabase
      .from('classes')
      .select('id, host_id, status')
      .eq('id', classId)
      .eq('host_id', hostId)
      .single();

    console.log('Class check result for update:', { existingClass, checkError });

    if (checkError) {
      console.error('Error checking class for update:', checkError);
      return { success: false, error: `Permission error: ${checkError.message}` };
    }

    if (!existingClass) {
      return { success: false, error: 'Class not found or you do not have permission to edit it' };
    }

    // Update the class and set status to pending for re-approval
    const updateData = {
      title: classData.title.trim(),
      description: classData.description.trim(),
      category_id: categoryData.id,
      price: classData.price,
      date_time: `${classData.date}T${classData.time}`,
      duration_minutes: classData.duration,
      cover_image_url: classData.coverImageUrl,
      status: 'pending_approval',
      approved_by: null,
      approved_at: null,
      updated_at: new Date().toISOString()
    };

    console.log('Update data:', updateData);

    const { data, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', classId)
      .eq('host_id', hostId)
      .select()
      .single();

    console.log('Update result:', { data, error });

    if (error) {
      console.error('Error updating class:', error);
      return { success: false, error: 'Failed to update class. Please try again.' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error updating class:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
};