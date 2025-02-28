import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSocial } from '../contexts/SocialContext';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, Mail, Share, Edit, Plus, Grid, Bookmark, Lock, Heart, MoreVertical, Trash2, LogOut, ArrowLeft } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  likes_count?: number;
}

interface AudioPost {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  image_url?: string;
  duration: number;
  created_at: string;
  user_id: string;
  likes_count?: number;
}

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isFollowing, followUser, unfollowUser } = useSocial();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<AudioPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [currentPlayingPost, setCurrentPlayingPost] = useState<string | null>(null);
  const [showPostOptions, setShowPostOptions] = useState<string | null>(null);
  
  const isOwnProfile = user && (id === user.id || !id);
  const profileId = id || (user ? user.id : '');

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', profileId)
          .single();
          
        if (userError) throw userError;
        
        // Get following count
        const { count: followingCount, error: followingError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileId);
          
        if (followingError) throw followingError;
        
        // Get total likes received on posts
        const { data: postsData, error: postsError } = await supabase
          .from('audio_posts')
          .select('id, likes_count')
          .eq('user_id', profileId);
          
        if (postsError) throw postsError;
        
        const totalLikes = postsData?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0;
        
        setProfile({
          ...userData,
          following_count: followingCount || 0,
          likes_count: totalLikes
        });
        
        // Fetch user posts
        const { data: userPosts, error: userPostsError } = await supabase
          .from('audio_posts')
          .select('*')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false });
          
        if (userPostsError) throw userPostsError;
        
        setPosts(userPosts || []);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [profileId]);

  const handleFollowToggle = async () => {
    if (!user || !profile) return;
    
    if (isFollowing(profile.id)) {
      await unfollowUser(profile.id);
    } else {
      await followUser(profile.id);
    }
    
    // Refresh profile to update followers count
    const { data, error } = await supabase
      .from('users')
      .select('followers_count')
      .eq('id', profile.id)
      .single();
      
    if (!error && data && profile) {
      setProfile({
        ...profile,
        followers_count: data.followers_count
      });
    }
  };

  const handlePlayPost = (postId: string) => {
    setCurrentPlayingPost(postId === currentPlayingPost ? null : postId);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const { error } = await supabase
        .from('audio_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      // Remove post from state
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const handleEditPost = (postId: string) => {
    navigate(`/edit-post/${postId}`);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl font-semibold mb-2">User not found</h2>
        <p className="mb-4">The user you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Back button */}
      <div className="px-4 pt-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="mb-2"
        >
          <ArrowLeft size={24} />
        </Button>
      </div>
      
      {/* Profile header */}
      <div className="flex flex-col items-center pt-4 px-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.username} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <User size={40} className="text-gray-400" />
              </div>
            )}
          </div>
          {isOwnProfile && (
            <button 
              className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1"
              onClick={() => navigate('/settings')}
            >
              <Plus size={20} />
            </button>
          )}
        </div>
        
        {/* Username */}
        <h1 className="text-xl font-bold mt-3">@{profile.username}</h1>
        
        {/* Stats */}
        <div className="flex justify-center w-full mt-4 space-x-8">
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg">{profile.following_count?.toLocaleString() || 0}</span>
            <span className="text-gray-500 text-sm">Following</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg">{profile.followers_count?.toLocaleString() || 0}</span>
            <span className="text-gray-500 text-sm">Followers</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg">{profile.likes_count?.toLocaleString() || 0}</span>
            <span className="text-gray-500 text-sm">Likes</span>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex w-full mt-4 space-x-2">
          {isOwnProfile ? (
            <>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/settings')}
              >
                <Edit size={16} className="mr-2" /> Edit profile
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
              >
                <Share size={16} className="mr-2" /> Share profile
              </Button>
              <Button 
                variant="outline" 
                className="flex-none"
                onClick={handleSignOut}
              >
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant={isFollowing(profile.id) ? "outline" : "default"}
                className="flex-1"
                onClick={handleFollowToggle}
              >
                {isFollowing(profile.id) ? 'Following' : 'Follow'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
              >
                <Mail size={16} className="mr-2" /> Message
              </Button>
              <Button 
                variant="outline" 
                size="icon"
              >
                <Share size={16} />
              </Button>
            </>
          )}
        </div>
        
        {/* Bio */}
        {profile.bio ? (
          <p className="mt-4 text-center">{profile.bio}</p>
        ) : isOwnProfile ? (
          <Button 
            variant="ghost" 
            className="mt-4 text-gray-500"
            onClick={() => navigate('/settings')}
          >
            + Add bio
          </Button>
        ) : null}
      </div>
      
      {/* Content tabs */}
      <Tabs defaultValue="posts" className="mt-6" onValueChange={setActiveTab}>
        <TabsList className="w-full flex justify-around border-b border-gray-200 bg-transparent">
          <TabsTrigger value="posts" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none">
            <Grid size={20} />
          </TabsTrigger>
          <TabsTrigger value="liked" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none">
            <Heart size={20} />
          </TabsTrigger>
          <TabsTrigger value="private" className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-black rounded-none">
            <Lock size={20} />
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="mt-2">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <User size={40} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No posts yet</h3>
              <p className="text-gray-500 text-center mb-4">
                {isOwnProfile 
                  ? "When you create posts, they'll appear here."
                  : "This user hasn't posted any audio yet."}
              </p>
              {isOwnProfile && (
                <Link to="/create">
                  <Button>Create your first post</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map(post => (
                <div 
                  key={post.id}
                  className="aspect-square relative overflow-hidden"
                >
                  <div 
                    className="w-full h-full bg-gray-200 cursor-pointer"
                    onClick={() => handlePlayPost(post.id)}
                  >
                    {post.image_url ? (
                      <img 
                        src={post.image_url} 
                        alt={post.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                      </div>
                    )}
                    
                    {/* Play indicator */}
                    {currentPlayingPost === post.id && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                          <span className="text-xl">▶️</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute bottom-1 left-1 flex items-center text-white text-xs">
                    <Heart size={12} className="mr-1" fill="white" />
                    <span>{post.likes_count || 0}</span>
                  </div>
                  
                  {/* Edit options for own posts */}
                  {isOwnProfile && (
                    <div className="absolute top-1 right-1">
                      <button 
                        className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPostOptions(showPostOptions === post.id ? null : post.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {/* Options dropdown */}
                      {showPostOptions === post.id && (
                        <div className="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-md overflow-hidden z-10">
                          <button 
                            className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPost(post.id);
                            }}
                          >
                            <Edit size={14} className="mr-2" />
                            Edit
                          </button>
                          <button 
                            className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(post.id);
                            }}
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="liked" className="mt-2">
          {isOwnProfile ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <Heart size={40} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Liked posts</h3>
              <p className="text-gray-500 text-center">
                Posts you've liked will appear here
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <Lock size={40} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">This user's liked posts are private</h3>
              <p className="text-gray-500 text-center">
                Posts liked by {profile.username} are currently hidden
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="private" className="mt-2">
          {isOwnProfile ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <Lock size={40} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Private posts</h3>
              <p className="text-gray-500 text-center">
                Posts you've marked as private will appear here
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <Lock size={40} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Private content</h3>
              <p className="text-gray-500 text-center">
                This tab is only visible to the account owner
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Audio player for current post */}
      {currentPlayingPost && (
        <div className="fixed bottom-20 left-0 right-0 bg-white shadow-lg p-4 z-10">
          {posts.filter(post => post.id === currentPlayingPost).map(post => (
            <div key={post.id} className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 mr-3 flex-shrink-0">
                {post.image_url ? (
                  <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <span>🎵</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{post.title}</h4>
                <p className="text-xs text-gray-500 truncate">{post.description}</p>
              </div>
              <audio 
                src={post.audio_url} 
                controls 
                autoPlay 
                className="w-full absolute left-0 bottom-0 opacity-0 pointer-events-none"
                onEnded={() => setCurrentPlayingPost(null)}
              />
              <button 
                className="ml-3 p-2"
                onClick={() => setCurrentPlayingPost(null)}
              >
                Close
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Profile; 