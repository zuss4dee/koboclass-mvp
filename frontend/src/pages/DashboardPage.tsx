import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, Sparkles, Star, Users, MapPin, Play, AlertCircle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import NotificationSystem from '../components/NotificationSystem';
import { useNavigate } from 'react-router-dom';
import { getUserTickets } from '../api/checkout';

interface DashboardPageProps {}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  // Fetch user tickets on component mount
  useEffect(() => {
    const fetchUserTickets = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await getUserTickets(user.id);
        
        if (result.success && result.data) {
          setTickets(result.data);
        } else {
          setError(result.error || 'Failed to load your classes');
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserTickets();
  }, [user]);

  // Check for error messages in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const showHostApplication = urlParams.get('showHostApplication');
    
    if (error === 'host-approval-pending') {
      console.log('Host approval is pending');
    }
    
    if (showHostApplication === 'true') {
      navigate('/settings?tab=host-application');
    }
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Separate upcoming and past classes
  const now = new Date();
  const upcomingClasses = tickets.filter(ticket => 
    ticket.classes && new Date(ticket.classes.date_time) > now
  ).sort((a, b) => new Date(a.classes.date_time).getTime() - new Date(b.classes.date_time).getTime());
  
  const pastClasses = tickets.filter(ticket => 
    ticket.classes && new Date(ticket.classes.date_time) <= now
  ).sort((a, b) => new Date(b.classes.date_time).getTime() - new Date(a.classes.date_time).getTime());

  // Check if a class is currently live (within 15 minutes of start time and during duration)
  const isClassLive = (classData: any) => {
    const classStart = new Date(classData.date_time);
    const classEnd = new Date(classStart.getTime() + classData.duration_minutes * 60000);
    const now = new Date();
    const fifteenMinutesBefore = new Date(classStart.getTime() - 15 * 60000);
    
    return now >= fifteenMinutesBefore && now <= classEnd;
  };

  const formatClassDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeString = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    if (isToday) return `Today at ${timeString}`;
    if (isTomorrow) return `Tomorrow at ${timeString}`;
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }) + ` at ${timeString}`;
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
              <Link to="/dashboard" className="text-deep-orange font-medium">
                My Classes
              </Link>
              <Link to="/discover" className="text-charcoal-black hover:text-deep-orange transition-colors">
                Discover
              </Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationSystem />

              {/* Profile Menu */}
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
                    {(userProfile?.role === 'host' || userProfile?.role === 'both') && (
                      <Link to="/host-dashboard" className="block px-4 py-2 text-charcoal-black hover:bg-light-sand transition-colors">
                        Host Dashboard
                      </Link>
                    )}
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
            My Classes
          </h1>
          <p className="text-lg text-warm-gray">
            Manage your purchased classes and join live sessions
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-deep-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-warm-gray">Loading your classes...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-brick-red/10 border border-brick-red/20 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-brick-red" />
              <div>
                <h3 className="font-semibold text-brick-red mb-1">Unable to load classes</h3>
                <p className="text-warm-gray">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && tickets.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-light-sand rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-12 h-12 text-warm-gray" />
            </div>
            <h3 className="text-xl font-semibold text-charcoal-black mb-2">No classes yet</h3>
            <p className="text-warm-gray mb-6">You haven't purchased any classes yet. Discover amazing classes from talented creators!</p>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 bg-deep-orange text-creamy-white px-6 py-3 rounded-xl font-semibold hover:bg-brick-red transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Discover Classes
            </Link>
          </div>
        )}

        {/* Upcoming Classes */}
        {!isLoading && upcomingClasses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal-black mb-6">Upcoming Classes</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingClasses.map((ticket) => {
                const classData = ticket.classes;
                const isLive = isClassLive(classData);
                
                return (
                  <div
                    key={ticket.id}
                    className="bg-creamy-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-light-sand/50"
                  >
                    <div className="p-6">
                      {/* Status Badge */}
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-forest-green text-creamy-white px-3 py-1 rounded-full text-sm font-medium">
                          {classData.categories?.name || 'General'}
                        </span>
                        {isLive && (
                          <span className="bg-brick-red text-creamy-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                            LIVE NOW
                          </span>
                        )}
                      </div>

                      {/* Host Info */}
                      <div className="flex items-center space-x-3 mb-4">
                        <img
                          src={classData.users?.avatar_url || 'https://images.pexels.com/photos/3184334/pexels-photo-3184334.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face'}
                          alt={classData.users?.full_name || 'Host'}
                          className="w-10 h-10 rounded-full object-cover border-2 border-light-sand"
                        />
                        <div>
                          <h4 className="font-semibold text-charcoal-black text-sm">{classData.users?.full_name || 'Host'}</h4>
                        </div>
                      </div>

                      {/* Class Info */}
                      <h3 className="text-lg font-bold text-charcoal-black mb-2 line-clamp-2">
                        {classData.title}
                      </h3>
                      <p className="text-warm-gray text-sm mb-4 line-clamp-2">
                        {classData.description}
                      </p>

                      {/* Date & Time */}
                      <div className="flex items-center justify-between text-sm text-warm-gray mb-4">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatClassDateTime(classData.date_time)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{classData.duration_minutes}m</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isLive ? (
                        <Link 
                          to={`/class/${classData.id}/live`}
                          className="w-full bg-gradient-to-r from-forest-green to-deep-orange text-creamy-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 text-center block flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Join Live Class
                        </Link>
                      ) : (
                        <div className="w-full bg-light-sand text-charcoal-black py-3 px-6 rounded-xl font-semibold text-center">
                          Starts {formatClassDateTime(classData.date_time)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Classes */}
        {!isLoading && pastClasses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-charcoal-black mb-6">Past Classes</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pastClasses.slice(0, 6).map((ticket) => {
                const classData = ticket.classes;
                
                return (
                  <div
                    key={ticket.id}
                    className="bg-creamy-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-light-sand/50 opacity-75"
                  >
                    <div className="p-6">
                      {/* Status Badge */}
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-warm-gray text-creamy-white px-3 py-1 rounded-full text-sm font-medium">
                          {classData.categories?.name || 'General'}
                        </span>
                        <span className="bg-light-sand text-charcoal-black px-3 py-1 rounded-full text-xs font-medium">
                          Completed
                        </span>
                      </div>

                      {/* Host Info */}
                      <div className="flex items-center space-x-3 mb-4">
                        <img
                          src={classData.users?.avatar_url || 'https://images.pexels.com/photos/3184334/pexels-photo-3184334.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face'}
                          alt={classData.users?.full_name || 'Host'}
                          className="w-10 h-10 rounded-full object-cover border-2 border-light-sand"
                        />
                        <div>
                          <h4 className="font-semibold text-charcoal-black text-sm">{classData.users?.full_name || 'Host'}</h4>
                        </div>
                      </div>

                      {/* Class Info */}
                      <h3 className="text-lg font-bold text-charcoal-black mb-2 line-clamp-2">
                        {classData.title}
                      </h3>

                      {/* Date */}
                      <div className="flex items-center text-sm text-warm-gray mb-4">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>
                          {new Date(classData.date_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Rate Class Button */}
                      <Link
                        to={`/class/${classData.id}/rating`}
                        className="w-full bg-golden-yellow text-charcoal-black py-3 px-6 rounded-xl font-semibold hover:bg-golden-yellow/80 transition-colors text-center block flex items-center justify-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        Rate Class
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {pastClasses.length > 6 && (
              <div className="text-center mt-6">
                <button className="text-deep-orange hover:text-brick-red font-medium">
                  View All Past Classes ({pastClasses.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Discover Button */}
      <Link
        to="/discover"
        className="fixed bottom-6 right-6 bg-gradient-to-r from-deep-orange to-golden-yellow text-creamy-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-50 group"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
        <span className="absolute -top-12 right-0 bg-charcoal-black text-creamy-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          Discover Classes
        </span>
      </Link>
    </div>
  );
};

export default DashboardPage;