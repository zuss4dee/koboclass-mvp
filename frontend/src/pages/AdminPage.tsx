import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getPendingHostApplications, updateHostApplicationStatus, getPendingClasses, updateClassStatus } from '../api/admin';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const AdminPage: React.FC = () => {
  const { user, userDetails } = useAuth();
  const navigate = useNavigate();
  const [hostApplications, setHostApplications] = useState<any[]>([]);
  const [pendingClasses, setPendingClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || userDetails?.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [apps, classes] = await Promise.all([
          getPendingHostApplications(),
          getPendingClasses(),
        ]);
        setHostApplications(apps);
        setPendingClasses(classes);
      } catch (err) {
        setError('Failed to fetch pending data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, userDetails, navigate]);

  const handleHostApplication = async (applicationId: string, userId: string, status: 'approved' | 'rejected') => {
    const result = await updateHostApplicationStatus(applicationId, userId, status);
    if (result.success) {
      setHostApplications(prev => prev.filter(app => app.id !== applicationId));
    } else {
      alert(`Failed to update application: ${result.error}`);
    }
  };

  const handleClassApproval = async (classId: string, status: 'approved' | 'rejected') => {
    const result = await updateClassStatus(classId, status);
    if (result.success) {
      setPendingClasses(prev => prev.filter(c => c.id !== classId));
    } else {
      alert(`Failed to update class status: ${result.error}`);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

        {/* Host Applications Section */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Pending Host Applications</h2>
          {hostApplications.length === 0 ? (
            <p className="text-gray-500">No pending host applications.</p>
          ) : (
            <div className="space-y-4">
              {hostApplications.map(app => (
                <div key={app.id} className="border border-gray-200 rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="flex-grow mb-4 md:mb-0">
                    <p className="font-bold text-lg text-gray-800">{app.user?.full_name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{app.user?.email || 'N/A'}</p>
                    <p className="mt-2 text-gray-600"><strong>Bio:</strong> {app.bio}</p>
                    <p className="mt-1 text-gray-600"><strong>Reason:</strong> {app.reason}</p>
                  </div>
                  <div className="flex space-x-3 flex-shrink-0">
                    <button onClick={() => handleHostApplication(app.id, app.user_id, 'approved')} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center transition">
                      <CheckCircle className="h-5 w-5 mr-2" /> Approve
                    </button>
                    <button onClick={() => handleHostApplication(app.id, app.user_id, 'rejected')} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 flex items-center transition">
                      <XCircle className="h-5 w-5 mr-2" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Class Approvals Section */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Pending Class Approvals</h2>
          {pendingClasses.length === 0 ? (
            <p className="text-gray-500">No pending classes for approval.</p>
          ) : (
            <div className="space-y-4">
              {pendingClasses.map(cls => (
                <div key={cls.id} className="border border-gray-200 rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="flex-grow mb-4 md:mb-0">
                    <p className="font-bold text-lg text-gray-800">{cls.title}</p>
                    <p className="text-sm text-gray-500">by {cls.host?.full_name || 'N/A'}</p>
                    <p className="mt-2 text-gray-600">{cls.description}</p>
                    <p className="mt-1 font-semibold text-gray-700">Price: ${(cls.price / 100).toFixed(2)}</p>
                  </div>
                  <div className="flex space-x-3 flex-shrink-0">
                    <button onClick={() => handleClassApproval(cls.id, 'approved')} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center transition">
                      <CheckCircle className="h-5 w-5 mr-2" /> Approve
                    </button>
                    <button onClick={() => handleClassApproval(cls.id, 'rejected')} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 flex items-center transition">
                      <XCircle className="h-5 w-5 mr-2" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
