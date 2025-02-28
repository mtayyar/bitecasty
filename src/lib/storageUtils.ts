import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload an audio file to Supabase storage
 * @param audioFile The audio file to upload
 * @param userId The ID of the user uploading the file
 * @returns The URL of the uploaded file
 */
export const uploadAudioFile = async (audioFile: Blob, userId: string): Promise<string> => {
  try {
    // Generate a unique filename
    const fileExt = audioFile.type.split('/')[1] || 'mp3';
    const fileName = `${userId}_${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload the file to the 'audio' bucket
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(filePath, audioFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: audioFile.type,
      });
    
    if (error) {
      throw error;
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading audio file:', error);
    throw new Error('Failed to upload audio file');
  }
};

/**
 * Upload an image file to Supabase storage
 * @param imageFile The image file to upload
 * @param userId The ID of the user uploading the file
 * @returns The URL of the uploaded file
 */
export const uploadImageFile = async (imageFile: File, userId: string): Promise<string> => {
  try {
    // Generate a unique filename
    const fileExt = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `${userId}_${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload the file to the 'images' bucket
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: imageFile.type,
      });
    
    if (error) {
      throw error;
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image file:', error);
    throw new Error('Failed to upload image file');
  }
};

/**
 * Delete a file from Supabase storage
 * @param url The URL of the file to delete
 * @param bucket The storage bucket ('audio' or 'images')
 */
export const deleteFile = async (url: string, bucket: 'audio' | 'images'): Promise<void> => {
  try {
    // Extract the file path from the URL
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    const filePath = pathSegments[pathSegments.length - 1];
    
    // Delete the file
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(`Error deleting file from ${bucket}:`, error);
    throw new Error(`Failed to delete file from ${bucket}`);
  }
};

/**
 * Upload an audio comment to Supabase storage
 * @param audioFile The audio file to upload
 * @param userId The ID of the user uploading the file
 * @returns The URL of the uploaded file
 */
export const uploadAudioComment = async (audioFile: Blob, userId: string): Promise<string> => {
  try {
    console.log('Starting audio comment upload process...');
    
    // Generate a unique filename
    const fileExt = audioFile.type.split('/')[1] || 'mp3';
    const fileName = `comment_${userId}_${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    console.log('Generated file path:', filePath);
    console.log('File type:', audioFile.type);
    console.log('File size:', audioFile.size, 'bytes');
    
    // Check if the audio-comments bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      throw new Error(`Cannot access storage buckets: ${bucketsError.message}`);
    }
    
    if (!buckets || buckets.length === 0) {
      console.error('No storage buckets found!');
      throw new Error('No storage buckets found. Storage may not be properly configured.');
    }
    
    console.log('Available buckets:', buckets.map(b => b.name).join(', '));
    
    // Try to upload directly without checking if the bucket exists
    // This is because sometimes the bucket might exist but not be visible in the list
    console.log('Attempting to upload to audio-comments bucket...');
    
    try {
      // Upload the file to the 'audio-comments' bucket
      const { data, error } = await supabase.storage
        .from('audio-comments')
        .upload(filePath, audioFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: audioFile.type,
        });
      
      if (error) {
        console.error('Error uploading to storage:', error);
        
        // If the bucket doesn't exist, try to create it
        if (error.message.includes('bucket') || error.message.includes('not found')) {
          console.log('Bucket may not exist, attempting to create it...');
          
          // Try to create the bucket
          const { error: createError } = await supabase.storage.createBucket('audio-comments', {
            public: true,
            fileSizeLimit: 50 * 1024 * 1024, // 50MB limit for audio files
          });
          
          if (createError) {
            console.error('Failed to create bucket:', createError);
            throw new Error(`The audio-comments storage bucket does not exist and could not be created: ${createError.message}`);
          }
          
          console.log('Successfully created audio-comments bucket, retrying upload...');
          
          // Retry the upload
          const { data: retryData, error: retryError } = await supabase.storage
            .from('audio-comments')
            .upload(filePath, audioFile, {
              cacheControl: '3600',
              upsert: false,
              contentType: audioFile.type,
            });
          
          if (retryError) {
            console.error('Error on retry upload:', retryError);
            throw new Error(`Storage upload failed after bucket creation: ${retryError.message}`);
          }
          
          if (!retryData) {
            console.error('Retry upload succeeded but no data returned');
            throw new Error('Upload succeeded but no data was returned from the server');
          }
        } else {
          throw new Error(`Storage upload failed: ${error.message}`);
        }
      }
      
      console.log('File uploaded successfully, getting public URL...');
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('audio-comments')
        .getPublicUrl(filePath);
      
      if (!urlData || !urlData.publicUrl) {
        console.error('Failed to get public URL, urlData:', urlData);
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      console.log('Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (uploadError: any) {
      console.error('Error during upload process:', uploadError);
      throw uploadError;
    }
  } catch (error: any) {
    console.error('Error uploading audio comment:', error);
    throw new Error(`Failed to upload audio comment: ${error.message || 'Unknown error'}`);
  }
}; 