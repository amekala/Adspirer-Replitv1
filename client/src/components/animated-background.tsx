import { useTheme } from '@/components/ui/theme-provider';
import { motion } from 'framer-motion';

export function AnimatedBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div 
        className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-b from-indigo-950 via-violet-950 to-fuchsia-950 opacity-90' 
            : 'bg-gradient-to-b from-indigo-100 via-violet-100 to-fuchsia-100 opacity-90'
        }`}
        style={{ mixBlendMode: 'normal' }}
      />
      
      {/* Animated blobs */}
      <div className="absolute inset-0">
        <motion.div
          className={`absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full ${
            isDark ? 'bg-indigo-500 opacity-20' : 'bg-indigo-300 opacity-30'
          } blur-[120px]`}
          animate={{
            x: [0, 30, -30, 0],
            y: [0, -30, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className={`absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] rounded-full ${
            isDark ? 'bg-purple-500 opacity-20' : 'bg-purple-300 opacity-30'
          } blur-[100px]`}
          animate={{
            x: [0, -40, 40, 0],
            y: [0, 40, -40, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className={`absolute top-1/2 right-1/3 w-[25vw] h-[25vw] rounded-full ${
            isDark ? 'bg-fuchsia-500 opacity-20' : 'bg-fuchsia-300 opacity-30'
          } blur-[80px]`}
          animate={{
            x: [0, 50, -20, 0],
            y: [0, -20, 50, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid" />
    </div>
  );
} 