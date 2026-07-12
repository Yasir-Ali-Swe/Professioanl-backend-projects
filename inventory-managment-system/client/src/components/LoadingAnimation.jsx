import React from 'react';
import { motion } from 'framer-motion';

const loadingText = "Loading";

export const LoadingTextAnimation = ({ text }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col items-center justify-center"
        >
            <p className="text-md font-medium text-muted-foreground">
                {text.split("").map((char, index) => (
                    <motion.span
                        key={index}
                        className="inline-block"
                        animate={{
                            y: [0, -4, 0],
                            opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                            duration: 0.6,
                            delay: index * 0.08,
                            repeat: Infinity,
                            repeatDelay: 0.2,
                            ease: "easeInOut",
                        }}
                    >
                        {char === " " ? "\u00A0" : char}
                    </motion.span>
                ))}
            </p>
        </motion.div>
    );
};

export const LoadingDotsAnimation = () => {
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center justify-center"
    >
        <div className="flex gap-1">
            {loadingText.split("").map((_, index) => (
                <motion.div
                    key={index}
                    className="h-2 w-2 rounded-full bg-primary/30"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                        duration: 1.5,
                        delay: index * 0.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    </motion.div>
}