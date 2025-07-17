// frontend/src/layouts/AdminLayoutDemo.tsx
// Demo component to showcase both layout versions
// Use this to test and compare the layouts

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Tablet, Smartphone, RefreshCw, Layout, BarChart3 } from 'lucide-react';
import AdminLayoutDashboard from './AdminLayoutDashboard';
import AdminLayoutTabs from './AdminLayoutTabs';
import { Button } from '@/components/common/Button';

const AdminLayoutDemo: React.FC = () => {
  const [activeLayout, setActiveLayout] = useState<'dashboard' | 'tabs'>('dashboard');
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const layouts = [
    {
      id: 'dashboard' as const,
      name: 'Dashboard-Centric',
      description: 'Card-based navigation with visual metrics',
      icon: BarChart3,
      pros: ['Modern visual design', 'Matches existing dashboard', 'Mobile-first approach', 'Quick metrics overview'],
      cons: ['Deeper navigation', 'More clicks required', 'Less traditional admin feel']
    },
    {
      id: 'tabs' as const,
      name: 'Top Tab Navigation',
      description: 'Horizontal tabs with sub-navigation',
      icon: Layout,
      pros: ['Familiar interface', 'Quick switching', 'Clear hierarchy', 'Space efficient'],
      cons: ['Limited scalability', 'Can get crowded', 'Less visual impact']
    }
  ];

  const viewModes = [
    { id: 'desktop' as const, name: 'Desktop', icon: Monitor, width: 'w-full' },
    { id: 'tablet' as const, name: 'Tablet', icon: Tablet, width: 'w-3/4' },
    { id: 'mobile' as const, name: 'Mobile', icon: Smartphone, width: 'w-96' }
  ];

  const currentLayout = layouts.find(l => l.id === activeLayout);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Demo Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Admin Layout Comparison</h1>
              <p className="text-gray-400">Compare different architectural approaches to admin navigation</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              className="text-white hover:bg-gray-700"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Layout Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {layouts.map((layout) => (
              <motion.button
                key={layout.id}
                onClick={() => setActiveLayout(layout.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${\n                  activeLayout === layout.id\n                    ? 'border-blue-500 bg-blue-500/10'\n                    : 'border-gray-600 bg-gray-800 hover:border-gray-500'\n                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <layout.icon size={24} className={activeLayout === layout.id ? 'text-blue-400' : 'text-gray-400'} />
                  <div>
                    <h3 className="font-semibold">{layout.name}</h3>
                    <p className="text-sm text-gray-400">{layout.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-1">Pros</h4>
                    <ul className="text-xs text-gray-400 space-y-1">
                      {layout.pros.map((pro, index) => (
                        <li key={index}>• {pro}</li>
                      ))}\n                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-1">Cons</h4>
                    <ul className="text-xs text-gray-400 space-y-1">
                      {layout.cons.map((con, index) => (
                        <li key={index}>• {con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* View Mode Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-400 mr-2">View Mode:</span>
            {viewModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${\n                  viewMode === mode.id\n                    ? 'bg-blue-500 text-white'\n                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'\n                }`}
              >
                <mode.icon size={16} />
                <span className="text-sm">{mode.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layout Preview */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">
              Preview: {currentLayout?.name}
            </h2>
            <p className="text-gray-400 text-sm">
              {currentLayout?.description}
            </p>
          </div>

          {/* Responsive Container */}
          <div className="flex justify-center">
            <div className={`${viewModes.find(v => v.id === viewMode)?.width} transition-all duration-300`}>
              <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                <div className="relative">
                  {/* Screen Size Indicator */}
                  <div className="absolute top-2 right-2 z-50 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {viewModes.find(v => v.id === viewMode)?.name}
                  </div>
                  
                  {/* Layout Content */}
                  <div className="h-screen overflow-hidden">
                    {activeLayout === 'dashboard' ? (
                      <AdminLayoutDashboard />
                    ) : (
                      <AdminLayoutTabs />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Notes */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Implementation Notes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-400 mb-2">Dashboard-Centric Layout</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Replaces sidebar with interactive cards</li>
                  <li>• Shows metrics directly in navigation</li>
                  <li>• Uses existing Dashboard.tsx design patterns</li>
                  <li>• Optimized for mobile-first approach</li>
                  <li>• Reduces cognitive load with visual hierarchy</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-400 mb-2">Top Tab Navigation</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Familiar horizontal tab interface</li>
                  <li>• Sub-navigation for complex sections</li>
                  <li>• Status bar with live system information</li>
                  <li>• Dropdown menus for nested navigation</li>
                  <li>• Quick actions integrated in header</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayoutDemo;