import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Star, 
  Plus, 
  Edit, 
  Eye, 
  Play,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  User,
  Sparkles,
  BookOpen,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getHostClasses, deleteClass } from '../api/classes';
import NotificationSystem from '../components/NotificationSystem';

interface HostClass {
  id: string;
  title: string;
  date_time: string;
  duration_minutes: number;
  price: number;
  status: 'pending_approval' | 'approved' | 'completed' | 'cancelled';
  current_participants: number;
  max_participants: number;
  categories?: {
    name: string;
  };
  whereby_links?: {
    whereby_url: string;
    status: string;
  };
}

const HostDashboardPage = () => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<HostClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleDeleteClass = async (classId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(classId);
    try {
      const result = await deleteClass(classId, user.id);
      
      if (result.success) {
        setClasses(prev => prev.filter(cls => cls.id !== classId));
        setError(null); // Clear any previous errors
        // Force refresh the classes list to ensure consistency
        setTimeout(async () => {
          if (user) {
            const result = await getHostClasses(user.id);
            if (result.success && result.data) {
              setClasses(result.data);
            }
          }
        }, 500);
      } else {
        setError(result.error || 'Failed to delete class');
        console.error('Delete failed:', result.error);
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      setError('An unexpected error occurred while deleting the class');
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    const fetchHostClasses = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const result = await getHostClasses(user.id);
        if (result.success && result.data) {
          setClasses(result.data);
        } else {
          setError(result.error || 'Failed to load classes');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Error fetching host classes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHostClasses();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Calculate stats
  const totalClasses = classes.length;
  const upcomingClasses = classes.filter(cls => 
    new Date(cls.date_time) > new Date() && cls.status === 'approved'
  ).length;
  const totalEarnings = classes
    .filter(cls => cls.status === 'completed')
    .reduce((sum, cls) => sum + (cls.price * (cls.current_participants || 0) * 0.8), 0); // 80% to host (after 20% platform fee)
  const averageRating = 4.8; // TODO: Calculate from reviews

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      pending_approval: 'Pending',
      approved: 'Approved',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const isClassLive = (classData: HostClass) => {
    const classStart = new Date(classData.date_time);
    const classEnd = new Date(classStart.getTime() + classData.duration_minutes * 60000);
    const now = new Date();
    const fifteenMinutesBefore = new Date(classStart.getTime() - 15 * 60000);
    
    return now >= fifteenMinutesBefore && now <= classEnd && classData.status === 'approved' && classData.whereby_links?.whereby_url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-sand via-creamy-white to-golden-yellow/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-creamy-white/90 backdrop-blur-sm border-b border-light-sand shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-deep-orange rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <span className="text-creamy-white font-bold text-lg">K</span>
              </div>
              <span className="text-xl font-bold text-charcoal-black group-hover:text-deep-orange transition-colors">KoboClass</span>
            </Link>

            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/dashboard" className="text-charcoal-black hover:text-deep-orange transition-colors">
                My Classes
              </Link>
              <Link to="/discover" className="text-charcoal-black hover:text-deep-orange transition-colors">
                Discover
              </Link>
              <Link to="/host-dashboard" className="text-deep-orange font-medium">
                Host Dashboard
              </Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <NotificationSystem />
              
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 p-2 text-warm-gray hover:text-deep-orange transition-colors rounded-lg hover:bg-light-sand"
                >
                  <User className="w-6 h-6" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-creamy-white rounded-xl shadow-lg border border-light-sand py-2 z-50">
                    <Link to="/settings" className="block px-4 py-2 text-charcoal-black hover:bg-light-sand transition-colors">
                      Settings
                    </Link>
                    <Link to="/dashboard" className="block px-4 py-2 text-charcoal-black hover:bg-light-sand transition-colors">
                      Learner Dashboard
                    </Link>
                    <hr className="my-2 border-light-sand" />
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-brick-red hover:bg-light-sand transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-deep-orange" />
            <span className="text-sm font-medium text-warm-gray">
              Welcome back{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}!
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-black mb-2">
            Host Dashboard
          </h1>
          <p className="text-lg text-warm-gray">
            Manage your classes, view earnings, and grow your audience
          </p>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Classes */}
          <div className="bg-creamy-white rounded-2xl p-6 shadow-lg border border-light-sand/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warm-gray">Total Classes</p>
                <p className="text-3xl font-bold text-charcoal-black">{totalClasses}</p>
              </div>
              <div className="w-12 h-12 bg-deep-orange/10 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-deep-orange" />
              </div>
            </div>
          </div>

          {/* Upcoming Classes */}
          <div className="bg-creamy-white rounded-2xl p-6 shadow-lg border border-light-sand/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warm-gray">Upcoming Classes</p>
                <p className="text-3xl font-bold text-charcoal-black">{upcomingClasses}</p>
              </div>
              <div className="w-12 h-12 bg-forest-green/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-forest-green" />
              </div>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="bg-creamy-white rounded-2xl p-6 shadow-lg border border-light-sand/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warm-gray">Total Earnings</p>
                <p className="text-3xl font-bold text-charcoal-black">₦{totalEarnings.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-golden-yellow/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-golden-yellow" />
              </div>
            </div>
          </div>

          {/* Average Rating */}
          <div className="bg-creamy-white rounded-2xl p-6 shadow-lg border border-light-sand/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warm-gray">Average Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-charcoal-black">{averageRating}</p>
                  <Star className="w-5 h-5 text-golden-yellow fill-current" />
                </div>
              </div>
              <div className="w-12 h-12 bg-warm-purple/10 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-warm-purple" />
              </div>
            </div>
          </div>
        </div>

        {/* Class Management Table */}
        <div className="bg-creamy-white rounded-2xl shadow-lg border border-light-sand/50 mb-8">
          <div className="p-6 border-b border-light-sand">
            <h2 className="text-2xl font-bold text-charcoal-black">Your Classes</h2>
            <p className="text-warm-gray">Manage your upcoming and past classes</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-deep-orange/30 border-t-deep-orange rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-brick-red">{error}</div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-warm-gray mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-charcoal-black mb-2">No classes yet</h3>
              <p className="text-warm-gray mb-6">Create your first class to start teaching!</p>
              <Link
                to="/host"
                className="inline-flex items-center gap-2 bg-deep-orange text-creamy-white px-6 py-3 rounded-xl font-semibold hover:bg-brick-red transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Class
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-light-sand/30">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-charcoal-black">Class Title</th>
                    <th className="text-left py-4 px-6 font-semibold text-charcoal-black">Date & Time</th>
                    <th className="text-left py-4 px-6 font-semibold text-charcoal-black">Tickets Sold</th>
                    <th className="text-left py-4 px-6 font-semibold text-charcoal-black">Price</th>
                    <th className="text-left py-4 px-6 font-semibold text-charcoal-black">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-charcoal-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((classItem) => (
                    <tr key={classItem.id} className="border-b border-light-sand/30 hover:bg-light-sand/20">
                      <td className="py-4 px-6">
                        <div>
                          <h4 className="font-semibold text-charcoal-black">{classItem.title}</h4>
                          <p className="text-sm text-warm-gray">{classItem.categories?.name || 'General'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-warm-gray">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDateTime(classItem.date_time)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-warm-gray" />
                          <span className="font-medium text-charcoal-black">
                            {classItem.current_participants || 0}/{classItem.max_participants}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-deep-orange">₦{(classItem.price / 100).toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(classItem.status)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {isClassLive(classItem) && classItem.whereby_links?.whereby_url && (
                            <a
                              href={classItem.whereby_links.whereby_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-forest-green text-creamy-white rounded-lg hover:bg-forest-green/80 transition-colors"
                              title="Join Live Class"
                            >
                              <Play className="w-4 h-4" />
                            </a>
                          )}
                          <Link
                            to={`/host/edit/${classItem.id}`}
                            className="p-2 bg-deep-orange text-creamy-white rounded-lg hover:bg-brick-red transition-colors"
                            title="Edit Class"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteClass(classItem.id)}
                            disabled={deleteLoading === classItem.id}
                            className="p-2 bg-red-500 text-creamy-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Class"
                          >
                            {deleteLoading === classItem.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            className="p-2 bg-warm-gray text-creamy-white rounded-lg hover:bg-charcoal-black transition-colors"
                            title="View Learners"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Earnings Summary Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            {/* Recent Reviews Section */}
            <div className="bg-creamy-white rounded-2xl shadow-lg border border-light-sand/50 p-6">
              <h3 className="text-xl font-bold text-charcoal-black mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-golden-yellow" />
                Recent Reviews
              </h3>
              <div className="space-y-4">
                {/* Placeholder reviews */}
                <div className="border-b border-light-sand/30 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-golden-yellow">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm text-warm-gray">Samuel A.</span>
                  </div>
                  <p className="text-charcoal-black">"Loved the class on video editing! Very informative."</p>
                </div>
                <div className="text-center text-warm-gray py-4">
                  <p>No reviews yet. Your first reviews will appear here!</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Earnings Panel */}
            <div className="bg-creamy-white rounded-2xl shadow-lg border border-light-sand/50 p-6">
              <h3 className="text-xl font-bold text-charcoal-black mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-forest-green" />
                Earnings Summary
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-warm-gray">Your Net Earnings</p>
                  <p className="text-2xl font-bold text-charcoal-black">₦{totalEarnings.toLocaleString()}</p>
                  <p className="text-xs text-warm-gray mt-1">After 20% platform fee</p>
                </div>
                <div>
                  <p className="text-sm text-warm-gray">Pending Payouts</p>
                  <p className="text-lg font-semibold text-golden-yellow">₦0</p>
                </div>
                <div>
                  <p className="text-sm text-warm-gray">Last Payment</p>
                  <p className="text-sm text-charcoal-black">No payments yet</p>
                </div>
                <div>
                  <p className="text-sm text-warm-gray">Stripe Connect Status</p>
                  <span className="inline-flex items-center gap-1 text-sm">
                    {userProfile?.stripe_account_id ? (
                      <>
                        <div className="w-2 h-2 bg-forest-green rounded-full"></div>
                        <span className="text-forest-green">Connected</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-brick-red rounded-full"></div>
                        <span className="text-brick-red">Not Connected</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Create Class Button */}
      <Link
        to="/host"
        className="fixed bottom-6 right-6 bg-gradient-to-r from-deep-orange to-golden-yellow text-creamy-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-50 group"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        <span className="absolute -top-12 right-0 bg-charcoal-black text-creamy-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          Create New Class
        </span>
      </Link>
    </div>
  );
};

export default HostDashboardPage;