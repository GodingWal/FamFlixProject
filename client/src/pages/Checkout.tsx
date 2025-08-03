import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

// Payment form component
const CheckoutForm = ({ templateId, amount }: { templateId: string; amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if Stripe is available
  if (!stripePromise) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">Stripe is not configured. Please contact support.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Make sure to change this to your payment completion page
          return_url: `${window.location.origin}/video-processor/${templateId}`,
        },
      });
  
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Otherwise, your customer will be redirected to
      // your return_url. For some payment methods like iDEAL, your customer will
      // be redirected to an intermediate site first to authorize the payment, then
      // redirected to the return_url.
      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-6">
        <div>
          <PaymentElement />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">Total: ${amount.toFixed(2)}</span>
          <Button 
            type="submit" 
            disabled={!stripe || isProcessing}
            className="px-6"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default function Checkout() {
  // Use the template ID from URL
  const [match, params] = useRoute('/checkout/:templateId');
  const templateId = params?.templateId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [clientSecret, setClientSecret] = useState('');

  // Fetch the video template details
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['/api/videoTemplates', templateId],
    queryFn: async () => {
      const res = await fetch(`/api/videoTemplates/${templateId}`);
      if (!res.ok) throw new Error('Failed to fetch template');
      return res.json();
    },
    enabled: !!templateId,
  });

  useEffect(() => {
    // If no template ID is provided, redirect back to video library
    if (!templateId) {
      setLocation('/video-library');
      return;
    }

    // Create PaymentIntent as soon as the template is loaded
    if (template) {
      apiRequest('POST', '/api/create-payment-intent', { templateId })
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to create payment intent');
          }
          return res.json();
        })
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((err) => {
          toast({
            title: 'Error',
            description: err.message || 'Failed to initialize payment',
            variant: 'destructive',
          });
          // Redirect back to template page if payment can't be initialized
          setLocation('/video-library');
        });
    }
  }, [templateId, template, setLocation, toast]);

  if (!match || !templateId) {
    return null; // Will redirect in useEffect
  }

  if (templateLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold">Template not found</h1>
        <Button onClick={() => setLocation('/video-library')} className="mt-4">
          Back to Video Library
        </Button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Initializing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>
            Purchase premium content: {template.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <img 
              src={template.thumbnailUrl} 
              alt={template.title} 
              className="w-full h-48 object-cover rounded-md"
            />
            <div className="mt-4 space-y-2">
              <h3 className="font-medium text-lg">{template.title}</h3>
              <p className="text-sm text-muted-foreground">{template.description}</p>
              <p className="font-semibold text-lg">Price: ${template.price?.toFixed(2)}</p>
            </div>
          </div>
          
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm templateId={templateId} amount={template.price || 0} />
          </Elements>
        </CardContent>
        <CardFooter className="flex justify-start">
          <Button variant="outline" onClick={() => setLocation('/video-library')}>
            Back to Video Library
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}