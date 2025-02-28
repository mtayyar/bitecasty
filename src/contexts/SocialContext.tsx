import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface SocialContextType {
  likes: Record<string, boolean>;
  follows: Record<string, boolean>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isLiked: (postId: string) => boolean;
  isFollowing: (userId: string) => boolean;
  getLikesCount: (postId: string) => Promise<number>;
  getFollowersCount: (userId: string) => Promise<number>;
  getFollowingCount: (userId: string) => Promise<number>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [follows, setFollows] = useState<Record<string, boolean>>({});

  console.log('SocialProvider rendering, user:', user ? `User exists: ${user.id}` : 'No user');

  // Fetch user's likes when they log in
  useEffect(() => {
    console.log('SocialProvider user effect triggered, user:', user ? `User exists: ${user.id}` : 'No user');
    if (user) {
      fetchUserLikes();
      fetchUserFollows();
    } else {
      // Clear state when user logs out
      console.log('User logged out, clearing social state');
      setLikes({});
      setFollows({});
    }
  }, [user]);

  const fetchUserLikes = async () => {
    if (!user) {
      console.log('fetchUserLikes: No user, skipping');
      return;
    }

    try {
      console.log('Fetching likes for user:', user.id);
      
      // First check if the post_likes table exists
      const { data: tableExists, error: tableError } = await supabase
        .from('post_likes')
        .select('count(*)', { count: 'exact', head: true });
      
      if (tableError) {
        console.error('Error checking post_likes table:', tableError);
        
        // Try the likes table instead
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id);
        
        if (likesError) {
          console.error('Error fetching from likes table:', likesError);
          return;
        }
        
        const newLikes: Record<string, boolean> = {};
        likesData?.forEach(like => {
          newLikes[like.post_id] = true;
        });
        
        console.log('Fetched likes from likes table:', likesData?.length, 'likes');
        setLikes(newLikes);
        return;
      }
      
      // If post_likes table exists, use it
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user likes:', error);
        return;
      }

      const newLikes: Record<string, boolean> = {};
      data?.forEach(like => {
        newLikes[like.post_id] = true;
      });

      console.log('Fetched likes from post_likes table:', data?.length, 'likes');
      setLikes(newLikes);
    } catch (error) {
      console.error('Error fetching user likes:', error);
    }
  };

  const fetchUserFollows = async () => {
    if (!user) {
      console.log('fetchUserFollows: No user, skipping');
      return;
    }

    try {
      console.log('Fetching follows for user:', user.id);
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) {
        console.error('Error fetching user follows:', error);
        throw error;
      }

      const newFollows: Record<string, boolean> = {};
      data?.forEach(follow => {
        newFollows[follow.following_id] = true;
      });

      console.log('Fetched follows:', data?.length, 'follows');
      setFollows(newFollows);
    } catch (error) {
      console.error('Error fetching user follows:', error);
    }
  };

  const likePost = async (postId: string) => {
    if (!user) return;
    
    // Check if already liked
    if (likes[postId]) {
      console.log('Post already liked');
      return;
    }

    try {
      // Optimistically update UI
      setLikes(prev => ({ ...prev, [postId]: true }));
      
      console.log('Liking post:', postId);

      // First try to insert into post_likes table
      const { error: postLikesError } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });

      if (postLikesError) {
        console.error('Error inserting into post_likes:', postLikesError);
        
        // Try the likes table instead
        const { error: likesError } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id });
        
        if (likesError) {
          console.error('Error inserting into likes table:', likesError);
          // Revert on error
          setLikes(prev => ({ ...prev, [postId]: false }));
          return;
        }
      }

      // Count the actual number of likes in the database
      const { count, error: countError } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (countError) {
        console.error('Error counting likes in post_likes:', countError);
        
        // Try counting in the likes table instead
        const { count: likesCount, error: likesCountError } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);
        
        if (likesCountError) {
          console.error('Error counting likes in likes table:', likesCountError);
        } else {
          // Update the likes_count in the audio_posts table with the accurate count
          console.log('Updating likes count to actual count:', likesCount);
          
          const { error: updateError } = await supabase
            .from('audio_posts')
            .update({ likes_count: likesCount })
            .eq('id', postId);

          if (updateError) {
            console.error('Error setting likes count:', updateError);
          } else {
            console.log('Successfully updated likes count to actual count');
          }
        }
      } else {
        // Update the likes_count in the audio_posts table with the accurate count
        console.log('Updating likes count to actual count:', count);
        
        const { error: updateError } = await supabase
          .from('audio_posts')
          .update({ likes_count: count })
          .eq('id', postId);

        if (updateError) {
          console.error('Error setting likes count:', updateError);
        } else {
          console.log('Successfully updated likes count to actual count');
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on error
      setLikes(prev => ({ ...prev, [postId]: false }));
    }
  };

  const unlikePost = async (postId: string) => {
    if (!user) return;
    
    // Check if not liked
    if (!likes[postId]) {
      console.log('Post not liked');
      return;
    }

    try {
      // Optimistically update UI
      setLikes(prev => ({ ...prev, [postId]: false }));
      
      console.log('Unliking post:', postId);

      // First try to delete from post_likes table
      const { error: postLikesError } = await supabase
        .from('post_likes')
        .delete()
        .match({ post_id: postId, user_id: user.id });

      if (postLikesError) {
        console.error('Error deleting from post_likes:', postLikesError);
        
        // Try the likes table instead
        const { error: likesError } = await supabase
          .from('likes')
          .delete()
          .match({ post_id: postId, user_id: user.id });
        
        if (likesError) {
          console.error('Error deleting from likes table:', likesError);
          // Revert on error
          setLikes(prev => ({ ...prev, [postId]: true }));
          return;
        }
      }

      // Count the actual number of likes in the database
      const { count, error: countError } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (countError) {
        console.error('Error counting likes in post_likes:', countError);
        
        // Try counting in the likes table instead
        const { count: likesCount, error: likesCountError } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);
        
        if (likesCountError) {
          console.error('Error counting likes in likes table:', likesCountError);
        } else {
          // Update the likes_count in the audio_posts table with the accurate count
          console.log('Updating likes count to actual count:', likesCount);
          
          const { error: updateError } = await supabase
            .from('audio_posts')
            .update({ likes_count: likesCount })
            .eq('id', postId);

          if (updateError) {
            console.error('Error setting likes count:', updateError);
          } else {
            console.log('Successfully updated likes count to actual count');
          }
        }
      } else {
        // Update the likes_count in the audio_posts table with the accurate count
        console.log('Updating likes count to actual count:', count);
        
        const { error: updateError } = await supabase
          .from('audio_posts')
          .update({ likes_count: count })
          .eq('id', postId);

        if (updateError) {
          console.error('Error setting likes count:', updateError);
        } else {
          console.log('Successfully updated likes count to actual count');
        }
      }
    } catch (error) {
      console.error('Error unliking post:', error);
      // Revert on error
      setLikes(prev => ({ ...prev, [postId]: true }));
    }
  };

  const followUser = async (userId: string) => {
    if (!user || user.id === userId) return;

    try {
      // Optimistically update UI
      setFollows(prev => ({ ...prev, [userId]: true }));

      // Insert the follow relationship
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });

      if (error) {
        // Revert on error
        setFollows(prev => ({ ...prev, [userId]: false }));
        throw error;
      }

      // Update followers count for the target user
      const { data: targetUserData, error: targetUserError } = await supabase
        .from('users')
        .select('followers_count')
        .eq('id', userId)
        .single();

      if (targetUserError) {
        console.error('Error fetching target user data:', targetUserError);
      } else {
        const currentFollowersCount = targetUserData.followers_count || 0;
        const newFollowersCount = currentFollowersCount + 1;
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ followers_count: newFollowersCount })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating followers count:', updateError);
        } else {
          console.log(`Updated followers count for user ${userId} to ${newFollowersCount}`);
        }
      }

      // Update following count for the current user
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('following_count')
        .eq('id', user.id)
        .single();

      if (currentUserError) {
        console.error('Error fetching current user data:', currentUserError);
      } else {
        const currentFollowingCount = currentUserData.following_count || 0;
        const newFollowingCount = currentFollowingCount + 1;
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ following_count: newFollowingCount })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating following count:', updateError);
        } else {
          console.log(`Updated following count for user ${user.id} to ${newFollowingCount}`);
        }
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const unfollowUser = async (userId: string) => {
    if (!user) return;

    try {
      // Optimistically update UI
      setFollows(prev => ({ ...prev, [userId]: false }));

      // Delete the follow relationship
      const { error } = await supabase
        .from('follows')
        .delete()
        .match({ follower_id: user.id, following_id: userId });

      if (error) {
        // Revert on error
        setFollows(prev => ({ ...prev, [userId]: true }));
        throw error;
      }

      // Update followers count for the target user
      const { data: targetUserData, error: targetUserError } = await supabase
        .from('users')
        .select('followers_count')
        .eq('id', userId)
        .single();

      if (targetUserError) {
        console.error('Error fetching target user data:', targetUserError);
      } else {
        const currentFollowersCount = targetUserData.followers_count || 0;
        const newFollowersCount = Math.max(0, currentFollowersCount - 1); // Ensure count doesn't go below 0
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ followers_count: newFollowersCount })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating followers count:', updateError);
        } else {
          console.log(`Updated followers count for user ${userId} to ${newFollowersCount}`);
        }
      }

      // Update following count for the current user
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('following_count')
        .eq('id', user.id)
        .single();

      if (currentUserError) {
        console.error('Error fetching current user data:', currentUserError);
      } else {
        const currentFollowingCount = currentUserData.following_count || 0;
        const newFollowingCount = Math.max(0, currentFollowingCount - 1); // Ensure count doesn't go below 0
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ following_count: newFollowingCount })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating following count:', updateError);
        } else {
          console.log(`Updated following count for user ${user.id} to ${newFollowingCount}`);
        }
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const isLiked = (postId: string) => {
    const result = !!likes[postId];
    console.log(`isLiked check for post ${postId}: ${result}`);
    return result;
  };

  const isFollowing = (userId: string) => {
    const result = !!follows[userId];
    console.log(`isFollowing check for user ${userId}: ${result}`);
    return result;
  };

  const getLikesCount = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('audio_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      if (error) throw error;
      return data?.likes_count || 0;
    } catch (error) {
      console.error('Error getting likes count:', error);
      return 0;
    }
  };

  const getFollowersCount = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('followers_count')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.followers_count || 0;
    } catch (error) {
      console.error('Error getting followers count:', error);
      return 0;
    }
  };

  const getFollowingCount = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('following_count')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.following_count || 0;
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  };

  const value = {
    likes,
    follows,
    likePost,
    unlikePost,
    followUser,
    unfollowUser,
    isLiked,
    isFollowing,
    getLikesCount,
    getFollowersCount,
    getFollowingCount,
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (context === undefined) {
    console.error('useSocial must be used within a SocialProvider');
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
} 