import React from 'react';

const Header = ({ setPage }) => {
  return (
    <header className="bg-gray-800 text-white p-4 flex justify-around fixed top-0 w-full z-10">
      <button onClick={() => setPage('feed')} className="hover:text-purple-400">Feed</button>
      <button onClick={() => setPage('matchmaking')} className="hover:text-purple-400">Matchmaking</button>
      <button onClick={() => setPage('profile')} className="hover:text-purple-400">Profile</button>
    </header>
  );
};

export default Header;