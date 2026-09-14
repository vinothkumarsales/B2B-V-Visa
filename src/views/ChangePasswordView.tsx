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
        className="text-sm text-vvisa-text-secondary hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </button>

      <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-vvisa-text-secondary" />
              Change Password
            </div>
            <span className="text-xs text-vvisa-text-muted font-mono font-normal">enKOdaUD6df8RHXgzoP723VOvHA2</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pr-9 h-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-vvisa-text-muted hover:text-foreground transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-vvisa-text-muted mb-1.5 block">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pr-9 h-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-vvisa-text-muted hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pr-9 h-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-vvisa-text-muted hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg h-10 mt-2">
            Update Password
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}