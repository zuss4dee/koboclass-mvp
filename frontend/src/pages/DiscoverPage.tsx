import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Calendar, Clock, Users, User, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAllApprovedClasses } from '../api/classes';
import NotificationSystem from '../components/NotificationSystem';

interface Class {
  id: string;
  title: string;
  description: string;
  price: number;
  date_time: string;
  duration_minutes: number;
  max_participants: number;
  current_participants: number;
  categories?: {
    name: string;
  };
  users?: {
    full_name: string;
    avatar_url: string;
  };
}

const DiscoverPage = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const { userProfile, signOut } = useAuth();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const result = await getAllApprovedClasses();
        if (result.success && result.data) {
          // Filter out past classes and show only upcoming ones
          const now = new Date();
          const upcomingClasses = result.data.filter((cls: Class) => 
            new Date(cls.date_time) > now
          );
          setClasses(upcomingClasses);
          setFilteredClasses(upcomingClasses);
        } else {
          setError(result.error || 'Failed to load classes');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Error fetching classes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // Filter classes based on search and category
  useEffect(() => {
    let filtered = classes;

    if (searchTerm) {
      filtered = filtered.filter(cls =>
        cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(cls =>
        cls.categories?.name?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    setFilteredClasses(filtered);
  }, [searchTerm, selectedCategory, classes]);

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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const categories = ['all', ...new Set(classes.map(cls => cls.categories?.name).filter(Boolean))];

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
              <Link to="/discover" className="text-deep-orange font-medium">
                Discover
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
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-deep-orange" />
            <span className="text-sm font-medium text-warm-gray">Explore & Learn</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-black mb-2">
            Discover Classes
          </h1>
          <p className="text-lg text-warm-gray">
            Find amazing classes from talented creators and expand your skills
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-warm-gray w-5 h-5" />
            <input
              type="text"
              placeholder="Search classes, topics, or instructors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-light-sand rounded-xl bg-creamy-white focus:outline-none focus:ring-2 focus:ring-deep-orange focus:border-deep-orange transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-warm-gray w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-3 border border-light-sand rounded-xl bg-creamy-white focus:outline-none focus:ring-2 focus:ring-deep-orange focus:border-deep-orange transition-colors appearance-none cursor-pointer min-w-[150px]"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-deep-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-warm-gray">Loading classes...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-brick-red/10 border border-brick-red/20 rounded-xl p-6 mb-8">
            <p className="text-brick-red">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredClasses.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-light-sand rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-warm-gray" />
            </div>
            <h3 className="text-xl font-semibold text-charcoal-black mb-2">No classes found</h3>
            <p className="text-warm-gray">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No classes are currently available'}
            </p>
          </div>
        )}

        {/* Classes Grid */}
        {!loading && !error && filteredClasses.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="bg-creamy-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-light-sand/50"
              >
                <div className="p-6">
                  {/* Category Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-forest-green text-creamy-white px-3 py-1 rounded-full text-sm font-medium">
                      {classItem.categories?.name || 'General'}
                    </span>
                    <span className="text-lg font-bold text-deep-orange">
                      ₦{(classItem.price / 100).toLocaleString()}
                    </span>
                  </div>

                  {/* Host Info */}
                  <div className="flex items-center space-x-3 mb-4">
                    <img
                      src={classItem.users?.avatar_url || 'https://images.pexels.com/photos/3184334/pexels-photo-3184334.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face'}
                      alt={classItem.users?.full_name || 'Host'}
                      className="w-10 h-10 rounded-full object-cover border-2 border-light-sand"
                    />
                    <div>
                      <h4 className="font-semibold text-charcoal-black text-sm">
                        {classItem.users?.full_name || 'Host'}
                      </h4>
                    </div>
                  </div>

                  {/* Class Info */}
                  <h3 className="text-lg font-bold text-charcoal-black mb-2 line-clamp-2">
                    {classItem.title}
                  </h3>
                  <p className="text-warm-gray text-sm mb-4 line-clamp-2">
                    {classItem.description}
                  </p>

                  {/* Class Details */}
                  <div className="space-y-2 mb-4 text-sm text-warm-gray">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatClassDateTime(classItem.date_time)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{classItem.duration_minutes}m</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{classItem.current_participants || 0}/{classItem.max_participants}</span>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <Link
                    to={`/class/${classItem.id}/checkout`}
                    className="w-full bg-gradient-to-r from-deep-orange to-golden-yellow text-creamy-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 text-center block"
                  >
                    Purchase Class
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && filteredClasses.length > 0 && (
          <div className="mt-8 text-center text-warm-gray">
            Showing {filteredClasses.length} of {classes.length} classes
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
