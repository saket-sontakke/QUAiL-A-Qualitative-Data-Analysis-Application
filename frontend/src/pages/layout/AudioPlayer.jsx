import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaChevronDown, FaChevronUp, FaMusic, FaArrowLeft, FaInfoCircle } from 'react-icons/fa';
import { TbRewindForward10, TbRewindBackward10 } from "react-icons/tb";
import { TiArrowLoop } from "react-icons/ti";

/**
 * A feature-rich and collapsible audio player component for playing audio files.
 * It includes controls for playback, a draggable progress bar, volume, looping, and variable
 * playback speeds. The player is designed to reset its state when the audio
 * source changes. This version includes a modern + fallback OS detection so the
 * UI can show `Cmd` on Apple platforms and `Ctrl` elsewhere.
 *
 * @param {object} props - The component props.
 * @param {string} props.src - The URL of the audio source to play.
 * @param {string} props.fileId - A unique key for the audio file, used to reset the player state on source change.
 * @returns {JSX.Element} The rendered audio player component.
 */
const AudioPlayer = forwardRef(({ src, fileId }, ref) => {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const infoPopupRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlayerHidden, setIsPlayerHidden] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  const [isCustomSpeedInputVisible, setIsCustomSpeedInputVisible] = useState(false);
  const [customPlaybackRate, setCustomPlaybackRate] = useState(playbackRate.toString());
  const playbackRates = [0.5, 1, 1.25, 1.5, 1.75, 2];

  // Dual OS detection: try modern API first, fall back to navigator.platform and then userAgent
  const getOS = () => {
    if (typeof navigator === 'undefined') return 'unknown';

    try {
      if (navigator.userAgentData?.platform) {
        return navigator.userAgentData.platform;
      }
    } catch (err) {
      // ignore
    }

    // Fallback to the older navigator.platform
    if (navigator.platform) return navigator.platform;

    // Last resort: sniff userAgent (not ideal, but a safe fallback)
    if (navigator.userAgent) {
      const ua = navigator.userAgent;
      if (/Mac|iPhone|iPad|iPod/.test(ua)) return 'Mac';
      if (/Win/.test(ua)) return 'Windows';
      if (/Linux/.test(ua)) return 'Linux';
    }

    return 'unknown';
  };

  const os = getOS();
  const isMac = /Mac|iPhone|iPad|iPod/.test(os);
  const seekKey = isMac ? 'Cmd' : 'Ctrl';

  useImperativeHandle(ref, () => ({
    seekToTime(time) {
      if (audioRef.current && !isNaN(time)) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }
  }));

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && isLoaded && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [isLoaded, isSeeking]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setCurrentTime(audioRef.current.currentTime);
      setIsLoaded(true);
    }
  }, []);

  const handleEnded = useCallback(() => setIsPlaying(false), []);
  const handleLoadStart = useCallback(() => setIsLoaded(false), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.volume = volume;
    audio.muted = isMuted;
    audio.loop = isLooping;
    audio.playbackRate = playbackRate;
    if (audio.readyState >= 1) handleLoadedMetadata();
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [src, handleTimeUpdate, handleLoadedMetadata, handleEnded, handleLoadStart, volume, isMuted, isLooping, playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      setIsLoaded(false);
    }
  }, [fileId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (infoPopupRef.current && !infoPopupRef.current.contains(event.target)) {
        setIsInfoVisible(false);
      }
    };
    if (isInfoVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isInfoVisible]);

  const togglePlayPause = async () => {
    if (!audioRef.current || !isLoaded) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio play error:', error);
      setIsPlaying(false);
    }
  };

  const handleScrub = useCallback((e) => {
    if (!duration || !isLoaded || !progressBarRef.current || !audioRef.current) return;
    const progressBar = progressBarRef.current;
    const rect = progressBar.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, progressBar.offsetWidth));
    const seekTime = (offsetX / progressBar.offsetWidth) * duration;

    if (!isNaN(seekTime)) {
      setCurrentTime(seekTime);
      audioRef.current.currentTime = seekTime;
    }
  }, [duration, isLoaded]);

  useEffect(() => {
    const handleMouseUp = () => setIsSeeking(false);

    if (isSeeking) {
      window.addEventListener('mousemove', handleScrub);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleScrub);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSeeking, handleScrub]);

  const handleMouseDownOnScrubber = useCallback((e) => {
    e.preventDefault();
    setIsSeeking(true);
    handleScrub(e);
  }, [handleScrub]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioRef.current) audioRef.current.muted = newMutedState;
  };

  const handleFastForward = () => {
    if (audioRef.current && duration) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  };

  const handleRewind = () => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const toggleLoop = () => {
    const newLoopState = !isLooping;
    setIsLooping(newLoopState);
    if (audioRef.current) audioRef.current.loop = newLoopState;
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const cyclePlaybackRate = () => {
    const presetRates = [0.5, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = presetRates.indexOf(playbackRate);
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % presetRates.length;
      handlePlaybackRateChange(presetRates[nextIndex]);
    } else {
      handlePlaybackRateChange(1);
    }
  };

  const handleSetCustomSpeed = () => {
    const newValue = parseFloat(customPlaybackRate);
    if (!isNaN(newValue) && newValue >= 0.25 && newValue <= 4.0) {
      handlePlaybackRateChange(newValue);
      setIsCustomSpeedInputVisible(false);
    } else {
      alert('Invalid input. Please enter a number between 0.25 and 4.0.');
    }
  };

  const toggleInfoPopup = (e) => {
    e.stopPropagation();
    setIsInfoVisible(prev => !prev);
  };

  if (isPlayerHidden) {
    return (
      <div className="shrink-0 rounded-xl bg-white p-0.5 shadow-md dark:bg-gray-800">
        <button
          onClick={() => setIsPlayerHidden(false)}
          className="flex w-full items-center justify-center gap-2 text-sm text-gray-600 transition-colors hover:text-cyan-900 dark:text-gray-300 dark:hover:text-[#F05623]"
          title="Show Audio Player"
        >
          <FaChevronUp />
          <span>Audio Player</span>
          <FaMusic />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-xl bg-white p-3 text-gray-800 shadow-md dark:bg-gray-800 dark:text-gray-200">
      <audio ref={audioRef} src={src} key={fileId} preload="metadata" />

      <div className="flex w-full items-center gap-3">
        <button onClick={togglePlayPause} disabled={!isLoaded} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-900 text-white shadow-lg transition-all duration-300 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#F05623]" title={!isLoaded ? 'Loading...' : (isPlaying ? "Pause" : "Play") }>
          {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} className="ml-0.5" />}
        </button>

        <button onClick={handleRewind} disabled={!isLoaded} className="transition-colors hover:text-[#F05623] disabled:cursor-not-allowed disabled:opacity-50" title="Rewind 10s">
          <TbRewindBackward10 size={24} />
        </button>

        <button onClick={handleFastForward} disabled={!isLoaded} className="transition-colors hover:text-[#F05623] disabled:cursor-not-allowed disabled:opacity-50" title="Forward 10s">
          <TbRewindForward10 size={24} />
        </button>

        <div className="flex flex-1 items-center gap-4 -ml-4">
          <div className="relative w-14 shrink-0 text-right">
            <span className="font-mono text-sm">{formatTime(currentTime)}</span>
            <button onClick={toggleInfoPopup} className="absolute -right-2.5 -top-1.5 rounded-full text-gray-400 transition-colors hover:text-cyan-900 dark:hover:text-[#F05623]" title="Show seeking tip">
              <FaInfoCircle size={12} />
            </button>
            {isInfoVisible && (
              <div ref={infoPopupRef} className="absolute bottom-full left-1/2 z-20 w-max -translate-x-1/2 transform rounded-lg bg-gray-700 px-3 py-2 text-center text-xs font-medium text-white shadow-sm dark:bg-gray-900 ml-7 mb-4">
                Tip: Hold {seekKey} + Click on text to jump to its timestamp.
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-gray-700 dark:border-t-gray-900" />
              </div>
            )}
          </div>

          <div onMouseDown={handleMouseDownOnScrubber} ref={progressBarRef} className="group relative h-2 w-full cursor-pointer rounded-full bg-gray-200 dark:bg-gray-600">
            <div className="pointer-events-none h-full rounded-full bg-cyan-900 transition-all dark:bg-[#F05623]" style={{ width: `${(currentTime / duration) * 100 || 0}%` }} />
            <div className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md transition-opacity group-hover:opacity-100 dark:bg-gray-200 ${isSeeking ? 'opacity-100' : 'opacity-0'}`} style={{ left: `${(currentTime / duration) * 100 || 0}%`, transform: 'translate(-50%, -50%)' }} />
          </div>

          <span className="w-12 shrink-0 font-mono text-sm">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="transition-colors hover:text-[#F05623]" title={isMuted ? "Unmute" : "Mute"}>
            {isMuted || volume === 0 ? <FaVolumeMute size={22} /> : <FaVolumeUp size={22} />}
          </button>
          <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="h-1 w-20 cursor-pointer appearance-none rounded-lg bg-gray-300 dark:bg-gray-700" style={{ background: `linear-gradient(to right, #1D3C87 ${volume * 100}%, #d1d5db ${volume * 100}%)` }} />
        </div>

        <button onClick={toggleLoop} className={`transition-colors hover:text-[#F05623] ${isLooping ? 'text-[#F05623]' : ''}`} title="Loop">
          <TiArrowLoop size={26} />
        </button>

        <div className="group relative pb-2">
          <button onClick={cyclePlaybackRate} className="h-8 w-12 rounded-md bg-gray-200 font-semibold text-sm transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
            {`${Number(playbackRate).toFixed(2).replace(/\.?0+$/, '')}x`}
          </button>
          <div onMouseLeave={() => setIsCustomSpeedInputVisible(false)} className={`pointer-events-none absolute bottom-full left-1/2 z-10 ${isCustomSpeedInputVisible ? 'w-26' : 'w-16'} -translate-x-1/2 rounded-md bg-white p-1 shadow-lg opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600`}>
            {isCustomSpeedInputVisible ? (
              <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsCustomSpeedInputVisible(false)} className="rounded-sm p-1 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600" title="Back">
                    <FaArrowLeft size={12} />
                  </button>
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      step="0.05" 
                      min="0.25" 
                      max="4.0" 
                      value={customPlaybackRate} 
                      onChange={(e) => setCustomPlaybackRate(e.target.value)} 
                      autoFocus 
                      onKeyDown={(e) => e.key === 'Enter' && handleSetCustomSpeed()} 
                      className="w-full rounded-md bg-gray-100 p-1 pr-5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-cyan-900 dark:bg-gray-800 dark:focus:ring-[#F05623] hide-number-arrows"
                    />
                    <div className="absolute right-0 top-0 mr-1 flex h-full flex-col items-center justify-center">
                      <button 
                        onClick={() => setCustomPlaybackRate(rate => (Math.min(4.0, parseFloat(rate) + 0.05)).toFixed(2))}
                        className="h-1/2 rounded-tr-sm px-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 4.86l-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/></svg>
                      </button>
                      <button 
                        onClick={() => setCustomPlaybackRate(rate => (Math.max(0.25, parseFloat(rate) - 0.05)).toFixed(2))}
                        className="h-1/2 rounded-br-sm px-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={handleSetCustomSpeed} className="w-full rounded-md bg-cyan-800 py-1 text-xs font-bold text-white hover:bg-cyan-700 dark:bg-[#F05623] dark:hover:bg-orange-700">Set</button>
              </div>
            ) : (
              <>
                {playbackRates.map(rate => (
                  <button key={rate} onClick={() => handlePlaybackRateChange(rate)} className={`w-full rounded-md px-3 py-1 text-sm ${playbackRate === rate ? 'bg-cyan-900 text-white dark:bg-[#F05623]' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    {rate}x
                  </button>
                ))}
                <hr className="my-1 border-gray-300 dark:border-gray-600" />
                <button onClick={() => { setCustomPlaybackRate(playbackRate.toString()); setIsCustomSpeedInputVisible(true); }} className="w-full rounded-md px-2 py-1 text-left text-xs text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600">
                  Custom
                </button>
              </>
            )}
          </div>
        </div>

        <button onClick={() => setIsPlayerHidden(true)} className="rounded-full p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" title="Hide Player">
          <FaChevronDown />
        </button>
      </div>
    </div>
  );
});

export default AudioPlayer;
