import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle
} from 'lucide-react';
import { convertToKobo, convertFromKobo } from '../lib/validation';
import { createClass, getClassForEdit, updateClass } from '../api/classes';
import { useAuth } from '../contexts/AuthContext';
import { ClassCreationWizard } from '../components/ui/class-creation-wizard';

interface ClassFormData {
  title: string;
  description: string;
  category: string;
  socialLinks: {
    instagram: string;
    twitter: string;
    linkedin: string;
  };
  date: string;
  time: string;
  duration: number;
  price: number;
  coverImage: File | null;
}

const HostClassPage = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [initialClassData, setInitialClassData] = useState<ClassFormData | null>(null);
  const [loadingClassData, setLoadingClassData] = useState(false);
  const isEditing = !!classId;

  // Load existing class data when editing
  useEffect(() => {
    const loadClassData = async () => {
      if (!isEditing || !classId || !user) return;

      setLoadingClassData(true);
      try {
        const result = await getClassForEdit(classId, user.id);
        
        if (result.success && result.data) {
          const classData = result.data;
          const dateTime = new Date(classData.date_time);
          
          setInitialClassData({
            title: classData.title,
            description: classData.description,
            category: classData.categories?.name || '',
            socialLinks: classData.social_links || {
              instagram: '',
              twitter: '',
              linkedin: ''
            },
            date: dateTime.toISOString().split('T')[0],
            time: dateTime.toTimeString().slice(0, 5),
            duration: classData.duration_minutes,
            price: convertFromKobo(classData.price),
            coverImage: null
          });
        } else {
          setError(result.error || 'Failed to load class data');
        }
      } catch (error) {
        console.error('Error loading class data:', error);
        setError('Failed to load class data');
      } finally {
        setLoadingClassData(false);
      }
    };

    loadClassData();
  }, [isEditing, classId, user]);

  const handleClassSubmission = async (classData: ClassFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!user || !userProfile) {
        setError('You must be logged in to create a class');
        setIsLoading(false);
        return;
      }

      // Prepare class data for submission
      const submissionData = {
        title: classData.title,
        description: classData.description,
        category: classData.category,
        price: convertToKobo(classData.price),
        date: classData.date,
        time: classData.time,
        duration: classData.duration,
        coverImageUrl: classData.coverImage ? 'placeholder-url' : undefined
      };

      let result;
      if (isEditing && classId) {
        result = await updateClass(classId, submissionData, user.id);
      } else {
        result = await createClass(user.id, submissionData);
      }
      
      if (result.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          navigate('/host-dashboard');
        }, 2000);
      } else {
        setError(result.error || `Failed to ${isEditing ? 'update' : 'create'} class. Please try again.`);
      }
    } catch (error) {
      console.error(`Class ${isEditing ? 'update' : 'creation'} error:`, error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/host-dashboard');
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-sand via-light-sand to-creamy-white flex items-center justify-center p-4">
        <div className="bg-creamy-white rounded-2xl shadow-xl border border-light-sand/50 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-forest-green rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-creamy-white" />
          </div>
          <h2 className="text-2xl font-bold text-charcoal-black mb-2">
            Class {isEditing ? 'Updated' : 'Created'} Successfully!
          </h2>
          <p className="text-warm-gray mb-6">
            {isEditing 
              ? 'Your class has been updated and submitted for re-approval. You\'ll be notified once the changes are approved.'
              : 'Your class has been submitted for review. You\'ll be notified once it\'s approved and live on the platform.'
            }
          </p>
          <div className="flex items-center justify-center text-deep-orange">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Redirecting to dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show loading spinner while loading class data for editing
  if (loadingClassData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-sand via-light-sand to-creamy-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-deep-orange mx-auto mb-4"></div>
          <p className="text-warm-gray">Loading class data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-sand via-light-sand to-creamy-white">
      {/* Header */}
      <div className="bg-creamy-white border-b border-light-sand/50 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/host-dashboard"
              className="p-2 hover:bg-light-sand rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-charcoal-black" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-charcoal-black">
                {isEditing ? 'Edit Class' : 'Create New Class'}
              </h1>
              <p className="text-warm-gray">
                {isEditing ? 'Update your class details' : 'Share your knowledge with eager learners'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Class Creation Wizard */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ClassCreationWizard 
          onComplete={handleClassSubmission}
          onCancel={handleCancel}
          isLoading={isLoading}
          error={error || undefined}
          initialData={initialClassData || undefined}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
};

export default HostClassPage;