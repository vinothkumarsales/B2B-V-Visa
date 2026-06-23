'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function ChangePasswordView() {
  const { navigate } = useAppStore();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="max-w-md space-y-6"
    >
      {/* Back Link */}
      <button
        onClick={() => navigate('profile')}
        className="text-sm text-[#9CA3AF] hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </button>

      <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#9CA3AF]" />
              Change Password
            </div>
            <span className="text-xs text-[#6B7280] font-mono font-normal">enKOdaUD6df8RHXgzoP723VOvHA2</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-[#6B7280] mb-1.5 block">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pr-9 h-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#6B7280] mb-1.5 block">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pr-9 h-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#6B7280] mb-1.5 block">Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pr-9 h-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-10 mt-2">
            Update Password
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}