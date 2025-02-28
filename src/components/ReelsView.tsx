import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSocial } from '../contexts/SocialContext';
import { Button } from './ui/button';
import { Heart, MessageCircle, Share2, User, Home, Search, Plus, MessageSquare, X, Play, Pause, ListMusic, ChevronUp, ChevronDown } from 'lucide-react';
import { AudioComment } from './AudioComment';
import { AudioPost } from '../types';
import AudioPlayer from './AudioPlayer';
import LikeButton from './LikeButton';
import CommentButton from './CommentButton';
import ShareButton from './ShareButton';
import UserAvatar from './UserAvatar';
import FollowButton from './FollowButton';
import AudioVisualizer from './AudioVisualizer';
import { formatDistanceToNow } from 'date-fns';

// Add CSS to hide scrollbar
const scrollbarHiddenStyles = `
  /* Hide scrollbar for Chrome, Safari and Opera */
  ::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
`;

interface AudioPost {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  image_url?: string;
  duration: number;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count?: number;
  isProcessing?: boolean;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    followers_count: number;
    isFollowProcessing?: boolean;
  };
}

export function ReelsView() {
  const { user } = useAuth();
  const { isLiked, likePost, unlikePost, isFollowing, followUser, unfollowUser } = useSocial();
  const [posts, setPosts] = useState<AudioPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [showSequentialPlayback, setShowSequentialPlayback] = useState(false);
  const postsContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const swipeThreshold = 50; // Minimum distance for a swipe

  console.log('ReelsView component rendering, user:', user ? `User exists: ${user.id}` : 'No user');
  console.log('Social context:', { 
    isLiked: typeof isLiked === 'function' ? 'Function exists' : 'Missing', 
    likePost: typeof likePost === 'function' ? 'Function exists' : 'Missing',
    isFollowing: typeof isFollowing === 'function' ? 'Function exists' : 'Missing'
  });

  // Check Supabase connection
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        console.log('Checking Supabase connection...');
        // Simple query to check if we can connect
        const { data, error } = await supabase.from('users').select('count', { count: 'exact' }).limit(0);
        
        if (error) {
          console.error('Supabase connection error:', error);
          setSupabaseConnected(false);
          setError(`Failed to connect to Supabase: ${error.message}`);
        } else {
          console.log('Successfully connected to Supabase!');
          setSupabaseConnected(true);
        }
      } catch (error) {
        console.error('Unexpected error testing Supabase connection:', error);
        setSupabaseConnected(false);
        setError(`Unexpected error connecting to Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    checkSupabaseConnection();
  }, []);

  // Add style element to document head
  useEffect(() => {
    try {
      console.log('Adding scrollbar hidden styles');
      const styleElement = document.createElement('style');
      styleElement.innerHTML = scrollbarHiddenStyles;
      document.head.appendChild(styleElement);
      
      return () => {
        document.head.removeChild(styleElement);
      };
    } catch (error) {
      console.error('Error adding scrollbar styles:', error);
    }
  }, []);

  // Handle auto-play when current post changes
  useEffect(() => {
    if (posts.length === 0) return;
    
    console.log('Auto-play effect triggered, isPlaying:', isPlaying, 'currentPostIndex:', currentPostIndex);
    
    // Store the current audio element to avoid race conditions
    const currentAudio = audioRef.current;
    
    // Short delay to ensure the audio element is updated
    const timer = setTimeout(() => {
      try {
        if (currentAudio && isPlaying) {
          console.log('Attempting to play audio');
          
          // Reset the audio first
          currentAudio.pause();
          currentAudio.currentTime = 0;
          
          // Then play it
          const playPromise = currentAudio.play();
          
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Error playing audio:', error);
              // If autoplay is prevented, update the UI state
              setIsPlaying(false);
            });
          }
        }
      } catch (error) {
        console.error('Error in auto-play effect:', error);
        setIsPlaying(false);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentPostIndex, isPlaying, posts]);

  const handlePlayPause = () => {
    console.log('Play/Pause clicked, current state:', isPlaying);
    
    if (!audioRef.current) {
      console.log('No audio element found');
      return;
    }
    
    if (isPlaying) {
      console.log('Pausing audio');
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      console.log('Playing audio');
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    }
  };

  // Fetch posts
  useEffect(() => {
    console.log('Fetch posts effect triggered');
    if (supabaseConnected === false) {
      console.log('Skipping fetch posts because Supabase is not connected');
      return;
    }
    
    if (supabaseConnected === null) {
      console.log('Waiting for Supabase connection check...');
      return;
    }
    
    fetchPosts();
  }, [user, supabaseConnected]);

  const fetchPosts = async () => {
    try {
      console.log('Fetching posts...');
      setLoading(true);
      setError(null);
      
      if (!user) {
        console.log('No user found, fetching posts for non-authenticated user');
      } else {
        console.log('Fetching posts for user:', user.id);
      }
      
      let postsData: any[] = [];
      
      // Get all posts
      try {
        const { data: allPosts, error: postsError } = await supabase
          .from('audio_posts')
          .select(`
            *,
            user:user_id(*),
            likes_count,
            comments_count
          `)
          .order('created_at', { ascending: false });
        
        if (postsError) {
          console.error('Error fetching all posts with comments_count:', postsError);
          console.log('Trying without comments_count...');
          
          // Try again without comments_count
          const { data: retryPosts, error: retryError } = await supabase
            .from('audio_posts')
            .select(`
              *,
              user:user_id(*),
              likes_count
            `)
            .order('created_at', { ascending: false });
          
          if (retryError) {
            console.error('Error fetching all posts without comments_count:', retryError);
            throw new Error(`Error fetching all posts: ${retryError.message}`);
          }
          
          postsData = retryPosts || [];
        } else {
          postsData = allPosts || [];
        }
      } catch (innerError) {
        console.error('Inner error fetching all posts:', innerError);
        throw innerError;
      }
      
      console.log(`Fetched ${postsData.length} posts:`, postsData);
      
      // Check if posts have the expected structure
      if (postsData.length > 0) {
        const samplePost = postsData[0];
        console.log('Sample post structure:', {
          id: samplePost.id ? 'exists' : 'missing',
          title: samplePost.title ? 'exists' : 'missing',
          audio_url: samplePost.audio_url ? 'exists' : 'missing',
          user: samplePost.user ? 'exists' : 'missing',
          user_details: samplePost.user ? {
            id: samplePost.user.id ? 'exists' : 'missing',
            username: samplePost.user.username ? 'exists' : 'missing'
          } : 'N/A'
        });
      }
      
      // Process posts to add isProcessing flag
      const processedPosts = postsData.map(post => {
        // Check if post.user exists before accessing its properties
        if (!post.user) {
          console.error('Post is missing user data:', post);
          // Create a placeholder user object
          post.user = {
            id: post.user_id || 'unknown',
            username: 'Unknown User',
            avatar_url: null
          };
        }
        
        return {
          ...post,
          isProcessing: false,
          // Ensure comments_count is at least 0 if null or undefined
          comments_count: post.comments_count || 0,
          user: {
            ...post.user,
            isFollowProcessing: false
          }
        };
      });
      
      console.log('Processed posts:', processedPosts);
      setPosts(processedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      let errorMessage = 'Failed to load posts';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage += `: ${JSON.stringify(error)}`;
      } else {
        errorMessage += ': Unknown error';
      }
      
      console.error('Detailed error message:', errorMessage);
      setError(errorMessage);
      
      // Set empty posts array to avoid undefined errors
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Set up intersection observer to detect which post is in view
  useEffect(() => {
    if (posts.length === 0) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create a new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index !== currentPostIndex) {
              setCurrentPostIndex(index);
              setIsPlaying(true);
            }
          }
        });
      },
      { 
        threshold: 0.5, // 50% of the element must be visible
        rootMargin: "0px" 
      }
    );

    // Observe all post elements
    postRefs.current.forEach((ref) => {
      if (ref) observerRef.current?.observe(ref);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [posts, currentPostIndex]);

  const handleEnded = () => {
    // Move to the next post when audio ends
    if (currentPostIndex < posts.length - 1) {
      setCurrentPostIndex(currentPostIndex + 1);
      
      // Scroll to the next post
      postRefs.current[currentPostIndex + 1]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'start'
      });
      
      setIsPlaying(true);
    }
  };

  const handleLikeToggle = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!user) return;
    
    // Find the post in the local state
    const postIndex = posts.findIndex(post => post.id === postId);
    if (postIndex === -1) return;
    
    // Check if the post is already liked by this user
    const alreadyLiked = isLiked(postId);
    
    // If already processing a like/unlike action, return to prevent multiple clicks
    if (posts[postIndex].isProcessing) return;
    
    console.log('Toggle like for post:', postId, 'Current like status:', alreadyLiked);
    
    // Create a copy of the posts array
    const updatedPosts = [...posts];
    
    // Mark this post as processing to prevent multiple clicks
    updatedPosts[postIndex] = {
      ...updatedPosts[postIndex],
      isProcessing: true
    };
    setPosts(updatedPosts);
    
    try {
      if (alreadyLiked) {
        // User already liked the post, so unlike it
        console.log('Unliking post:', postId);
        
        // Call the API to unlike the post - this will update the database
        await unlikePost(postId);
        
        // Don't update the local count here, as it will be updated by the API call
      } else {
        // User hasn't liked the post yet, so like it
        console.log('Liking post:', postId);
        
        // Call the API to like the post - this will update the database
        await likePost(postId);
        
        // Don't update the local count here, as it will be updated by the API call
      }
      
      // Wait a moment for the database to update
      setTimeout(async () => {
        try {
          // Fetch the updated post data from the database
          const { data: updatedPost, error: postError } = await supabase
            .from('audio_posts')
            .select('likes_count')
            .eq('id', postId)
            .single();
          
          if (postError) {
            console.error('Error fetching updated post:', postError);
            return;
          }
          
          console.log('Updated post from database:', updatedPost);
          
          // Update the post in the local state with the accurate likes count
          const refreshedPosts = [...posts];
          const currentPostIndex = refreshedPosts.findIndex(post => post.id === postId);
          if (currentPostIndex !== -1) {
            refreshedPosts[currentPostIndex] = {
              ...refreshedPosts[currentPostIndex],
              likes_count: updatedPost.likes_count,
              isProcessing: false
            };
            setPosts(refreshedPosts);
          }
        } catch (error) {
          console.error('Error refreshing post data:', error);
        }
      }, 500); // Wait 500ms for the database to update
      
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Reset processing state in case of error
      const resetPosts = [...posts];
      const currentPostIndex = resetPosts.findIndex(post => post.id === postId);
      if (currentPostIndex !== -1) {
        resetPosts[currentPostIndex] = {
          ...resetPosts[currentPostIndex],
          isProcessing: false
        };
        setPosts(resetPosts);
      }
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!user || user.id === userId) return;
    
    // Find the post with this user
    const postIndex = posts.findIndex(post => post.user.id === userId);
    if (postIndex === -1) return;
    
    // Check if already following
    const alreadyFollowing = isFollowing(userId);
    
    // If already processing a follow/unfollow action, return to prevent multiple clicks
    if (posts[postIndex].user.isFollowProcessing) return;
    
    console.log('Toggle follow for user:', userId, 'Current follow status:', alreadyFollowing);
    
    // Create a copy of the posts array and mark this user as processing
    const updatedPosts = [...posts];
    for (let i = 0; i < updatedPosts.length; i++) {
      if (updatedPosts[i].user.id === userId) {
        updatedPosts[i] = {
          ...updatedPosts[i],
          user: {
            ...updatedPosts[i].user,
            isFollowProcessing: true
          }
        };
      }
    }
    setPosts(updatedPosts);
    
    try {
      if (alreadyFollowing) {
        // User is already following, so unfollow
        console.log('Unfollowing user:', userId);
        await unfollowUser(userId);
      } else {
        // User is not following yet, so follow
        console.log('Following user:', userId);
        await followUser(userId);
      }
      
      // Wait a moment for the database to update
      setTimeout(async () => {
        try {
          // Fetch the updated user data from the database
          const { data: updatedUser, error: userError } = await supabase
            .from('users')
            .select('followers_count')
            .eq('id', userId)
            .single();
          
          if (userError) {
            console.error('Error fetching updated user:', userError);
            return;
          }
          
          console.log('Updated user from database:', updatedUser);
          
          // Update all posts by this user with the new followers count
          const refreshedPosts = [...posts];
          for (let i = 0; i < refreshedPosts.length; i++) {
            if (refreshedPosts[i].user.id === userId) {
              refreshedPosts[i] = {
                ...refreshedPosts[i],
                user: {
                  ...refreshedPosts[i].user,
                  followers_count: updatedUser.followers_count,
                  isFollowProcessing: false
                }
              };
            }
          }
          setPosts(refreshedPosts);
        } catch (error) {
          console.error('Error refreshing user data:', error);
          
          // Reset processing state in case of error
          const resetPosts = [...posts];
          for (let i = 0; i < resetPosts.length; i++) {
            if (resetPosts[i].user.id === userId) {
              resetPosts[i] = {
                ...resetPosts[i],
                user: {
                  ...resetPosts[i].user,
                  isFollowProcessing: false
                }
              };
            }
          }
          setPosts(resetPosts);
        }
      }, 500); // Wait 500ms for the database to update
      
    } catch (error) {
      console.error('Error toggling follow:', error);
      
      // Reset processing state in case of error
      const resetPosts = [...posts];
      for (let i = 0; i < resetPosts.length; i++) {
        if (resetPosts[i].user.id === userId) {
          resetPosts[i] = {
            ...resetPosts[i],
            user: {
              ...resetPosts[i].user,
              isFollowProcessing: false
            }
          };
        }
      }
      setPosts(resetPosts);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format like count with K for thousands
  const formatCount = (count: number = 0) => {
    if (count === undefined || count === null) return '0';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const handleCommentToggle = (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
      setShowSequentialPlayback(false);
    } else {
      setActiveCommentPostId(postId);
      setShowSequentialPlayback(false);
    }
  };
  
  const handleSequentialPlaybackToggle = (postId: string) => {
    if (activeCommentPostId === postId && showSequentialPlayback) {
      // Already showing sequential playback for this post, just close it
      setActiveCommentPostId(null);
      setShowSequentialPlayback(false);
    } else {
      // Open comments with sequential playback enabled
      setActiveCommentPostId(postId);
      setShowSequentialPlayback(true);
    }
  };
  
  const handleCommentAdded = () => {
    // Refresh the posts to update the comments count
    fetchPosts();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
    const touchDiff = touchStartY.current && touchEndY.current ? touchEndY.current - touchStartY.current : 0;
    if (Math.abs(touchDiff) > swipeThreshold) {
      if (touchDiff > 0) {
        handlePlayPause();
      } else {
        handlePlayPause();
      }
    }
  };

  // Render
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <div className="flex space-x-4 mt-4">
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchPosts();
            }} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Retry
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="mb-4">No posts found.</p>
          {user && (
            <Link to="/create" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
              Create your first post
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black">
      {/* Content */}
      <div 
        ref={postsContainerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {posts.map((post, index) => (
          <div
            key={post.id}
            ref={(el) => (postRefs.current[index] = el)}
            data-index={index}
            className="relative w-full h-full snap-start snap-always"
            onClick={handlePlayPause}
          >
            {/* Background image */}
            <div className="absolute inset-0 bg-black">
              {post.image_url ? (
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black" />
              )}
              {/* Overlay gradient for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/50" />
            </div>

            {/* Right side controls */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-4">
              {/* Profile */}
              <div className="flex flex-col items-center">
                <Link 
                  to={`/profile/${post.user.id}`} 
                  className="relative" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden border-2 border-white">
                    {post.user.avatar_url ? (
                      <img
                        src={post.user.avatar_url}
                        alt={post.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary text-white">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                </Link>
                {user && user.id !== post.user.id && !isFollowing(post.user.id) && (
                  <button 
                    className={`w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center absolute -bottom-2 left-1/2 transform -translate-x-1/2 shadow-md ${
                      post.user.isFollowProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowToggle(e, post.user.id);
                    }}
                    disabled={post.user.isFollowProcessing}
                  >
                    {post.user.isFollowProcessing ? (
                      <span className="animate-pulse">•</span>
                    ) : (
                      <Plus size={14} />
                    )}
                  </button>
                )}
              </div>

              {/* Like button */}
              <div className="flex flex-col items-center">
                <Button
                  onClick={(e) => handleLikeToggle(e, post.id)}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-transparent"
                  disabled={!user}
                >
                  {isLiked(post.id) ? (
                    <Heart
                      size={30}
                      fill="#ef4444"
                      className="text-red-500"
                    />
                  ) : (
                    <Heart
                      size={30}
                      className="text-white"
                    />
                  )}
                </Button>
                <span className="text-white text-xs mt-1">{formatCount(post.likes_count)}</span>
              </div>

              {/* Comment button */}
              <div className="flex flex-col items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCommentToggle(post.id);
                  }}
                  className={`p-3 rounded-full ${
                    activeCommentPostId === post.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-white'
                  }`}
                >
                  <MessageCircle size={24} />
                </button>
                <span className="text-white text-xs mt-1">
                  {formatCount(post.comments_count || 0)}
                </span>
              </div>

              {/* Sequential playback button */}
              {(post.comments_count || 0) > 1 && (
                <div className="flex flex-col items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSequentialPlaybackToggle(post.id);
                    }}
                    className={`p-3 rounded-full ${
                      activeCommentPostId === post.id && showSequentialPlayback
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-800 text-white'
                    }`}
                    title="Play all comments"
                  >
                    <ListMusic size={24} />
                  </button>
                  <span className="text-white text-xs mt-1">Play All</span>
                </div>
              )}

              {/* Share */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share2 size={30} />
                </Button>
                <span className="text-white text-xs mt-1">0</span>
              </div>
            </div>

            {/* Bottom caption area */}
            <div className="absolute bottom-20 left-4 right-20 z-20 text-white">
              <div className="flex items-center mb-2">
                <span className="font-bold text-lg">@{post.user.username}</span>
                {user && user.id !== post.user.id && (
                  <button
                    className={`ml-2 px-2 py-0.5 text-xs rounded-md ${
                      isFollowing(post.user.id)
                        ? 'bg-gray-700 text-white'
                        : 'bg-transparent border border-white text-white'
                    } ${post.user.isFollowProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={(e) => handleFollowToggle(e, post.user.id)}
                    disabled={post.user.isFollowProcessing}
                  >
                    {post.user.isFollowProcessing ? (
                      <span className="inline-block animate-pulse">•••</span>
                    ) : isFollowing(post.user.id) ? (
                      'Following'
                    ) : (
                      'Follow'
                    )}
                  </button>
                )}
              </div>
              <p className="text-sm mb-3">{post.description || post.title}</p>
            </div>

            {/* Play/Pause indicator (centered) */}
            {!isPlaying && currentPostIndex === index && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="bg-black/30 rounded-full p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </div>
            )}

            {/* Hidden audio element */}
            {currentPostIndex === index && (
              <audio
                key={`audio-${post.id}-${currentPostIndex}`}
                ref={audioRef}
                src={post.audio_url}
                onEnded={() => {
                  setIsPlaying(false);
                  handleEnded();
                }}
                className="hidden"
                preload="auto"
              />
            )}

            {/* Comments panel */}
            {activeCommentPostId === post.id && (
              <div className="absolute inset-0 bg-black bg-opacity-90 z-20 overflow-y-auto">
                <div className="max-w-lg mx-auto py-4 px-2">
                  <button
                    onClick={() => {
                      setActiveCommentPostId(null);
                      setShowSequentialPlayback(false);
                    }}
                    className="mb-4 text-white hover:text-gray-300"
                  >
                    ← Back to post
                  </button>
                  
                  <AudioComment 
                    postId={post.id} 
                    onCommentAdded={handleCommentAdded}
                    autoPlayAll={showSequentialPlayback}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 