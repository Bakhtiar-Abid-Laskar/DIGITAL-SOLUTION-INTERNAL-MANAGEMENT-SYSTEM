import { useEffect, useState } from 'react';

/**
 * useCountUp hook
 * Smoothly animates a numeric value from previous to next value using requestAnimationFrame.
 * If target is non-numeric, it returns the target value directly.
 */
export function useCountUp(
  targetValue: number | string,
  duration = 350
): number | string {
  const numericTarget = typeof targetValue === 'number' ? targetValue : Number(targetValue);
  const isNumber = !isNaN(numericTarget) && typeof targetValue !== 'boolean';

  const [currentValue, setCurrentValue] = useState<number>(isNumber ? numericTarget : 0);

  useEffect(() => {
    if (!isNumber) return;

    let startTimestamp: number | null = null;
    const startValue = currentValue;
    const diff = numericTarget - startValue;

    if (diff === 0) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic: 1 - (1 - progress)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(startValue + diff * easeOut);

      setCurrentValue(nextVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrentValue(numericTarget);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [numericTarget, isNumber, duration]);

  if (!isNumber) return targetValue;
  return currentValue;
}
