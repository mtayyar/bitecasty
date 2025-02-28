import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onAudioCaptured: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // in seconds
}

const AudioRecorder = ({ onAudioCaptured, maxDuration = 60 }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
        setAudioBlob(audioBlob);
        
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Pass the audio blob and duration to the parent component
        onAudioCaptured(audioBlob, recordingTime);
        
        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
        
        // Stop recording if max duration is reached
        if (seconds >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access your microphone. Please check permissions and try again.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if file is an audio file
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file');
      return;
    }
    
    // Create a new audio element to check duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    
    audio.onloadedmetadata = () => {
      // Check if audio is within the max duration
      if (audio.duration > maxDuration) {
        alert(`Audio file must be ${maxDuration} seconds or less`);
        URL.revokeObjectURL(audio.src);
        return;
      }
      
      setUploadedFile(file);
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setRecordingTime(Math.round(audio.duration));
      
      // Pass the audio blob and duration to the parent component
      onAudioCaptured(file, Math.round(audio.duration));
    };
    
    audio.onerror = () => {
      alert('Error loading audio file');
      URL.revokeObjectURL(audio.src);
    };
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle audio play/pause events
  useEffect(() => {
    if (audioRef.current) {
      const handleEnded = () => setIsPlaying(false);
      audioRef.current.addEventListener('ended', handleEnded);
      
      return () => {
        audioRef.current?.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioUrl]);
  
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Audio Recording</h3>
      
      {!audioBlob ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-full ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            
            {isRecording && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                <span>{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-300 dark:border-gray-700 pt-3">
            <p className="text-sm mb-2">Or upload an audio file:</p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePlayPause}
              className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <span>{formatTime(recordingTime)}</span>
            
            <button
              onClick={() => {
                setAudioBlob(null);
                setAudioUrl(null);
                setUploadedFile(null);
                setRecordingTime(0);
              }}
              className="px-4 py-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white"
            >
              Reset
            </button>
          </div>
          
          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} className="hidden" />
          )}
          
          <div className="text-sm text-gray-500">
            {uploadedFile ? `File: ${uploadedFile.name}` : 'Recording captured'}
          </div>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        Maximum duration: {formatTime(maxDuration)}
      </div>
    </div>
  );
};

export default AudioRecorder; 