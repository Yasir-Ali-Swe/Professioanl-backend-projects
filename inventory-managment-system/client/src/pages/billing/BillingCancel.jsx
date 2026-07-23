// pages/billing/BillingCancel.jsx
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BillingCancelPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex flex-col items-center"
            >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mb-8 shadow-xs">
                    <XCircle className="h-10 w-10 text-destructive" />
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight mb-3">Upgrade Canceled</h1>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    The Stripe checkout session was canceled or payment failed. No charges were made to your account.
                </p>

                <Button onClick={() => navigate('/admin/billing')} className="w-full">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Billing
                </Button>
            </motion.div>
        </div>
    );
};

export default BillingCancelPage;
