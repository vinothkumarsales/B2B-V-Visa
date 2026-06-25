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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overstay</h1>
          <p className="text-sm text-vvisa-text-muted mt-1">Manage UAE overstay cases and history</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overstay">
        <TabsList className="bg-vvisa-surface border border-vvisa-border rounded-lg p-1 h-auto">
          <TabsTrigger
            value="overstay"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-4 py-2 text-sm"
          >
            Overstay
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-4 py-2 text-sm"
          >
            History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vvisa-text-muted" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search names..."
          className="bg-vvisa-surface border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-10"
        />
      </div>

      {/* Empty State */}
      {overstayCases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-4 rounded-full bg-vvisa-surface-2 mb-4">
            <ShieldAlert className="h-10 w-10 text-vvisa-border" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No overstay cases</h3>
          <p className="text-sm text-vvisa-text-muted">None of your travellers have overstayed or absconded.</p>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="pt-4 border-t border-vvisa-border text-center">
        <p className="text-xs text-vvisa-text-muted">Page 1 of {Math.max(1, Math.ceil(overstayCases.length / 10))}</p>
      </div>
    </motion.div>
  );
}
