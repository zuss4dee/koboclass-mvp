'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PendingPayout = {
  hostId: string;
  hostEmail: string;
  totalAmount: number;
};

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchPayouts = async () => {
      const { data, error } = await supabase.functions.invoke('get-pending-payouts');
      if (error) {
        setMessage(`Error fetching payouts: ${error.message}`);
      } else {
        setPayouts(data.pendingPayouts);
      }
      setLoading(false);
    };

    fetchPayouts();
  }, []);

  const handleProcessPayout = async (hostId: string) => {
    setMessage('');
    const { data, error } = await supabase.functions.invoke('process-payout', {
      body: { hostId },
    });

    if (error) {
      setMessage(`Error processing payout: ${error.message}`);
    } else {
      setMessage(`Payout processed successfully for host.`);
      // Refresh the list by removing the processed payout
      setPayouts(payouts.filter(p => p.hostId !== hostId));
    }
  };

  if (loading) {
    return <div className="p-8">Loading pending payouts...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Pending Payouts</h1>
      {message && <div className="p-4 mb-4 text-white bg-blue-500 rounded-lg">{message}</div>}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">Host Email</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">Amount Owed</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase bg-gray-100 border-b-2 border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-5 text-center text-gray-500">No pending payouts.</td>
              </tr>
            ) : (
              payouts.map((payout) => (
                <tr key={payout.hostId}>
                  <td className="px-5 py-5 text-sm bg-white border-b border-gray-200">
                    <p className="text-gray-900 whitespace-no-wrap">{payout.hostEmail}</p>
                  </td>
                  <td className="px-5 py-5 text-sm bg-white border-b border-gray-200">
                    <p className="text-gray-900 whitespace-no-wrap">${payout.totalAmount.toFixed(2)}</p>
                  </td>
                  <td className="px-5 py-5 text-sm text-right bg-white border-b border-gray-200">
                    <button 
                      onClick={() => handleProcessPayout(payout.hostId)}
                      className="px-4 py-2 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700">
                      Process Payout
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
