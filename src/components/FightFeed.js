import React from 'react';

const fightFeedData = [
  {
    id: 1,
    user: 'Fighter1',
    avatar: 'https://i.imgur.com/8Km9tLL.png',
    image: 'https://i.imgur.com/qZaM3t2.jpeg',
    caption: 'Just won a tough match!',
  },
  {
    id: 2,
    user: 'Warrior22',
    avatar: 'https://i.imgur.com/K1z0Aot.png',
    image: 'https://i.imgur.com/vH4Yh2F.jpeg',
    caption: 'Training hard for the next tournament.',
  },
];

const FightFeed = () => {
  return (
    <div className="h-screen bg-black flex flex-col items-center snap-y snap-mandatory overflow-y-scroll">
      {fightFeedData.map((item) => (
        <div key={item.id} className="w-full h-screen flex-shrink-0 snap-start flex items-center justify-center relative">
          <img src={item.image} alt="fight-feed" className="h-full w-full object-cover" />
          <div className="absolute bottom-0 left-0 p-4 text-white bg-black bg-opacity-50 w-full">
            <div className="flex items-center">
              <img src={item.avatar} alt="avatar" className="w-12 h-12 rounded-full border-2 border-white" />
              <div className="ml-4">
                <h3 className="font-bold">{item.user}</h3>
                <p>{item.caption}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FightFeed;