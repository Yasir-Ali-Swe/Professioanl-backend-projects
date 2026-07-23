// pages/billing/BillingSuccess.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

const BillingSuccessPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        // Invalidate billing queries to load the updated premium subscription state
        queryClient.invalidateQueries({ queryKey: ['billing'] });
        queryClient.invalidateQueries({ queryKey: ['auth'] });
    }, [queryClient]);

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex flex-col items-center"
            >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 mb-8 shadow-xs">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight mb-3">Upgrade Successful!</h1>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    Thank you for upgrading! Your organization now has full access to StockPilot's advanced AI forecasting, stock discrepancy anomaly detection, and automated insights reports.
                </p>

                <div className="w-full bg-muted/30 border p-4 mb-8 text-left space-y-3">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                        <div>
                            <p className="text-xs font-semibold">Premium Activated</p>
                            <p className="text-xs text-muted-foreground">Weekly analytics, chatbot assistance, and suggestions are now live.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button onClick={() => navigate('/admin/billing')} className="flex-1">
                        Go to Billing
                    </Button>
                    <Button onClick={() => navigate('/admin/dashboard')} variant="outline" className="flex-1">
                        Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

export default BillingSuccessPage;
