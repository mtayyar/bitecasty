import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function DebugPosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawResponse, setRawResponse] = useState<any>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        
        // Now fetch the actual posts
        const response = await supabase
          .from('audio_posts')
          .select(`
            *,
            user:user_id (
              id,
              username,
              avatar_url
            )
          `)
          .limit(5);
          
        setRawResponse(response);
        
        if (response.error) {
          setError(`Error fetching posts: ${response.error.message}`);
          return;
        }
        
        setPosts(response.data || []);
      } catch (err) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPosts();
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2 className="text-lg font-bold">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Posts</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Raw Response</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
          {JSON.stringify(rawResponse, null, 2)}
        </pre>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Posts ({posts.length})</h2>
        {posts.length === 0 ? (
          <p>No posts found</p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="border rounded p-4">
                <h3 className="font-bold">{post.title}</h3>
                <p className="text-sm text-gray-600">ID: {post.id}</p>
                <p>Description: {post.description || 'None'}</p>
                <p>Audio URL: {post.audio_url}</p>
                <p>Image URL: {post.image_url || 'None'}</p>
                <p>User: {post.user?.username || 'Unknown'}</p>
                <p>Created: {new Date(post.created_at).toLocaleString()}</p>
                <div className="mt-2">
                  <p className="font-semibold">All fields:</p>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(post, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 