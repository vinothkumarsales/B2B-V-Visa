'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { popularDestinations } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Plus, Search, Calendar, MapPin } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AllianceView() {
  const { allianceLinks } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [destination, setDestination] = useState('all');
  const [travelOn, setTravelOn] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alliance</h1>
          <p className="text-sm text-[#6B7280] mt-1">View and filter alliance links created for your clients</p>
        </div>
        <span className="text-xs text-[#3D3D54] font-mono">enKOdaUD6df8RHXgzoP723VOvHA2</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Customer phone or name..."
            className="bg-[#111118] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pl-9 pr-3 h-10"
          />
        </div>
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger className="bg-[#111118] border border-[#2A2A38] rounded-lg text-white h-10 w-44">
            <SelectValue placeholder="Destination" />
          </SelectTrigger>
          <SelectContent className="bg-[#111118] border border-[#2A2A38]">
            <SelectItem value="all">All Destinations</SelectItem>
            {popularDestinations.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            type="date"
            value={travelOn}
            onChange={(e) => setTravelOn(e.target.value)}
            placeholder="Travel On"
            className="bg-[#111118] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pl-9 pr-3 h-10 w-44"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            type="date"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            placeholder="Created At"
            className="bg-[#111118] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pl-9 pr-3 h-10 w-44"
          />
        </div>
      </div>

      {/* Empty State */}
      {allianceLinks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-4 rounded-full bg-[#1A1A24] mb-4">
            <Mail className="h-10 w-10 text-[#2A2A38]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No alliance links found</h3>
          <p className="text-sm text-[#6B7280] mb-6">No alliance links have been created yet.</p>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Alliance Link
          </Button>
        </div>
      )}
    </motion.div>
  );
}