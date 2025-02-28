import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FollowButton } from './FollowButton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface UserProfileProps {
  userId: string;
}

interface UserData {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  created_at: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        
        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (userError) throw userError;
        
        // Fetch follower count
        const { count: followerCount, error: followerError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);
          
        if (followerError) throw followerError;
        
        // Fetch following count
        const { count: followingCount, error: followingError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId);
          
        if (followingError) throw followingError;
        
        // Fetch post count
        const { count: postCount, error: postError } = await supabase
          .from('audio_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
          
        if (postError) throw postError;
        
        setUserData(userData);
        setFollowerCount(followerCount || 0);
        setFollowingCount(followingCount || 0);
        setPostCount(postCount || 0);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [userId]);

  const handleFollowChange = (isFollowing: boolean) => {
    // Update follower count when follow status changes
    setFollowerCount(prevCount => isFollowing ? prevCount + 1 : prevCount - 1);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading user profile...</div>;
  }

  if (!userData) {
    return <div className="p-4 text-center">User not found</div>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-primary h-32"></div>
      <div className="px-6 pb-6">
        <div className="flex justify-between items-end -mt-16 mb-4">
          <div className="relative">
            <img
              src={userData.avatar_url || '/default-avatar.png'}
              alt={userData.username}
              className="w-32 h-32 rounded-full border-4 border-background bg-background"
            />
          </div>
          <FollowButton userId={userId} onFollowChange={handleFollowChange} />
        </div>
        
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl">{userData.username}</CardTitle>
        </CardHeader>
        
        <CardContent className="px-0">
          {userData.bio && (
            <p className="text-gray-700 mb-4">{userData.bio}</p>
          )}
          
          <div className="flex space-x-6 text-sm">
            <div>
              <span className="font-bold">{postCount}</span> posts
            </div>
            <div>
              <span className="font-bold">{followerCount}</span> followers
            </div>
            <div>
              <span className="font-bold">{followingCount}</span> following
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 