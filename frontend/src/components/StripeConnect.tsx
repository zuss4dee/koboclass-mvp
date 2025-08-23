import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../api/supabaseClient';
import { ExternalLink, Loader2 } from 'lucide-react';

const StripeConnect: React.FC = () => {
  const { user, userDetails } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectStripe = async () => {
    if (!user || !user.email) {
      setError('User information is not available.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('stripe-connect-onboarding', {
        body: { userId: user.id, email: user.email },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to get Stripe onboarding URL.');
      }
    } catch (err: any) {
      console.error('Stripe Connect error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  if (userDetails?.stripe_account_id) {
    return (
      <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-md">
        <p className="font-bold">Stripe Account Connected</p>
        <p>Your account is ready to receive payouts.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Connect with Stripe</h3>
      <p className="text-gray-600 mb-4">Connect your Stripe account to receive payouts for your classes. KoboClass uses Stripe for secure and reliable payments.</p>
      <button
        onClick={handleConnectStripe}
        disabled={isLoading}
        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-all duration-300 flex items-center justify-center"
      >
        {isLoading ? (
          <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Processing...</>
        ) : (
          <><ExternalLink className="h-5 w-5 mr-2" /> Connect with Stripe</>
        )}
      </button>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
};

export default StripeConnect;
