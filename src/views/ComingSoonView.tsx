'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowLeft, Bell, Store, Users, Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ComingSoonProps {
  title: string;
  subtitle: string;
  badge: string;
  type: 'marketplace' | 'clarify' | 'community';
}

export default function ComingSoonView({ title, subtitle, badge, type }: ComingSoonProps) {
  const router = useRouter();

  const getIcon = () => {
    switch (type) {
      case 'marketplace':
        return <Store className="size-8 text-primary" />;
      case 'clarify':
        return <Bot className="size-8 text-primary" />;
      case 'community':
        return <Users className="size-8 text-primary" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <Card className="border-vvisa-border-subtle bg-vvisa-surface shadow-sm">
        <CardContent className="p-8 sm:p-12 space-y-4">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            {getIcon()}
          </div>

          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs">
            <Sparkles className="size-3 mr-1" />
            {badge}
          </Badge>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {title}
          </h1>

          <p className="text-sm text-vvisa-text-muted max-w-md mx-auto">
            {subtitle}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full sm:w-auto text-xs"
            >
              <ArrowLeft className="size-3.5 mr-1.5" />
              Back to Dashboard
            </Button>
            <Button
              className="w-full sm:w-auto text-xs bg-primary text-primary-foreground"
              onClick={() => alert('You will be notified when this feature goes live!')}
            >
              <Bell className="size-3.5 mr-1.5" />
              Notify Me on Launch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
