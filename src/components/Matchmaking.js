import React from 'react';

const challengers = [
  {
    id: 1,
    name: 'Ryu',
    avatar: 'https://i.imgur.com/8Km9tLL.png',
    bio: 'The wandering world warrior.',
  },
  {
    id: 2,
    name: 'Chun-Li',
    avatar: 'https://i.imgur.com/K1z0Aot.png',
    bio: 'The strongest woman in the world.',
  },
];

const Matchmaking = () => {
  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl text-white font-bold mb-8">Matchmaking</h1>
      <div className="w-full max-w-sm">
        {challengers.map((challenger) => (
          <div key={challenger.id} className="bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
            <div className="flex items-center">
              <img src={challenger.avatar} alt="avatar" className="w-24 h-24 rounded-full border-4 border-purple-500" />
              <div className="ml-6">
                <h2 className="text-2xl font-bold text-white">{challenger.name}</h2>
                <p className="text-gray-400">{challenger.bio}</p>
              </div>
            </div>
            <div className="flex justify-around mt-6">
              <button className="bg-red-500 text-white font-bold py-2 px-4 rounded-full">Pass</button>
              <button className="bg-green-500 text-white font-bold py-2 px-4 rounded-full">Challenge</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Matchmaking;