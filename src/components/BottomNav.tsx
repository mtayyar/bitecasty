import { Link, useLocation } from 'react-router-dom'
import { Home, PlusSquare, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const BottomNav = () => {
  const location = useLocation()
  const { user } = useAuth()
  
  const isActive = (path: string) => {
    return location.pathname === path
  }
  
  if (!user) return null
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black text-white shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        <Link 
          to="/home" 
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/home') ? 'text-primary' : 'text-gray-400'}`}
        >
          <Home size={24} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link 
          to="/create" 
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/create') ? 'text-primary' : 'text-gray-400'}`}
        >
          <PlusSquare size={24} />
          <span className="text-xs mt-1">Create</span>
        </Link>
        
        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/profile') ? 'text-primary' : 'text-gray-400'}`}
        >
          <User size={24} />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </div>
  )
}

export default BottomNav 