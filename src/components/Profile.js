import React from 'react';

const Profile = () => {
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col items-center p-8">
      <img
        src="https://i.imgur.com/8Km9tLL.png"
        alt="profile-avatar"
        className="w-32 h-32 rounded-full border-4 border-purple-500"
      />
      <h1 className="text-4xl font-bold mt-4">Fighter1</h1>
      <p className="text-gray-400">Level 10</p>
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-bold">Stats</h2>
        <p>Wins: 25</p>
        <p>Losses: 5</p>
      </div>
    </div>
  );
};

export default Profile;