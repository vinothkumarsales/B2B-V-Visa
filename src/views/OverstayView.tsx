'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ShieldAlert } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function OverstayView() {
  const { overstayCases } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Overstay</h1>
        <p className="text-sm text-[#6B7280] mt-1">Manage UAE overstay cases and history</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overstay">
        <TabsList className="bg-[#111118] border border-[#2A2A38] rounded-lg p-1 h-auto">
          <TabsTrigger
            value="overstay"
            className="data-[state=active]:bg-[#1A1A24] data-[state=active]:text-white text-[#6B7280] rounded-md px-4 py-2 text-sm"
          >
            Overstay
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-[#1A1A24] data-[state=active]:text-white text-[#6B7280] rounded-md px-4 py-2 text-sm"
          >
            History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search names..."
          className="bg-[#111118] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pl-9 pr-3 h-10"
        />
      </div>

      {/* Empty State */}
      {overstayCases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-4 rounded-full bg-[#1A1A24] mb-4">
            <ShieldAlert className="h-10 w-10 text-[#2A2A38]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No overstay cases</h3>
          <p className="text-sm text-[#6B7280]">None of your travellers have overstayed or absconded.</p>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="pt-4 border-t border-[#2A2A38] text-center">
        <p className="text-xs text-[#6B7280]">Page 1 of {Math.max(1, Math.ceil(overstayCases.length / 10))}</p>
      </div>
    </motion.div>
  );
}