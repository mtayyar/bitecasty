import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { uploadAudioComment } from '../lib/storageUtils';
import { Mic, Square, Play, Pause, Trash2, Send, User, ListMusic, X, Volume2 } from 'lucide-react';

interface AudioCommentProps {
  postId: string;
  onCommentAdded: () => void;
  autoPlayAll?: boolean;
}

interface AudioCommentData {
  id: string;
  audio_url: string;
  duration: number;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export function AudioComment({ postId, onCommentAdded, autoPlayAll = false }: AudioCommentProps) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<AudioCommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsCount, setCommentsCount] = useState(0);
  
  // Sequential playback states
  const [isSequentialPlayback, setIsSequentialPlayback] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [totalPlaybackDuration, setTotalPlaybackDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const MAX_DURATION = 10; // 10 seconds max
  
  // Sequential playback refs
  const sequentialPlaybackRef = useRef<{active: boolean; index: number}>({ active: false, index: -1 });
  
  // Fetch comments when component mounts
  useEffect(() => {
    fetchComments();
  }, [postId]);
  
  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Get comments for this post
      const { data: commentsData, error: commentsError } = await supabase
        .from('audio_comments')
        .select(`
          id,
          audio_url,
          duration,
          created_at,
          user_id,
          users:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      
      if (commentsError) {
        throw commentsError;
      }
      
      // Format the comments data
      const formattedComments = commentsData.map((comment: any) => ({
        id: comment.id,
        audio_url: comment.audio_url,
        duration: comment.duration,
        created_at: comment.created_at,
        user: {
          id: comment.users?.id,
          username: comment.users?.username,
          avatar_url: comment.users?.avatar_url
        }
      }));
      
      setComments(formattedComments);
      setCommentsCount(formattedComments.length);
      
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
    if (!user) {
      alert('You must be logged in to comment');
      return;
    }
    
    // Stop sequential playback if it's active
    if (isSequentialPlayback) {
      stopSequentialPlayback();
    }
    
    // Stop any playing audio
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
    });
    
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
        if (seconds >= MAX_DURATION) {
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
  
  // Calculate total duration of all comments
  useEffect(() => {
    if (comments.length > 0) {
      const total = comments.reduce((sum, comment) => sum + comment.duration, 0);
      setTotalPlaybackDuration(total);
    }
  }, [comments]);
  
  // Update sequentialPlaybackRef when state changes
  useEffect(() => {
    sequentialPlaybackRef.current = { active: isSequentialPlayback, index: currentPlayingIndex };
  }, [isSequentialPlayback, currentPlayingIndex]);
  
  // Track playback progress
  useEffect(() => {
    let progressInterval: number | null = null;
    
    if (isSequentialPlayback && currentPlayingIndex >= 0) {
      // Calculate progress up to current comment
      let progressSoFar = 0;
      for (let i = 0; i < currentPlayingIndex; i++) {
        progressSoFar += comments[i].duration;
      }
      
      // Start tracking progress of current comment
      const audioElement = document.getElementById(`comment-audio-${comments[currentPlayingIndex].id}`) as HTMLAudioElement;
      
      progressInterval = window.setInterval(() => {
        if (audioElement && !audioElement.paused) {
          const currentProgress = progressSoFar + audioElement.currentTime;
          setPlaybackProgress(currentProgress);
        }
      }, 100);
    } else {
      setPlaybackProgress(0);
    }
    
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [isSequentialPlayback, currentPlayingIndex, comments]);
  
  // Scroll to the currently playing comment
  useEffect(() => {
    if (isSequentialPlayback && currentPlayingIndex >= 0) {
      const commentElement = document.getElementById(`comment-item-${comments[currentPlayingIndex].id}`);
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentPlayingIndex, isSequentialPlayback, comments]);
  
  // Handle sequential playback
  const startSequentialPlayback = (startIndex: number) => {
    // Stop any currently playing audio
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
    });
    
    setIsSequentialPlayback(true);
    setCurrentPlayingIndex(startIndex);
    
    // Play the first comment
    const audioElement = document.getElementById(`comment-audio-${comments[startIndex].id}`) as HTMLAudioElement;
    if (audioElement) {
      audioElement.play().catch(err => {
        console.error('Error starting playback:', err);
        stopSequentialPlayback();
      });
    }
  };
  
  const stopSequentialPlayback = () => {
    setIsSequentialPlayback(false);
    setCurrentPlayingIndex(-1);
    setPlaybackProgress(0);
    
    // Pause all audio
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
    });
  };
  
  // Handle when a comment audio ends during sequential playback
  const handleCommentEnded = (index: number) => {
    // Check if we're still in sequential mode (might have been cancelled)
    if (sequentialPlaybackRef.current.active && sequentialPlaybackRef.current.index === index) {
      // Move to the next comment if available
      if (index < comments.length - 1) {
        const nextIndex = index + 1;
        setCurrentPlayingIndex(nextIndex);
        
        // Play the next comment after a short delay
        setTimeout(() => {
          if (sequentialPlaybackRef.current.active) { // Double-check we're still in sequential mode
            const audioElement = document.getElementById(`comment-audio-${comments[nextIndex].id}`) as HTMLAudioElement;
            if (audioElement) {
              audioElement.play().catch(err => {
                console.error('Error continuing playback:', err);
                stopSequentialPlayback();
              });
            }
          }
        }, 500); // Half-second delay between comments
      } else {
        // End of the playlist
        stopSequentialPlayback();
      }
    }
  };
  
  const handlePlayPause = (url: string, audioElement: HTMLAudioElement | null) => {
    // Stop sequential playback if it's active
    if (isSequentialPlayback) {
      stopSequentialPlayback();
    }
    
    if (audioElement) {
      if (audioElement.paused) {
        // Pause all other audio elements first
        document.querySelectorAll('audio').forEach(audio => {
          if (audio !== audioElement) {
            audio.pause();
          }
        });
        
        audioElement.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      } else {
        audioElement.pause();
      }
    }
  };
  
  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };
  
  const submitComment = async () => {
    if (!user || !audioBlob) {
      console.error('Cannot submit comment: user or audio blob is missing');
      alert('Cannot submit comment: Please make sure you are logged in and have recorded audio.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('Starting comment submission process...');
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      console.log('Audio blob type:', audioBlob.type);
      
      // Check if we've reached the comment limit
      if (commentsCount >= 100) {
        alert('This post has reached the maximum of 100 comments');
        return;
      }
      
      // Check if the audio blob is valid
      if (audioBlob.size === 0) {
        throw new Error('The recorded audio is empty. Please try recording again.');
      }
      
      // Upload the audio file
      console.log('Uploading audio comment to storage...');
      let audioUrl;
      try {
        audioUrl = await uploadAudioComment(audioBlob, user.id);
        console.log('Audio uploaded successfully, URL:', audioUrl);
      } catch (uploadError: any) {
        console.error('Error in uploadAudioComment:', uploadError);
        throw new Error(`Failed to upload audio: ${uploadError.message || 'Unknown error'}`);
      }
      
      if (!audioUrl) {
        throw new Error('Failed to get URL for the uploaded audio file.');
      }
      
      // Create the comment in the database
      console.log('Creating comment record in database...');
      const { data: commentData, error: commentError } = await supabase
        .from('audio_comments')
        .insert([
          {
            audio_url: audioUrl,
            duration: recordingTime,
            user_id: user.id,
            post_id: postId,
          },
        ])
        .select();
      
      if (commentError) {
        console.error('Error inserting comment into database:', commentError);
        throw new Error(`Database error: ${commentError.message || 'Unknown error'}`);
      }
      
      if (!commentData || commentData.length === 0) {
        console.error('No data returned from comment insertion');
        throw new Error('Failed to create comment record in the database.');
      }
      
      console.log('Comment created successfully:', commentData);
      
      // Reset the recording
      resetRecording();
      
      // Refresh comments
      fetchComments();
      
      // Notify parent component
      onCommentAdded();
      
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      alert(`Failed to submit comment: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Format progress for display
  const formatProgress = () => {
    if (totalPlaybackDuration === 0) return '0%';
    const percentage = Math.min(100, Math.round((playbackProgress / totalPlaybackDuration) * 100));
    return `${percentage}%`;
  };
  
  // Start sequential playback automatically if autoPlayAll is true
  useEffect(() => {
    if (autoPlayAll && comments.length > 0 && !isSequentialPlayback) {
      // Use a small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        startSequentialPlayback(0);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoPlayAll, comments.length, isSequentialPlayback]);
  
  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">Audio Comments ({commentsCount}/100)</h3>
        
        {comments.length > 1 && (
          <div>
            {isSequentialPlayback ? (
              <button 
                onClick={stopSequentialPlayback}
                className="flex items-center space-x-1 text-xs bg-red-500 hover:bg-red-600 px-2 py-1 rounded"
              >
                <X size={14} />
                <span>Stop Playback</span>
              </button>
            ) : (
              <button 
                onClick={() => startSequentialPlayback(0)}
                className="flex items-center space-x-1 text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded"
              >
                <ListMusic size={14} />
                <span>Play All</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Sequential playback progress bar */}
      {isSequentialPlayback && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Playing {currentPlayingIndex + 1} of {comments.length}</span>
            <span>{formatTime(Math.floor(playbackProgress))} / {formatTime(Math.floor(totalPlaybackDuration))}</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: formatProgress() }}
            ></div>
          </div>
        </div>
      )}
      
      {user && (
        <div className="mb-4 border-b border-gray-700 pb-4">
          {!audioBlob ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded-full ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                disabled={commentsCount >= 100 || isSequentialPlayback}
                title={isSequentialPlayback ? "Stop playback before recording" : undefined}
              >
                {isRecording ? <Square size={20} /> : <Mic size={20} />}
              </button>
              
              {isRecording && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span>{formatTime(recordingTime)}</span>
                  <span className="ml-2 text-xs text-gray-400">Max: {formatTime(MAX_DURATION)}</span>
                </div>
              )}
              
              {isSequentialPlayback && (
                <span className="text-xs text-yellow-400">Stop playback before recording</span>
              )}
              
              {commentsCount >= 100 && (
                <span className="text-xs text-red-400">Comment limit reached</span>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePlayPause(audioUrl!, audioRef.current)}
                className="p-2 rounded-full bg-blue-500 hover:bg-blue-600"
                disabled={isSequentialPlayback}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <span>{formatTime(recordingTime)}</span>
              
              <button
                onClick={resetRecording}
                className="p-2 rounded-full bg-gray-600 hover:bg-gray-700"
                disabled={isSequentialPlayback}
              >
                <Trash2 size={20} />
              </button>
              
              <button
                onClick={submitComment}
                disabled={isSubmitting || isSequentialPlayback}
                className={`p-2 rounded-full ${
                  isSequentialPlayback 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-green-500 hover:bg-green-600'
                } ml-auto`}
                title={isSequentialPlayback ? "Stop playback before submitting" : undefined}
              >
                <Send size={20} />
              </button>
              
              {isSequentialPlayback && (
                <span className="text-xs text-yellow-400">Stop playback before submitting</span>
              )}
              
              {audioUrl && (
                <audio 
                  ref={audioRef} 
                  src={audioUrl} 
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden" 
                />
              )}
            </div>
          )}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-4">
          <p>Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {comments.map((comment, index) => (
            <div 
              id={`comment-item-${comment.id}`}
              key={comment.id} 
              className={`flex items-start space-x-3 p-2 rounded transition-all duration-200 ${
                currentPlayingIndex === index 
                  ? 'bg-gray-700 border border-blue-500 shadow-lg shadow-blue-500/20' 
                  : 'bg-gray-800'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                {comment.user.avatar_url ? (
                  <img 
                    src={comment.user.avatar_url} 
                    alt={comment.user.username} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={16} />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{comment.user.username}</span>
                  <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                </div>
                
                <div className="mt-2 flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      if (isSequentialPlayback) {
                        stopSequentialPlayback();
                      } else {
                        const audioElement = document.getElementById(`comment-audio-${comment.id}`) as HTMLAudioElement;
                        handlePlayPause(comment.audio_url, audioElement);
                      }
                    }}
                    className={`p-1.5 rounded-full ${
                      currentPlayingIndex === index ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {currentPlayingIndex === index ? <Volume2 size={16} /> : <Play size={16} />}
                  </button>
                  
                  <span className="text-xs">{formatTime(comment.duration)}</span>
                  
                  <button
                    onClick={() => startSequentialPlayback(index)}
                    className="p-1.5 rounded-full bg-gray-700 hover:bg-gray-600 ml-2"
                    title="Play from here"
                  >
                    <ListMusic size={16} />
                  </button>
                  
                  {currentPlayingIndex === index && (
                    <div className="ml-2 flex space-x-1">
                      <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                    </div>
                  )}
                  
                  <audio 
                    id={`comment-audio-${comment.id}`}
                    src={comment.audio_url}
                    onPlay={(e) => e.currentTarget.closest('.flex')?.classList.add('playing')}
                    onPause={(e) => e.currentTarget.closest('.flex')?.classList.remove('playing')}
                    onEnded={(e) => {
                      e.currentTarget.closest('.flex')?.classList.remove('playing');
                      handleCommentEnded(index);
                    }}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 