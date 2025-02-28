import { Outlet } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import OfflineNotification from './OfflineNotification'
import InstallPWA from './InstallPWA'
import Navbar from './Navbar'
import BottomNav from './BottomNav'

interface LayoutProps {
  session: Session | null
}

const Layout = ({ session }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar session={session} />
      <main className="flex-grow container mx-auto px-4 py-8 pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <OfflineNotification />
      <InstallPWA />
    </div>
  )
}

export default Layout 