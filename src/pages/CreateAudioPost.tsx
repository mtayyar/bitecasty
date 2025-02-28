import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { uploadAudioFile, uploadImageFile } from '../lib/storageUtils';
import AudioRecorder from '../components/AudioRecorder';
import ImageUploader from '../components/ImageUploader';

const CreateAudioPost = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get the current user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // Redirect to login if not authenticated
        navigate('/login');
      }
    };
    
    getUserId();
  }, [navigate]);
  
  const handleAudioCaptured = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
  };
  
  const handleImageCaptured = (file: File) => {
    setImageFile(file);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('You must be logged in to create a post');
      return;
    }
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!audioBlob) {
      setError('Audio is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Upload audio file
      const audioUrl = await uploadAudioFile(audioBlob, userId);
      
      // Upload image file (if provided)
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImageFile(imageFile, userId);
      }
      
      // Create the audio post in the database
      const { data: postData, error: postError } = await supabase
        .from('audio_posts')
        .insert([
          {
            user_id: userId,
            title,
            description: description.trim() || null,
            audio_url: audioUrl,
            image_url: imageUrl,
            duration: audioDuration,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();
      
      if (postError) {
        throw postError;
      }
      
      // Redirect to the home page or the new post
      navigate('/');
      
    } catch (error: any) {
      console.error('Error creating audio post:', error);
      setError(error.message || 'Failed to create audio post');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create Audio Post</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input w-full"
            placeholder="Give your audio post a title"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full h-24"
            placeholder="Add a description for your audio post"
          />
        </div>
        
        <AudioRecorder onAudioCaptured={handleAudioCaptured} maxDuration={60} />
        
        <ImageUploader onImageCaptured={handleImageCaptured} />
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || !audioBlob}
            className="btn btn-primary w-full"
          >
            {loading ? 'Creating...' : 'Create Audio Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAudioPost; 