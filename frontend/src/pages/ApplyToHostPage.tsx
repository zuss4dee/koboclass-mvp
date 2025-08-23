import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, AlertTriangle } from 'lucide-react';
// import { submitHostApplication, checkHostApplicationStatus } from '../api/admin';

const ApplyToHostPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
    // Check application status when component mounts
    // const checkStatus = async () => {
    //   const status = await checkHostApplicationStatus(user.id);
    //   setApplicationStatus(status);
    // };
    // if (user) checkStatus();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // const result = await submitHostApplication({ userId: user.id, bio, reason });
      // if (result.success) {
      //   setSuccess(true);
      //   setApplicationStatus('pending');
      // } else {
      //   setError(result.error || 'Failed to submit application.');
      // }
      console.log('Submitting application:', { bio, reason });
      // Mock success for UI development
      setTimeout(() => {
        setSuccess(true);
        setApplicationStatus('pending');
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  const renderStatusMessage = () => {
    if (applicationStatus === 'pending') {
      return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
              <p className="font-bold">Application Pending</p>
              <p>Your application is currently under review. We will notify you once a decision has been made.</p>
            </div>
          </div>
        </div>
      );
    }
    if (applicationStatus === 'approved') {
      return (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 mr-3" />
            <div>
              <p className="font-bold">Application Approved!</p>
              <p>Congratulations! You can now create and manage your classes from your dashboard.</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Become a Host</h1>
          <p className="text-gray-600 mb-6">Share your skills and start earning. Fill out the application below to get started.</p>

          {applicationStatus ? renderStatusMessage() : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">Your Bio</label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="Tell us about yourself, your experience, and what you're passionate about."
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">Why do you want to teach?</label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="What motivates you to share your knowledge with others on KoboClass?"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              {success && !applicationStatus && <p className="text-green-500 text-sm mb-4">Application submitted successfully!</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-600 text-white font-bold py-3 px-4 rounded-md hover:bg-orange-700 disabled:bg-orange-300 transition-all duration-300 flex items-center justify-center"
              >
                {isLoading ? 'Submitting...' : 'Submit Application'}
                {!isLoading && <Send className="h-5 w-5 ml-2" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyToHostPage;
