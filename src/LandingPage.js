
import React from 'react';
import { Link } from 'react-router-dom';
import { Video, Users, ShieldCheck, CheckCircle } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Connect with Your Community
        </h1>
        <p className="text-xl mb-10 max-w-2xl mx-auto">
          The all-in-one platform for gamers, coaches, and esports enthusiasts to connect, share, and grow together.
        </p>
        <div className="flex justify-center gap-4">
          <Link 
            to="/app" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all"
          >
            Try Free
          </Link>
          <button className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all">
            View Demo
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-800/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-900 p-8 rounded-xl text-center">
                <div className="text-blue-500 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Simple Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map(plan => (
              <div key={plan.id} className={`p-8 rounded-xl ${plan.highlight ? 'border-4 border-blue-500 bg-gray-900' : 'bg-gray-800'}`}>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-4xl font-bold mb-4">
                  ${plan.price}
                  <span className="text-gray-400 text-lg">/month</span>
                </p>
                
                <ul className="mb-8 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button 
                  className={`w-full py-3 font-bold rounded-lg ${
                    plan.highlight 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const features = [
  {
    icon: <Video size={48} />,
    title: 'HD Video Calls',
    description: 'Crystal clear video calls with your team or clients'
  },
  {
    icon: <Users size={48} />,
    title: 'Team Collaboration',
    description: 'Private groups and channels for your organization'
  },
  {
    icon: <ShieldCheck size={48} />,
    title: 'Secure & Private',
    description: 'End-to-end encryption for all your communications'
  }
];

const plans = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    features: [
      'Basic video calling',
      '1GB storage',
      'Public groups',
      'Basic analytics'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Coach',
    price: 19,
    highlight: true,
    features: [
      'HD video calling',
      '10GB storage',
      'Private groups',
      'Client management',
      'Advanced analytics'
    ]
  },
  {
    id: 'enterprise',
    name: 'Organization',
    price: 49,
    features: [
      'Unlimited HD calls',
      '100GB storage',
      'Custom branding',
      'Team management',
      'Priority support'
    ]
  }
];

export default LandingPage;