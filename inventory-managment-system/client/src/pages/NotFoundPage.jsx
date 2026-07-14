import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    Home,
    ArrowLeft,
    AlertCircle,
    Compass,
    Zap
} from 'lucide-react';

const NotFoundPage = () => {
    const loadingText = "Loading";
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-background flex items-center justify-center px-4 py-12"
        >
            <div className="text-center max-w-2xl mx-auto">
                {/* Animated 404 Number */}
                <motion.div
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: 0.2
                    }}
                    className="relative inline-block"
                >
                    {/* Gradient Background Glow */}
                    <div className="absolute inset-0 blur-3xl opacity-20 bg-linear-to-r from-primary via-primary/50 to-transparent rounded-full" />

                    <h1 className="text-9xl md:text-[12rem] font-bold bg-linear-to-r from-primary via-primary/70 to-primary/30 bg-clip-text text-transparent relative z-10">
                        404
                    </h1>

                    {/* Floating Icons */}
                    <motion.div
                        className="absolute -top-6 -right-6 md:-top-8 md:-right-8"
                        animate={{
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 0.9, 1]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <AlertCircle className="h-12 w-12 md:h-16 md:w-16 text-destructive/80" />
                    </motion.div>

                    <motion.div
                        className="absolute -bottom-4 -left-6 md:-bottom-6 md:-left-8"
                        animate={{
                            rotate: [0, -15, 15, 0],
                            scale: [1, 1.2, 0.8, 1]
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 1
                        }}
                    >
                        <Compass className="h-8 w-8 md:h-12 md:w-12 text-primary/60" />
                    </motion.div>
                </motion.div>

                {/* Error Message */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 space-y-4"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        Page Not Found
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        Oops! The page you're looking for doesn't exist or has been moved.
                    </p>

                    {/* Decorative Divider */}
                    <div className="flex items-center justify-center gap-3 my-6">
                        <div className="h-px w-12 bg-border" />
                        <Zap className="h-4 w-4 text-muted-foreground/50" />
                        <div className="h-px w-12 bg-border" />
                    </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center"
                >
                    <Button asChild size="lg" className="gap-2 shadow-lg hover:shadow-primary/25 transition-shadow">
                        <Link to="/" className="flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            Go Home
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="gap-2 hover:bg-muted transition-colors"
                        onClick={() => window.history.back()}
                    >
                        <span className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                        </span>
                    </Button>
                </motion.div>

                {/* Fun Animation */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 flex flex-col items-center justify-center gap-2"
                >
                </motion.div>
            </div>
        </motion.div>
    );
};

export default NotFoundPage;