// frontend/src/components/Home/Hero.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// ✅ ADDED: Import the logo as a module
import timelyLogo from '@/assets/timely-logo.svg';
import timelyIcon from '@/assets/timely-favicon.svg';

const Hero: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <img src={timelyLogo} alt="Timely Logo" className="h-10" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              The Next Generation of Grocery Shopping<br />
              In The Palm of Your Hand.<br />
              It is You.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {" "}But Better.<br />
              </span>              
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl">
              We define the new experience of buying goods, with groundbreaking AI agents designed to tackle
              you grocery tasks with breeze.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Shopping
              </Link>
              
              <Link
                to="/predicted-basket"
                className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition-colors"
              >
                My Predicted Basket
              </Link>
            </div>
          </motion.div>
          
          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl transform rotate-6 opacity-10" />
              <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <img src={timelyLogo} alt="Timely Icon" className="h-12 w-12" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Recommendations</h3>
                  <p className="text-gray-600">Be Productive. Save Time. Delegate Timely. Embrace Timely.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;