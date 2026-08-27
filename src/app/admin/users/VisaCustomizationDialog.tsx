'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { updateAgencyVisaCategories } from './actions';
import { toast } from 'sonner';



export function VisaCustomizationDialog({
  agencyId,
  agencyName,
  initialDisabled,
  availableCategories,
}: {
  agencyId: string;
  agencyName: string;
  initialDisabled: string[];
  availableCategories: string[];
}) {
  const [open, setOpen] = useState(false);
  const [disabledCategories, setDisabledCategories] = useState<string[]>(initialDisabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = (category: string) => {
    setDisabledCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await updateAgencyVisaCategories(agencyId, disabledCategories);
    setLoading(false);
    if (res.success) {
      toast.success(`Visa permissions updated for ${agencyName}`);
      setOpen(false);
    } else {
      toast.error(res.error || 'Failed to update visa permissions');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Settings2 className="size-3.5" />
          <span>Visas</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Visa Access</DialogTitle>
          <DialogDescription>
            Select which visa categories are available to <strong>{agencyName}</strong>. Unchecking a category will hide it from their portal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {availableCategories.length === 0 ? (
            <p className="text-sm text-slate-500">No visa categories found in the system.</p>
          ) : (
            availableCategories.map((cat) => {
              const isEnabled = !disabledCategories.includes(cat);
            return (
              <div key={cat} className="flex items-center space-x-3">
                <Checkbox
                  id={`cat-${cat}`}
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(cat)}
                />
                <label
                  htmlFor={`cat-${cat}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {cat} Visa
                </label>
              </div>
            );
          }))}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
