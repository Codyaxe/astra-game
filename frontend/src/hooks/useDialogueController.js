/**
 * useDialogueController.js — Master Audio & Subtitle Queue Controller
 *
 * Plays sequential audio dialogue clips (.mp3) while displaying movie subtitles.
 * Features automatic duration fallback if MP3 files are missing or blocked by browser autoplay policies.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export default function useDialogueController() {
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const isCancelledRef = useRef(false);

  const stopDialogue = useCallback(() => {
    isCancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveSubtitle(null);
    setIsPlaying(false);
  }, []);

  const playLine = useCallback((lineObj, onComplete = null) => {
    stopDialogue();
    isCancelledRef.current = false;

    if (!lineObj) {
      onComplete?.();
      return;
    }

    setIsPlaying(true);
    setActiveSubtitle({
      speaker: lineObj.speaker || 'SHIP AI',
      text: lineObj.text,
      id: lineObj.id,
      triggers3DTurn: lineObj.triggers3DTurn,
      triggersWarpStreaks: lineObj.triggersWarpStreaks,
    });

    const textDuration = lineObj.textDurationMs || 4000;
    const postDelay = lineObj.postDelayMs || 300;

    let hasAdvanced = false;

    const advance = () => {
      if (hasAdvanced || isCancelledRef.current) return;
      hasAdvanced = true;

      setActiveSubtitle(null);
      setIsPlaying(false);

      if (lineObj.postDelayMs) {
        timerRef.current = setTimeout(() => {
          if (!isCancelledRef.current) onComplete?.();
        }, postDelay);
      } else {
        onComplete?.();
      }
    };

    // Try playing MP3 audio file if specified
    if (lineObj.audioPath) {
      try {
        const audio = new Audio(lineObj.audioPath);
        audioRef.current = audio;

        audio.onended = advance;
        audio.onerror = () => {
          // Fallback to text duration if audio file missing
          timerRef.current = setTimeout(advance, textDuration);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay policy fallback
            timerRef.current = setTimeout(advance, textDuration);
          });
        }
      } catch (err) {
        timerRef.current = setTimeout(advance, textDuration);
      }
    } else {
      timerRef.current = setTimeout(advance, textDuration);
    }
  }, [stopDialogue]);

  const playSequence = useCallback(
    (sequence = [], onComplete = null, onLineStart = null) => {
      stopDialogue();
      isCancelledRef.current = false;

      if (!sequence || sequence.length === 0) {
        onComplete?.();
        return;
      }

      let currentIndex = 0;

      function step() {
        if (isCancelledRef.current || currentIndex >= sequence.length) {
          setActiveSubtitle(null);
          setIsPlaying(false);
          if (!isCancelledRef.current) onComplete?.();
          return;
        }

        const currentLine = sequence[currentIndex];
        onLineStart?.(currentLine, currentIndex);

        setIsPlaying(true);
        setActiveSubtitle({
          speaker: currentLine.speaker || 'SHIP AI',
          text: currentLine.text,
          id: currentLine.id,
          triggers3DTurn: currentLine.triggers3DTurn,
          triggersWarpStreaks: currentLine.triggersWarpStreaks,
        });

        const textDuration = currentLine.textDurationMs || 4000;
        const postDelay = currentLine.postDelayMs || 300;

        let hasAdvanced = false;

        const advanceToNext = () => {
          if (hasAdvanced || isCancelledRef.current) return;
          hasAdvanced = true;

          currentIndex += 1;
          if (currentIndex < sequence.length) {
            timerRef.current = setTimeout(step, postDelay);
          } else {
            setActiveSubtitle(null);
            setIsPlaying(false);
            if (!isCancelledRef.current) onComplete?.();
          }
        };

        if (currentLine.audioPath) {
          try {
            const audio = new Audio(currentLine.audioPath);
            audioRef.current = audio;

            audio.onended = advanceToNext;
            audio.onerror = () => {
              timerRef.current = setTimeout(advanceToNext, textDuration);
            };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                timerRef.current = setTimeout(advanceToNext, textDuration);
              });
            }
          } catch (err) {
            timerRef.current = setTimeout(advanceToNext, textDuration);
          }
        } else {
          timerRef.current = setTimeout(advanceToNext, textDuration);
        }
      }

      step();
    },
    [stopDialogue]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDialogue();
    };
  }, [stopDialogue]);

  return {
    activeSubtitle,
    isPlaying,
    playLine,
    playSequence,
    stopDialogue,
  };
}
