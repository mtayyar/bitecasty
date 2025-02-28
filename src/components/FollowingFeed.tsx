import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { AudioPlayer } from './AudioPlayer';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface AudioPost {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  image_url: string;
  duration: number;
  created_at: string;
  user_id: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

export function FollowingFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<AudioPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    async function fetchFollowingPosts() {
      try {
        setLoading(true);
        
        // First, get the IDs of users that the current user follows
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user?.id || '');
          
        if (followingError) throw followingError;
        
        if (!followingData || followingData.length === 0) {
          setLoading(false);
          return;
        }
        
        const followingIds = followingData.map(follow => follow.following_id);
        
        // Then, get posts from those users
        const { data: postsData, error: postsError } = await supabase
          .from('audio_posts')
          .select(`
            *,
            user:user_id (
              username,
              avatar_url
            )
          `)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false });
          
        if (postsError) throw postsError;
        
        setPosts(postsData || []);
        setDataLoaded(true);
      } catch (error) {
        console.error('Error fetching following posts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFollowingPosts();
  }, [user]);

  // Auto-play first audio when data is loaded
  useEffect(() => {
    if (dataLoaded && posts.length > 0) {
      // Short delay to ensure the audio element is fully initialized
      const timer = setTimeout(() => {
        setIsPlaying(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [dataLoaded, posts]);

  const handlePlayNext = () => {
    if (currentPostIndex < posts.length - 1) {
      setCurrentPostIndex(currentPostIndex + 1);
      setIsPlaying(true);
    } else {
      // Loop back to the first post if at the end
      setCurrentPostIndex(0);
      setIsPlaying(true);
    }
  };

  const handlePlayPrevious = () => {
    if (currentPostIndex > 0) {
      setCurrentPostIndex(currentPostIndex - 1);
      setIsPlaying(true);
    } else {
      // Go to the last post if at the beginning
      setCurrentPostIndex(posts.length - 1);
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    handlePlayNext();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading your feed...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-semibold mb-2">Your feed is empty</h2>
        <p className="mb-4">Follow some users to see their audio posts here.</p>
      </div>
    );
  }

  const currentPost = posts[currentPostIndex];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Following Feed</h1>
      
      {/* Current playing post */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Now Playing</h2>
        <Card className="overflow-hidden">
          {currentPost.image_url && (
            <div className="relative aspect-video w-full overflow-hidden">
              <img 
                src={currentPost.image_url} 
                alt={currentPost.title} 
                className="object-cover w-full h-full"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle>{currentPost.title}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <img 
                src={currentPost.user.avatar_url || '/default-avatar.png'} 
                alt={currentPost.user.username} 
                className="w-6 h-6 rounded-full"
              />
              <span>{currentPost.user.username}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{currentPost.description}</p>
            <AudioPlayer 
              audioUrl={currentPost.audio_url}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onEnded={handleEnded}
              ref={audioRef}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handlePlayPrevious} variant="outline" size="sm">
              Previous
            </Button>
            <Button onClick={handlePlayNext} variant="outline" size="sm">
              Next
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Playlist */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Up Next</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            index !== currentPostIndex && (
              <Card 
                key={post.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  index === currentPostIndex ? 'border-primary' : ''
                }`}
                onClick={() => {
                  setCurrentPostIndex(index);
                  setIsPlaying(true);
                }}
              >
                {post.image_url && (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <img 
                      src={post.image_url} 
                      alt={post.title} 
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base">{post.title}</CardTitle>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <img 
                      src={post.user.avatar_url || '/default-avatar.png'} 
                      alt={post.user.username} 
                      className="w-5 h-5 rounded-full"
                    />
                    <span>{post.user.username}</span>
                  </div>
                </CardHeader>
              </Card>
            )
          ))}
        </div>
      </div>
    </div>
  );
} 