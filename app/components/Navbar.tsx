import React from 'react'
import { Link, useNavigate } from 'react-router'
import { usePuterStore } from '~/lib/puter'

const Navbar = () => {
  const { auth } = usePuterStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth');
  };

  return (
    <nav className='navbar'>
        <Link to='/'>
            <p className='text-2xl font-bold text-gradient'>Resumind</p>
        </Link>
        <div className='flex items-center gap-4'>
          <Link to='/upload' className='primary-button w-fit'>
              Upload Resume
          </Link>

          {auth.isAuthenticated && (
            <button
              className='primary-button w-fit'
              onClick={handleLogout}
            >
              Log Out
            </button>
          )}
        </div>
    </nav>
  )
}

export default Navbar