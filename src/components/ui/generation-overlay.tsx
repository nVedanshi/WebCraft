import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const stages = [
  { message: "AI interpreting intent…", duration: 1500 },
  { message: "Analyzing requirements…", duration: 1200 },
  { message: "Validating scope…", duration: 1000 },
  { message: "Mapping to capabilities…", duration: 1200 },
  { message: "Generating blueprint…", duration: 1500 },
  { message: "Finalizing structure…", duration: 800 },
];

interface GenerationOverlayProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function GenerationOverlay({ isVisible, onComplete }: GenerationOverlayProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0);
      setProgress(0);
      return;
    }

    let stageIndex = 0;
    let totalTime = 0;
    const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);

    const advanceStage = () => {
      if (stageIndex < stages.length - 1) {
        stageIndex++;
        setCurrentStage(stageIndex);
        totalTime += stages[stageIndex - 1].duration;
        setProgress((totalTime / totalDuration) * 100);
        setTimeout(advanceStage, stages[stageIndex].duration);
      } else {
        setProgress(100);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    };

    setTimeout(advanceStage, stages[0].duration);
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.1, 0.15, 0.1],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
            />
          </div>

          <div className="relative flex flex-col items-center gap-8 px-6 max-w-md text-center">
            {/* Spinning logo */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="absolute inset-0 gradient-primary opacity-40 blur-2xl rounded-full" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
            </motion.div>

            {/* Stage message */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <h2 className="text-xl font-semibold text-foreground">
                  {stages[currentStage].message}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Building your application blueprint
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  Step {currentStage + 1} of {stages.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Animated dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
