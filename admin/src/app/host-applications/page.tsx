'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// We define the type for a host application, including the user's email from the related table.
// We define the type for a host application, including the user's email from the related table.
// We define the type for a host application, including the user's email from the related table.
interface ApplicationWithUser {
  id: string;
  created_at: string;
  user_id: string;
  bio: string;
  social_links: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  status: string;
  users: { email: string };
  User?: { email: string }; // For backward compatibility
  createdAt?: string; // For backward compatibility
};

export default function HostApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      // First, let's see all applications to debug
      const { data: allData, error: allError } = await supabase
        .from('host_applications')
        .select(`
          id,
          created_at,
          user_id,
          bio,
          social_links,
          status,
          users!host_applications_user_id_fkey ( email )
        `);

      console.log('All applications in database:', allData);
      console.log('All applications error:', allError);

      // Now get pending ones
      const { data, error } = await supabase
        .from('host_applications')
        .select(`
          id,
          created_at,
          user_id,
          bio,
          social_links,
          status,
          users!host_applications_user_id_fkey ( email )
        `)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching applications:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        const formattedData = data.map(app => ({ 
          ...app, 
          User: Array.isArray(app.users) ? app.users[0] : app.users,
          createdAt: app.created_at
        }));
        console.log('Pending applications:', formattedData);
        setApplications(formattedData as any);
      }
      setLoading(false);
    };

    fetchApplications();
  }, []);

    const handleUpdateStatus = async (applicationId: string, userId: string, status: 'APPROVED' | 'REJECTED') => {
    setMessage('');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-host-application-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        applicationId,
        userId,
        status
      })
    });

    const result = await response.json();
    console.log('Update status response:', result);
    console.log('Response status:', response.status);

    if (response.ok && result.success) {
      setMessage(`Application ${status} successfully.`);
      // Refresh the list by removing the processed application
      setApplications(applications.filter(app => app.id !== applicationId));
    } else {
      setMessage(`Error: ${result.error || 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="p-8">Loading applications...</div>;
  }

  const createTestApplication = async () => {
    // Use the Edge Function to create test data (bypasses RLS)
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-test-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email: `testhost${Date.now()}@koboclass.com`,
        bio: 'I am passionate about teaching web development and sharing my knowledge with aspiring developers. I have 5+ years of experience in React, Node.js, TypeScript, and modern web technologies.'
      })
    });

    const result = await response.json();
    console.log('Edge function response:', result);
    console.log('Response status:', response.status);
    
    if (result.success) {
      setMessage('Test application created successfully!');
      // Refresh the applications list
      setTimeout(async () => {
        // Try querying with service role key via Edge Function
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-all-applications`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          }
        });
        
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          console.log('Refreshed applications via Edge Function:', refreshResult.data);
          if (refreshResult.success && refreshResult.data) {
            setApplications(refreshResult.data);
          }
        } else {
          // Fallback to direct query
          const { data } = await supabase
            .from('host_applications')
            .select(`
              id,
              created_at,
              user_id,
              bio,
              social_links,
              status,
              users!host_applications_user_id_fkey ( email )
            `)
            .eq('status', 'pending');

          console.log('Refreshed applications after creation:', data);
          if (data) {
            const formattedData = data.map(app => ({
              ...app,
              users: app.users[0]
            }));
            setApplications(formattedData);
          }
        }
      }, 1000);
    } else {
      setMessage('Error creating test application: ' + JSON.stringify(result.error));
    }
  };

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Pending Host Applications</h1>
      {message && <div className="p-4 mb-4 text-white bg-blue-500 rounded-lg">{message}</div>}
      
      {applications.length === 0 && (
        <div className="p-4 mb-4 text-center bg-gray-100 rounded-lg">
          <p className="mb-4 text-gray-600">No pending applications found.</p>
          <button 
            onClick={createTestApplication}
            className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700">
            Create Test Application
          </button>
        </div>
      )}
      
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">
                User Email
              </th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">
                Bio
              </th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">
                Applied Date
              </th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td className="px-5 py-5 text-sm bg-white border-b border-gray-200">
                  <p className="text-gray-900 whitespace-no-wrap">{app.User?.email || 'N/A'}</p>
                </td>
                <td className="px-5 py-5 text-sm bg-white border-b border-gray-200">
                  <p className="text-gray-900 whitespace-no-wrap max-w-xs truncate">{app.bio || 'N/A'}</p>
                </td>
                <td className="px-5 py-5 text-sm bg-white border-b border-gray-200">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </td>
                <td className="px-5 py-5 text-sm text-right bg-white border-b border-gray-200">
                  <button 
                    onClick={() => handleUpdateStatus(app.id, app.user_id, 'APPROVED')}
                    className="px-4 py-2 mr-2 font-bold text-white bg-green-500 rounded-full hover:bg-green-700">
                    Approve
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(app.id, app.user_id, 'REJECTED')}
                    className="px-4 py-2 font-bold text-white bg-red-500 rounded-full hover:bg-red-700">
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
