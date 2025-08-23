import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle,
  Calendar,
  Share2,
  Download,
  Clock,
  MapPin,
  User,
  Sparkles,
  Shield,
  Star
} from 'lucide-react';
import { cn } from '../lib/utils';
import { createCheckoutSession } from '../api/checkout';
import { useAuth } from '../contexts/AuthContext';
import { getClassById } from '../api/classes';
import { AlertCircle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  popular?: boolean;
}

const CheckoutPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);

  useEffect(() => {
    const fetchClassData = async () => {
      if (!classId) {
        setError('Class ID is required');
        setIsLoading(false);
        return;
      }

      try {
        const result = await getClassById(classId);
        
        if (!result.success) {
          setError(result.error || 'Failed to load class details');
        } else if (!result.data) {
          setError('Class not found');
        } else {
          setClassData(result.data);
        }
      } catch (error) {
        console.error('Error fetching class data:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassData();
  }, [classId]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { 
        state: { 
          from: `/class/${classId}/checkout`,
          message: 'Please log in to purchase this class'
        }
      });
    }
  }, [user, isLoading, navigate, classId]);

  const handlePaymentSelect = (methodId: string) => {
    setSelectedPayment(methodId);
  };

  const handleProceedToPayment = async () => {
    if (!user || !userProfile || !classData) {
      setError('Missing required information');
      return;
    }

    if (!selectedPayment) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const sessionData = {
        classId: classData.id,
        userId: user.id,
        userEmail: user.email || '',
        className: classData.title,
        hostName: classData.users?.full_name || 'Unknown Host',
        amount: classData.price, // Price is already in kobo from database
        currency: 'NGN'
      };

      const result = await createCheckoutSession(sessionData);
      
      if (result.success && result.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.url;
      } else {
        setError(result.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToCalendar = () => {
    // Generate calendar event
    const startDate = new Date(classData.date_time);
    const endDate = new Date(startDate.getTime() + classData.duration_minutes * 60000); // duration_minutes minutes later
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(classData.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`Join your KoboClass: ${classData.description}`)}&location=${encodeURIComponent('KoboClass Live Stream')}`;
    
    window.open(calendarUrl, '_blank');
  };

  const handleShareClass = async () => {
    const shareData = {
      title: classData.title,
      text: `I just booked "${classData.title}" on KoboClass! Join me for this amazing learning experience.`,
      url: window.location.origin + `/class/${classData.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert('Link copied to clipboard!');
    }
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: 'Debit/Credit Card',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Pay with your Visa, Mastercard, or Verve card',
      popular: true
    },
    {
      id: 'transfer',
      name: 'Bank Transfer',
      icon: <Building2 className="w-6 h-6" />,
      description: 'Transfer directly from your bank account'
    },
    {
      id: 'ussd',
      name: 'USSD',
      icon: <Smartphone className="w-6 h-6" />,
      description: 'Pay using your mobile phone USSD code'
    }
  ];

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-charcoal-black mb-2">Choose Payment Method</h2>
        <p className="text-warm-gray">Select how you'd like to pay for your class</p>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            onClick={() => handlePaymentSelect(method.id)}
            className={cn(
              "relative p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg",
              selectedPayment === method.id
                ? "border-deep-orange bg-deep-orange/5 shadow-lg"
                : "border-light-sand bg-creamy-white hover:border-deep-orange/50"
            )}
          >
            {method.popular && (
              <div className="absolute -top-3 left-6 bg-golden-yellow text-charcoal-black px-3 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                selectedPayment === method.id
                  ? "bg-deep-orange text-creamy-white"
                  : "bg-light-sand text-deep-orange"
              )}>
                {method.icon}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-charcoal-black mb-1">
                  {method.name}
                </h3>
                <p className="text-warm-gray text-sm">
                  {method.description}
                </p>
              </div>
              
              <div className={cn(
                "w-6 h-6 rounded-full border-2 transition-all duration-300",
                selectedPayment === method.id
                  ? "border-deep-orange bg-deep-orange"
                  : "border-light-sand"
              )}>
                {selectedPayment === method.id && (
                  <CheckCircle className="w-4 h-4 text-creamy-white m-0.5" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-light-sand rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-forest-green" />
          <h3 className="font-semibold text-charcoal-black">Secure Payment</h3>
        </div>
        <p className="text-warm-gray text-sm">
          Your payment is secured by Stripe with bank-level encryption. We never store your card details.
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 text-center">
      {error && (
        <div className="bg-brick-red/10 border border-brick-red/30 rounded-lg p-4 flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5 text-brick-red" />
          <span className="text-brick-red font-medium">{error}</span>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="w-20 h-20 bg-deep-orange rounded-full flex items-center justify-center mx-auto">
          <div className="w-8 h-8 border-4 border-creamy-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <h2 className="text-2xl font-bold text-charcoal-black">
          {error ? 'Payment Failed' : 'Redirecting to Stripe'}
        </h2>
        <p className="text-warm-gray">
          {error ? 'Please try again or contact support.' : 'You will be redirected to Stripe to complete your payment...'}
        </p>
      </div>

      {!error && (
        <div className="bg-light-sand rounded-2xl p-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-3 h-3 bg-deep-orange rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-deep-orange rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-deep-orange rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <p className="text-warm-gray text-sm">
            Do not close this window while we redirect you to Stripe
          </p>
        </div>
      )}
      
      {error && (
        <button
          onClick={() => {
            setError(null);
            setCurrentStep(1);
          }}
          className="bg-deep-orange text-creamy-white px-6 py-3 rounded-xl font-semibold hover:bg-brick-red transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-forest-green rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-creamy-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-charcoal-black">Payment Successful!</h2>
        <p className="text-warm-gray">
          You're all set! Your ticket has been confirmed.
        </p>
      </div>

      <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-6">
        <h3 className="font-semibold text-forest-green mb-2">What's Next?</h3>
        <p className="text-charcoal-black text-sm">
          You'll receive a confirmation email with your class link. Join 5 minutes before the start time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleAddToCalendar}
          className="flex items-center justify-center gap-2 bg-deep-orange text-creamy-white px-6 py-3 rounded-xl font-semibold hover:bg-brick-red transition-colors"
        >
          <Calendar className="w-5 h-5" />
          Add to Calendar
        </button>
        
        <button
          onClick={handleShareClass}
          className="flex items-center justify-center gap-2 border border-deep-orange text-deep-orange px-6 py-3 rounded-xl font-semibold hover:bg-deep-orange hover:text-creamy-white transition-colors"
        >
          <Share2 className="w-5 h-5" />
          Share Class
        </button>
      </div>

      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-deep-orange hover:text-brick-red font-medium transition-colors"
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-sand via-creamy-white to-golden-yellow/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-deep-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg text-charcoal-black">Loading class details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-sand via-creamy-white to-golden-yellow/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-brick-red rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-creamy-white" />
              </div>
              <h1 className="text-2xl font-bold text-charcoal-black mb-4">Unable to Load Class</h1>
              <p className="text-warm-gray mb-6">{error}</p>
              <div className="space-y-3">
                <Link
                  to="/dashboard"
                  className="block w-full bg-deep-orange text-creamy-white py-3 px-6 rounded-xl font-semibold hover:bg-brick-red transition-colors"
                >
                  Browse Classes
                </Link>
                <button
                  onClick={() => navigate(-1)}
                  className="block w-full bg-light-sand text-charcoal-black py-3 px-6 rounded-xl font-semibold hover:bg-golden-yellow/20 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!classData) return null;

  // Format date and time
  const classDate = new Date(classData.date_time);
  const formattedDate = classDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = classDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-sand via-creamy-white to-golden-yellow/10">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-32 h-32 bg-warm-purple/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-deep-orange/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-golden-yellow/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link 
              to="/dashboard"
              className="flex items-center gap-2 text-charcoal-black hover:text-deep-orange transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-deep-orange" />
              <span className="text-sm font-medium text-warm-gray">Secure Checkout</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Class Summary - Left Side */}
            <div className="lg:col-span-1">
              <div className="bg-creamy-white/70 backdrop-blur-sm border border-light-sand/50 rounded-3xl p-6 shadow-2xl sticky top-6">
                <h3 className="text-lg font-bold text-charcoal-black mb-6">Class Summary</h3>
                
                {/* Class Info */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={classData.users?.avatar_url || 'https://images.pexels.com/photos/3184334/pexels-photo-3184334.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face'}
                      alt={classData.users?.full_name || 'Host'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-light-sand"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-charcoal-black mb-1">{classData.title}</h4>
                      <p className="text-sm text-warm-gray">with {classData.users?.full_name || 'Host'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-warm-gray">
                      <Calendar className="w-4 h-4" />
                      <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-warm-gray">
                      <Clock className="w-4 h-4" />
                      <span>{formattedTime} ({classData.duration_minutes} minutes)</span>
                    </div>
                    <div className="flex items-center gap-2 text-warm-gray">
                      <MapPin className="w-4 h-4" />
                      <span>Live Online Class</span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-light-sand pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal-black">Class Price</span>
                    <span className="font-semibold">₦{(classData.price / 100)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-warm-gray">No additional fees</span>
                    <span className="text-forest-green">✓ Included</span>
                  </div>
                  <hr className="border-light-sand" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-charcoal-black">Total</span>
                    <span className="font-bold text-deep-orange text-xl">₦{(classData.price / 100)?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Rating & Students */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-light-sand">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-golden-yellow fill-current" />
                    <span className="text-sm font-medium">{classData.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-warm-gray">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{classData.students_count} students</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkout Form - Right Side */}
            <div className="lg:col-span-2">
              <div className="bg-creamy-white/70 backdrop-blur-sm border border-light-sand/50 rounded-3xl p-8 shadow-2xl">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}

                {/* Action Button */}
                {currentStep === 1 && (
                  <div className="mt-8 pt-6 border-t border-light-sand">
                    {error && (
                      <div className="bg-brick-red/10 border border-brick-red/30 rounded-lg p-3 flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 text-brick-red" />
                        <span className="text-brick-red font-medium">{error}</span>
                      </div>
                    )}
                    
                    <button
                      onClick={handleProceedToPayment}
                      disabled={!selectedPayment}
                      className="w-full gradient-orange-yellow text-on-gradient py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-deep-orange/25 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      Complete Payment
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    
                    <p className="text-center text-warm-gray text-sm mt-4">
                      By proceeding, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;