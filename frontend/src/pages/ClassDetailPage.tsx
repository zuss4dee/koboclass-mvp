import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  ArrowLeft,
  User,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getClassById } from '../api/classes';

interface ClassDetail {
  id: string;
  title: string;
  description: string;
  date_time: string;
  duration_minutes: number;
  price: number;
  status: 'pending_approval' | 'approved' | 'completed' | 'cancelled';
  current_participants: number;
  max_participants: number;
  host_id: string;
  categories?: {
    name: string;
  };
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

const ClassDetailPage = () => {
  const { classId } = useParams<{ classId: string }>();
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClassDetail = async () => {
      if (!classId) {
        setError('Class ID not found');
        setLoading(false);
        return;
      }

      try {
        const result = await getClassById(classId);
        if (result.success && result.data) {
          setClassDetail(result.data);
        } else {
          setError(result.error || 'Failed to load class details');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Error fetching class details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetail();
  }, [classId]);

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const handleBookClass = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/class/${classId}/checkout`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-sand via-creamy-white to-golden-yellow/10 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-deep-orange/30 border-t-deep-orange rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !classDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-sand via-creamy-white to-golden-yellow/10 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-charcoal-black mb-4">Class Not Found</h2>
          <p className="text-warm-gray mb-6">{error || 'This class does not exist or has been removed.'}</p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 bg-deep-orange text-creamy-white px-6 py-3 rounded-xl font-semibold hover:bg-brick-red transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  const { date, time } = formatDateTime(classDetail.date_time);
  const isClassFull = classDetail.current_participants >= classDetail.max_participants;
  const isClassPast = new Date(classDetail.date_time) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-sand via-creamy-white to-golden-yellow/10">
      {/* Header */}
      <header className="bg-creamy-white/90 backdrop-blur-sm border-b border-light-sand shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-warm-gray hover:text-deep-orange transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-creamy-white rounded-2xl shadow-lg border border-light-sand/50 overflow-hidden">
          {/* Class Header */}
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-deep-orange/10 text-deep-orange rounded-full text-sm font-medium">
                    {classDetail.categories?.name || 'General'}
                  </span>
                  {classDetail.status === 'approved' && (
                    <span className="px-3 py-1 bg-forest-green/10 text-forest-green rounded-full text-sm font-medium">
                      Approved
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-charcoal-black mb-4">
                  {classDetail.title}
                </h1>
                <p className="text-lg text-warm-gray leading-relaxed">
                  {classDetail.description}
                </p>
              </div>
            </div>

            {/* Host Info */}
            <div className="flex items-center gap-3 mb-8 p-4 bg-light-sand/30 rounded-xl">
              <div className="w-12 h-12 bg-deep-orange/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-deep-orange" />
              </div>
              <div>
                <p className="text-sm text-warm-gray">Hosted by</p>
                <p className="font-semibold text-charcoal-black">
                  {classDetail.profiles?.full_name || 'Anonymous Host'}
                </p>
              </div>
            </div>

            {/* Class Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-deep-orange/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-deep-orange" />
                </div>
                <div>
                  <p className="text-sm text-warm-gray">Date</p>
                  <p className="font-semibold text-charcoal-black">{date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-forest-green/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-forest-green" />
                </div>
                <div>
                  <p className="text-sm text-warm-gray">Time</p>
                  <p className="font-semibold text-charcoal-black">{time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warm-purple/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-warm-purple" />
                </div>
                <div>
                  <p className="text-sm text-warm-gray">Participants</p>
                  <p className="font-semibold text-charcoal-black">
                    {classDetail.current_participants}/{classDetail.max_participants}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-golden-yellow/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-golden-yellow" />
                </div>
                <div>
                  <p className="text-sm text-warm-gray">Price</p>
                  <p className="font-semibold text-charcoal-black">₦{(classDetail.price / 100).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {classDetail.status === 'approved' && !isClassPast && (
                <button
                  onClick={handleBookClass}
                  disabled={isClassFull}
                  className={`flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-colors ${
                    isClassFull
                      ? 'bg-warm-gray text-creamy-white cursor-not-allowed'
                      : 'bg-deep-orange text-creamy-white hover:bg-brick-red'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  {isClassFull ? 'Class Full' : 'Book This Class'}
                </button>
              )}

              {classDetail.status === 'pending_approval' && (
                <div className="flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold bg-golden-yellow/10 text-golden-yellow border border-golden-yellow/20">
                  <Clock className="w-5 h-5" />
                  Pending Approval
                </div>
              )}

              {isClassPast && (
                <div className="flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold bg-warm-gray/10 text-warm-gray border border-warm-gray/20">
                  <Clock className="w-5 h-5" />
                  Class Completed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassDetailPage;
