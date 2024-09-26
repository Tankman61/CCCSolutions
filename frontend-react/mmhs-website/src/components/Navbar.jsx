import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImage from '../assets/mmhs_logo.png';

const Navbar = () => {
  const location = useLocation(); // Get current location

  return (
    <nav className="bg-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <img src={logoImage} className="h-[46px] w-auto mr-3" />
          <span className="text-xl font-medium">Milliken Mills High School</span>
        </div>
        <div className="relative">
          <ul className="flex space-x-8 text-lg">
            <li>
              <Link
                to="/"
                className={`hover:text-blue-400 transition-colors duration-300`}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className={`hover:text-blue-400 transition-colors duration-300`}
              >
                About
              </Link>
            </li>
            <li>
              <Link
                to="/solutions"
                className={`hover:text-blue-400 transition-colors duration-300`}
              >
                Solutions
              </Link>
            </li>
            <li>
              <Link
                to="/forum"
                className={`hover:text-blue-400 transition-colors duration-300`}
              >
                Forum
              </Link>
            </li>
            <li>
              <Link
                to="/resources"
                className={`hover:text-blue-400 transition-colors duration-300`}
              >
                Resources
              </Link>
            </li>
          </ul>

          
          <div className="absolute h-[2px] bg-blue-500 transition-all duration-300" style={{
            left: `${location.pathname === '/' ? '0%' : location.pathname === '/about' ? '20%' : location.pathname === '/solutions' ? '40%' : location.pathname === '/forum' ? '60%' : '80%'}`,
            width: '50px', // Set a fixed width for the active indicator
            bottom: '-5px', // Position the bar below the text
              transform: 'translateX(-50%)', // Center the indicator
          }} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
