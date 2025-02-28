import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { uploadImageFile } from '../lib/storageUtils';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import ImageUploader from '../components/ImageUploader';

interface AudioPost {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  image_url?: string;
  duration: number;
  created_at: string;
  user_id: string;
}

const EditPost = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<AudioPost | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    const fetchPost = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('audio_posts')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        // Check if the post belongs to the current user
        if (data.user_id !== user.id) {
          navigate('/profile');
          return;
        }
        
        setPost(data);
        setTitle(data.title);
        setDescription(data.description || '');
        if (data.image_url) {
          setImagePreview(data.image_url);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [id, user, navigate]);
  
  const handleImageCaptured = (file: File) => {
    setImageFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !post) return;
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Upload image file (if changed)
      let imageUrl = post.image_url;
      if (imageFile) {
        imageUrl = await uploadImageFile(imageFile, user.id);
      }
      
      // Update the post in the database
      const { error: updateError } = await supabase
        .from('audio_posts')
        .update({
          title,
          description: description.trim() || null,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)
        .eq('user_id', user.id);
        
      if (updateError) throw updateError;
      
      // Navigate back to profile
      navigate('/profile');
    } catch (error: any) {
      console.error('Error updating post:', error);
      setError(error.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl font-semibold mb-2">Post not found</h2>
        <p className="mb-4">The post you're trying to edit doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/profile')}>Go to Profile</Button>
      </div>
    );
  }
  
  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/profile')}
          className="mr-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold">Edit Post</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Add a description for your audio post"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Cover Image
          </label>
          
          {imagePreview ? (
            <div className="mb-2">
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-100">
                <img 
                  src={imagePreview} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                }}
              >
                Remove Image
              </Button>
            </div>
          ) : (
            <div className="mb-2">
              <ImageUploader onImageCaptured={handleImageCaptured} />
            </div>
          )}
        </div>
        
        <div className="pt-4 flex space-x-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/profile')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
      
      <div className="mt-8 pt-4 border-t">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          <p className="text-sm text-gray-500">This action cannot be undone.</p>
        </div>
        <Button
          variant="destructive"
          className="w-full"
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
              try {
                setSaving(true);
                const { error } = await supabase
                  .from('audio_posts')
                  .delete()
                  .eq('id', post.id)
                  .eq('user_id', user?.id);
                  
                if (error) throw error;
                
                navigate('/profile');
              } catch (error) {
                console.error('Error deleting post:', error);
                setError('Failed to delete post. Please try again.');
                setSaving(false);
              }
            }
          }}
        >
          Delete Post
        </Button>
      </div>
    </div>
  );
};

export default EditPost; 