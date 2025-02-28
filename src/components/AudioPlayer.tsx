import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

interface AudioPlayerProps {
  audioUrl: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onEnded: () => void;
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  ({ audioUrl, isPlaying, onPlayPause, onEnded }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);

    // Expose the audio element ref to parent components
    useImperativeHandle(ref, () => audioRef.current as HTMLAudioElement);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', onEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', onEnded);
      };
    }, [onEnded]);

    useEffect(() => {
      if (audioRef.current) {
        if (isPlaying) {
          // Request audio focus for background playback
          if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => {
              audioRef.current?.play();
              onPlayPause();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
              audioRef.current?.pause();
              onPlayPause();
            });
            navigator.mediaSession.setActionHandler('nexttrack', onEnded);
          }
          
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Error playing audio:', error);
              // If autoplay was prevented, we need to update the UI
              if (error.name === 'NotAllowedError') {
                onPlayPause(); // Toggle back to paused state in the UI
              }
            });
          }
        } else {
          audioRef.current.pause();
        }
      }
    }, [isPlaying, onPlayPause]);

    // When audioUrl changes, reset the player and load the new audio
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        
        // Set up media session metadata for the lock screen
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'BiteCasty Audio',
            artist: 'BiteCasty User',
            album: 'BiteCasty',
            artwork: [
              { src: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' }
            ]
          });
        }
        
        if (isPlaying) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Error playing audio:', error);
              if (error.name === 'NotAllowedError') {
                onPlayPause(); // Toggle back to paused state in the UI
              }
            });
          }
        }
      }
    }, [audioUrl, isPlaying, onPlayPause]);

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleSliderChange = (value: number[]) => {
      if (audioRef.current) {
        audioRef.current.currentTime = value[0];
        setCurrentTime(value[0]);
      }
    };

    return (
      <div className="mt-4 space-y-2">
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          preload="metadata"
          playsInline 
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5"
          x5-video-player-fullscreen="true"
          x5-video-orientation="portraint"
        />
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={onPlayPause} 
            variant="outline" 
            size="sm"
            className="w-10 h-10 p-0 flex items-center justify-center"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </Button>
          
          <span className="text-sm w-16">{formatTime(currentTime)}</span>
          
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSliderChange}
            className="flex-1"
          />
          
          <span className="text-sm w-16 text-right">{formatTime(duration)}</span>
        </div>
      </div>
    );
  }
); 