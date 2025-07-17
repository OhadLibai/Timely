// frontend/src/components/Home/Hero.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TimelyBrandLogo from '@/components/common/TimelyBrandLogo';


const Hero: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-purple-50 via-violet-100 to-purple-200 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-300/20 via-violet-300/15 to-indigo-300/20 animate-pulse" />
      <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(168, 85, 247, 0.15) 1px, transparent 0)', backgroundSize: '20px 20px'}} />
      
      {/* Cross-wide horizontal animation */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <div className="w-full h-full bg-gradient-to-r from-transparent via-purple-400/10 to-transparent transform skew-x-12" />
      </motion.div>
      
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
          delay: 2,
        }}
      >
        <div className="w-full h-full bg-gradient-to-r from-transparent via-violet-300/8 to-transparent transform -skew-x-6" />
      </motion.div>
      <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-r from-purple-300 to-violet-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-pulse" />
      <div className="absolute top-20 right-4 w-72 h-72 bg-gradient-to-r from-violet-300 to-purple-400 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-bounce" style={{animationDuration: '6s'}} />
      <div className="absolute -bottom-8 left-20 w-88 h-88 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-12 animate-pulse" style={{animationDelay: '2s'}} />
      <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-gradient-to-r from-purple-200 to-violet-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-ping" style={{animationDuration: '8s'}} />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="flex items-center justify-center lg:justify-start mb-8">
              <TimelyBrandLogo size="hero" variant="hero" animated={true} />
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 group cursor-default">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-purple-800 to-violet-700 transition-all duration-500 group-hover:from-purple-700 group-hover:via-slate-700 group-hover:to-purple-600">
                The Next Generation of Grocery Shopping
              </span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-700 via-slate-800 to-purple-700 transition-all duration-500 group-hover:from-slate-700 group-hover:via-purple-600 group-hover:to-slate-700">
                In The Palm of Your Hand.
              </span>
            </h1>
            
            <p className="text-xl text-slate-700 mb-8 max-w-2xl hover:text-slate-800 transition-colors duration-300 cursor-default font-medium">
              We define the new experience of buying goods, with groundbreaking AI agents designed to tackle
              you grocery tasks with breeze.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-400/30"
              >
                Start Shopping
              </Link>
              
              <Link
                to="/predicted-basket"
                className="inline-flex items-center px-8 py-4 border-2 border-purple-400 text-purple-700 font-semibold rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
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
            {/* "It is You. But Better." text above the card */}
            <div className="text-left mb-18 group cursor-default">
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-purple-700 to-violet-600 mb-4 transition-all duration-500 group-hover:from-purple-600 group-hover:via-slate-700 group-hover:to-purple-700">
                  Save Time.
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-700 to-slate-800 transition-all duration-500 group-hover:from-purple-700 group-hover:via-slate-700 group-hover:to-purple-600">
                  Shop Smarter.
                </span>
              </h2>
            </div>
            
            <div className="relative mt-6 group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-300 to-violet-400 rounded-3xl transform rotate-6 opacity-15 group-hover:opacity-25 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-300 to-purple-400 rounded-3xl transform -rotate-3 opacity-10 group-hover:opacity-20 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-violet-300 rounded-3xl opacity-8 blur-xl group-hover:opacity-15 transition-opacity duration-500" />
              <div className="relative bg-white/98 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-purple-200/80 hover:shadow-purple-300/40 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:bg-white cursor-pointer">
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                    <TimelyBrandLogo size="xl" variant="signature" animated={true} />
                  </div>
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-violet-600 mb-6 hover:from-purple-600 hover:to-violet-500 transition-all duration-300">Smart Recommendations</h3>
                  <p className="text-lg text-gray-700 font-medium hover:text-gray-800 transition-colors duration-300">Be Productive. Delegate Timely. Embrace Timely.</p>
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