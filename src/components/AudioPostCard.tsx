import React from 'react'
import { Link } from 'react-router-dom'

type AudioPost = {
  id: string
  title: string
  description: string
  audio_url: string
  image_url: string
  duration: number
  created_at: string
  user_id: string
  user: {
    id: string
    username: string
    avatar_url: string
  }
}

interface AudioPostCardProps {
  post: AudioPost
}

const AudioPostCard: React.FC<AudioPostCardProps> = ({ post }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
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
          <Link to={`/profile/${post.user.id}`} className="hover:underline">
            {post.user.username}
          </Link>
        </p>
        {post.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{post.description}</p>
        )}
      </div>
    </div>
  )
}

export default AudioPostCard 