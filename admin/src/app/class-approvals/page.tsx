'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Define the type for a class, including the host's email.
type ClassWithHost = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  host: {
    email: string | null;
  } | null;
};

export default function ClassApprovalsPage() {
  const [classes, setClasses] = useState<ClassWithHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          title,
          description,
          created_at,
          host_id,
          users!inner ( email )
        `)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching classes:', error);
      } else {
        console.log('Raw classes data:', data);
        const formattedData = data.map(cls => ({ 
          ...cls, 
          host: Array.isArray(cls.users) ? cls.users[0] : cls.users,
          createdAt: cls.created_at
        }));
        setClasses(formattedData as any);
      }
      setLoading(false);
    };

    fetchClasses();
  }, []);

  const handleUpdateStatus = async (classId: string, status: 'APPROVED' | 'REJECTED') => {
    setMessage('');
    const { data, error } = await supabase.functions.invoke('update-class-status', {
      body: { classId, status },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage(`Class ${status.toLowerCase()} successfully.`);
      // Refresh the list by removing the processed class
      setClasses(classes.filter(cls => cls.id !== classId));
    }
  };

  if (loading) {
    return <div className="p-8">Loading classes...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Pending Class Approvals</h1>
      {message && <div className="p-4 mb-4 text-white bg-blue-500 rounded-lg">{message}</div>}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">Title</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">Host</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">Submitted At</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr key={cls.id}>
                <td className="px-5 py-5 text-sm bg-white border-b border-gray-200">
                  <p className="text-gray-900 whitespace-no-wrap">{cls.title}</p>
                </td>
                <td className="px-5 py-5 text-sm bg-white border-b border-gray-200">
                  <p className="text-gray-900 whitespace-no-wrap">{cls.host?.email || 'N/A'}</p>
                </td>
                <td className="px-5 py-5 text-sm bg-white border-b border-gray-200">
                  <p className="text-gray-900 whitespace-no-wrap">{new Date(cls.createdAt).toLocaleDateString()}</p>
                </td>
                <td className="px-5 py-5 text-sm text-right bg-white border-b border-gray-200">
                  <button 
                    onClick={() => handleUpdateStatus(cls.id, 'APPROVED')}
                    className="px-4 py-2 mr-2 font-bold text-white bg-green-500 rounded-full hover:bg-green-700">
                    Approve
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(cls.id, 'REJECTED')}
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
