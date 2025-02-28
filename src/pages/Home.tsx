import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { Database } from '../lib/supabaseClient'
import { ReelsView } from '../components/ReelsView'

// Define the AudioPost type if Database type is not available
type AudioPost = {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  image_url: string;
  duration: number;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

interface HomeProps {
  session: Session | null
}

const Home = ({ session }: HomeProps) => {
  console.log('Home component rendering, session:', session ? 'Session exists' : 'No session');
  
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<AudioPost[]>([])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        console.log('Fetching posts...');
        setLoading(true)
        
        const { data, error } = await supabase
          .from('audio_posts')
          .select(`
            *,
            user:user_id(*)
          `)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching posts:', error);
          throw error
        }
        
        if (data) {
          console.log(`Fetched ${data.length} posts`);
          setPosts(data as any)
        }
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  // If user is logged in, show ReelsView
  if (session) {
    console.log('Rendering logged-in view with ReelsView');
    return (
      <div className="w-full h-full p-0">
        <ReelsView />
      </div>
    );
  }

  // For non-logged in users, show the discover page
  console.log('Rendering non-logged-in view');
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Discover Audio Content</h1>
      
      {loading ? (
        <div className="flex justify-center">
          <p>Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No audio posts found.</p>
          {session && (
            <p className="mt-4">
              <a href="/create" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Create your first audio post</a>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="relative aspect-square bg-gray-200 dark:bg-gray-700">
                {post.image_url ? (
                  <img 
                    src={post.image_url} 
                    alt={post.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <span className="text-4xl text-primary/70">🎵</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 truncate">{post.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {post.user.username}
                </p>
                {post.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{post.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Home 