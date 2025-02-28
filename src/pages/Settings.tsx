import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { User, ArrowLeft, Upload } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        setProfile(data);
        if (data.avatar_url) {
          setAvatarPreview(data.avatar_url);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user, navigate]);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    setAvatarFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) return;
    
    try {
      setSaving(true);
      setFormError(null);
      
      // Validate username (required)
      if (!profile.username || profile.username.trim() === '') {
        setFormError('Username is required');
        setSaving(false);
        return;
      }
      
      // Check if username is already taken (if changed)
      if (profile.username !== user.user_metadata.username) {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('username', profile.username)
          .neq('id', user.id)
          .single();
          
        if (!checkError && existingUser) {
          setFormError('Username is already taken');
          setSaving(false);
          return;
        }
      }
      
      // Upload avatar if changed
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, avatarFile);
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
          
        avatarUrl = urlData.publicUrl;
      }
      
      // Update profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: profile.username,
          full_name: profile.full_name || null,
          bio: profile.bio || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      // Navigate back to profile
      navigate('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormError('Failed to update profile. Please try again.');
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
  
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
        <p className="mb-4">Unable to load your profile information.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
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
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>
      
      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {formError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt={profile.username} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <User size={40} className="text-gray-400" />
                </div>
              )}
            </div>
            <label 
              htmlFor="avatar-upload" 
              className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer"
            >
              <Upload size={16} />
            </label>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarChange} 
              className="hidden"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">Tap to change profile photo</p>
        </div>
        
        {/* Username */}
        <div className="mb-4">
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <Input
            id="username"
            name="username"
            value={profile.username}
            onChange={handleInputChange}
            required
          />
        </div>
        
        {/* Full Name */}
        <div className="mb-4">
          <label htmlFor="full_name" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <Input
            id="full_name"
            name="full_name"
            value={profile.full_name || ''}
            onChange={handleInputChange}
          />
        </div>
        
        {/* Bio */}
        <div className="mb-6">
          <label htmlFor="bio" className="block text-sm font-medium mb-1">
            Bio
          </label>
          <Textarea
            id="bio"
            name="bio"
            value={profile.bio || ''}
            onChange={handleInputChange}
            rows={4}
            placeholder="Tell others about yourself..."
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
};

export default Settings; 