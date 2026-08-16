import { useState, useRef, useCallback, useEffect } from 'react';

export default function useDialogueController() {
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const isCancelledRef = useRef(false);

  const stopDialogue = useCallback(() => {
    isCancelledRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      } catch (e) {}
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
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

    const textDuration = lineObj.textDurationMs || 8500;
    const postDelay = lineObj.postDelayMs !== undefined ? lineObj.postDelayMs : 650;

    let hasAdvanced = false;

    const advance = () => {
      if (hasAdvanced || isCancelledRef.current) return;
      hasAdvanced = true;

      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = '';
        } catch (e) {}
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current = null;
      }

      setActiveSubtitle(null);
      setIsPlaying(false);

      if (postDelay > 0) {
        timerRef.current = setTimeout(() => {
          if (!isCancelledRef.current) onComplete?.();
        }, postDelay);
      } else {
        onComplete?.();
      }
    };

    if (lineObj.audioPath) {
      try {
        const audio = new Audio(lineObj.audioPath);
        audioRef.current = audio;

        audio.onended = advance;
        audio.onerror = (err) => {
          console.warn('[ASTRA AUDIO] Error loading audio file, fallback to text timer:', lineObj.audioPath, err);
          if (!isCancelledRef.current) {
            timerRef.current = setTimeout(advance, textDuration);
          }
        };

        const p = audio.play();
        if (p !== undefined) {
          p.catch((err) => {
            if (isCancelledRef.current || err.name === 'AbortError') return;
            console.warn('[ASTRA AUDIO] Autoplay prevented, fallback to text duration:', err);
            timerRef.current = setTimeout(advance, textDuration);
          });
        }
      } catch (err) {
        if (!isCancelledRef.current) {
          timerRef.current = setTimeout(advance, textDuration);
        }
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

      function playNextLine() {
        if (isCancelledRef.current || currentIndex >= sequence.length) {
          setActiveSubtitle(null);
          setIsPlaying(false);
          if (!isCancelledRef.current) onComplete?.();
          return;
        }

        // Hard stop any previous audio before starting new line
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = '';
          } catch (e) {}
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
          audioRef.current = null;
        }

        const line = sequence[currentIndex];
        onLineStart?.(line, currentIndex);

        setIsPlaying(true);
        setActiveSubtitle({
          speaker: line.speaker || 'SHIP AI',
          text: line.text,
          id: line.id,
          triggers3DTurn: line.triggers3DTurn,
          triggersWarpStreaks: line.triggersWarpStreaks,
        });

        const textDuration = line.textDurationMs || 8500;
        const postDelay = line.postDelayMs !== undefined ? line.postDelayMs : 650;

        let hasMoved = false;

        const next = () => {
          if (hasMoved || isCancelledRef.current) return;
          hasMoved = true;

          if (audioRef.current) {
            try {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current.src = '';
            } catch (e) {}
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current = null;
          }

          currentIndex += 1;
          if (currentIndex < sequence.length) {
            timerRef.current = setTimeout(playNextLine, postDelay);
          } else {
            setActiveSubtitle(null);
            setIsPlaying(false);
            if (!isCancelledRef.current) onComplete?.();
          }
        };

        if (line.audioPath) {
          try {
            const audio = new Audio(line.audioPath);
            audioRef.current = audio;

            audio.onended = next;
            audio.onerror = (err) => {
              console.warn('[ASTRA AUDIO] Error loading sequence audio:', line.audioPath, err);
              if (!isCancelledRef.current) {
                timerRef.current = setTimeout(next, textDuration);
              }
            };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                if (isCancelledRef.current || err.name === 'AbortError') return;
                console.warn('[ASTRA AUDIO] Sequence autoplay blocked, using timer fallback:', err);
                timerRef.current = setTimeout(next, textDuration);
              });
            }
          } catch (err) {
            if (!isCancelledRef.current) {
              timerRef.current = setTimeout(next, textDuration);
            }
          }
        } else {
          timerRef.current = setTimeout(next, textDuration);
        }
      }

      playNextLine();
    },
    [stopDialogue]
  );

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
