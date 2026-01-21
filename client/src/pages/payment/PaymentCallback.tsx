import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Card, CardContent, Button } from '@/components/ui';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * Payment Callback Page
 *
 * Handles Paystack payment verification after redirect
 */

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');

    const verifyPayment = async () => {
      try {
        const ref = reference || trxref;
        if (!ref) {
          setStatus('failed');
          setMessage('No payment reference found');
          return;
        }

        const response = await apiClient.get<{
          success: boolean;
          data: {
            success: boolean;
            transaction: {
              reference: string;
              amount: number;
              status: string;
            };
          };
        }>(`/payments/verify/${ref}`);

        if (response.data?.success) {
          setStatus('success');
          setMessage('Payment completed successfully!');
        } else {
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.message || 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {status === 'verifying' && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                <h2 className="text-xl font-semibold">Verifying Payment</h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="text-xl font-semibold text-green-600">Payment Successful!</h2>
                <p className="text-muted-foreground">{message}</p>
                <Button onClick={() => navigate('/bookings')} className="mt-4">
                  View Bookings
                </Button>
              </>
            )}

            {status === 'failed' && (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="text-xl font-semibold text-red-600">Payment Failed</h2>
                <p className="text-muted-foreground">{message}</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button variant="outline" onClick={() => navigate('/bookings')}>
                    Go to Bookings
                  </Button>
                  <Button onClick={() => window.history.back()}>
                    Try Again
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
