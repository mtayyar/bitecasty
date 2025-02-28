import { Link } from 'react-router-dom'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-white shadow dark:bg-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="text-xl font-bold text-blue-600">
              BiteCasty
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Share and discover audio content
            </p>
          </div>
          
          <div className="flex space-x-6">
            <Link to="/about" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              About
            </Link>
            <Link to="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Privacy
            </Link>
            <Link to="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Terms
            </Link>
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          &copy; {currentYear} BiteCasty. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer 