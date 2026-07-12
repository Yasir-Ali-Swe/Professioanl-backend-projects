// components/skeletons/ProductSkeleton.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const AnimatedSkeleton = ({ className, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0.3 }}
      animate={{ 
        opacity: [0.3, 0.6, 0.3],
        transition: {
          duration: 1.5,
          delay: delay,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      <Skeleton className={className} />
    </motion.div>
  );
};

export const ProductCardSkeleton = () => {
  return (
    <motion.div 
      className="border rounded-lg p-4 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatedSkeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-2">
        <AnimatedSkeleton className="h-4 w-3/4" delay={0.1} />
        <AnimatedSkeleton className="h-4 w-1/2" delay={0.2} />
        <AnimatedSkeleton className="h-6 w-1/4" delay={0.3} />
      </div>
      <div className="flex gap-2">
        <AnimatedSkeleton className="h-10 w-full" delay={0.4} />
        <AnimatedSkeleton className="h-10 w-12" delay={0.5} />
      </div>
    </motion.div>
  );
};

export const ProductListSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};