'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { Upload, AlertTriangle, Plus, ArrowRight, Check, Circle, ChevronRight, Scan } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

const stepperSteps = [
  { label: 'Internal ID', completed: true },
  { label: 'Group Name', completed: true },
  { label: 'Traveler 1', completed: false, active: true },
  { label: 'Additional Questions', completed: false },
  { label: 'Review', completed: false },
  { label: 'Submit', completed: false },
];

const additionalDocs = [
  { title: 'National ID', helper: 'Aadhar card or voter ID' },
  { title: 'ITR', helper: 'Income Tax Return for last 2 years' },
  { title: 'Bank Statement', helper: 'Last 6 months bank statement' },
  { title: 'Salary Slips', helper: 'Last 3 months salary slips' },
  { title: 'Covering Letter', helper: 'From employer on company letterhead' },
  { title: 'Form 54', helper: 'Family composition form (if applicable)' },
];

export default function ApplyView() {
  const { selectedVisaType, walletBalance } = useAppStore();
  const [appType, setAppType] = useState<'individual' | 'group'>('group');
  const [internalId, setInternalId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [travelers, setTravelers] = useState(1);

  const pricePerTraveler = selectedVisaType?.price || 13499;
  const total = pricePerTraveler * travelers;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Application Setup */}
      <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-[#9CA3AF] mb-1.5 block font-medium">Are You Applying For</Label>
                <span className="text-[9px] text-[#3D3D54] font-mono">enKOdaUD6df8RHXgzoP723VOvHA2</span>
              </div>
              <ToggleGroup
                type="single"
                value={appType}
                onValueChange={(val) => val && setAppType(val as 'individual' | 'group')}
                className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-1"
              >
                <ToggleGroupItem
                  value="individual"
                  className="data-[state=on]:bg-indigo-600 data-[state=on]:text-white text-[#9CA3AF] rounded-md px-4 h-9 text-sm"
                >
                  Individual
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="group"
                  className="data-[state=on]:bg-indigo-600 data-[state=on]:text-white text-[#9CA3AF] rounded-md px-4 h-9 text-sm"
                >
                  Group
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#9CA3AF] mb-1.5 block font-medium">Internal ID</Label>
              <Input
                value={internalId}
                onChange={(e) => setInternalId(e.target.value)}
                placeholder="e.g. C7612934"
                className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10"
              />
            </div>
            {appType === 'group' && (
              <div className="flex-1">
                <Label className="text-xs text-[#9CA3AF] mb-1.5 block font-medium">Group Name</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. SAPNA CHHAJER"
                  className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10"
                />
              </div>
            )}
          </div>

          {/* Visa Type Display */}
          {selectedVisaType && (
            <div className="mt-4 p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6B7280]">Selected Visa Type</p>
                <p className="text-sm font-medium text-white">{selectedVisaType.name}</p>
              </div>
              <span className="text-sm font-bold font-mono text-indigo-400">
                {formatINR(selectedVisaType.price)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3-Column Layout */}
      <div className="flex gap-6">
        {/* Left: Progress Stepper */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#6B7280] font-medium">APPLICATION PROGRESS</p>
                  <span className="text-[9px] text-[#3D3D54] font-mono">enKOdaUD6df8RHXgzoP723VOvHA2</span>
                </div>
                <div className="space-y-0">
                  {stepperSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        {step.completed ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : step.active ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 ring-4 ring-indigo-600/20">
                            <Circle className="h-2 w-2 text-white fill-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#1A1A24] border border-[#2A2A38] flex items-center justify-center shrink-0">
                            <Circle className="h-2 w-2 text-[#6B7280]" />
                          </div>
                        )}
                        {i < stepperSteps.length - 1 && (
                          <div className={`w-0.5 h-6 ${step.completed ? 'bg-indigo-600' : 'bg-[#2A2A38]'}`} />
                        )}
                      </div>
                      <p className={`text-xs pt-1 ${step.active ? 'text-white font-medium' : step.completed ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Center: Form Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Upload Passport Section */}
          <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-white">Upload Passport</h3>
                <span className="text-xs text-[#6B7280] font-mono">enKOdaUD6df8RHXgzoP723VOvHA2</span>
              </div>
              <p className="text-xs text-[#6B7280] mb-4">Traveler {1}</p>

              {/* Warning Banner */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/30 mb-5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80">
                  VVisa uses <span className="text-indigo-400 font-medium">ocr.z.ai</span> for 99.9% accurate passport scanning. Upload a clear passport image and details will be filled automatically. However, it is mandatory to review the information before submitting.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Upload Zone */}
                <div className="border-2 border-dashed border-[#2A2A38] rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 transition-colors cursor-pointer min-h-[200px]">
                  <Upload className="h-8 w-8 text-[#6B7280] mb-3" />
                  <p className="text-sm text-[#9CA3AF] mb-1">Drag & drop passport image</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/30 border border-indigo-800/30 text-[10px] text-indigo-400 font-medium">
                    <Scan className="h-3 w-3" />
                    Powered by ocr.z.ai
                  </span>
                  <p className="text-xs text-[#6B7280] mt-2">JPG, PNG or PDF — max 5 MB</p>
                  <Button
                    variant="outline"
                    className="mt-4 border-[#2A2A38] text-[#9CA3AF] hover:bg-[#1A1A24] hover:text-white rounded-lg text-xs"
                  >
                    Choose File
                  </Button>
                </div>

                {/* Auto-populated Fields */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-[#6B7280]">Passport Number</Label>
                    <Input
                      placeholder="Auto-filled after upload"
                      className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-[#6B7280]">First Name</Label>
                      <Input
                        placeholder="First name"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280]">Last Name</Label>
                      <Input
                        placeholder="Last name"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-[#6B7280]">Nationality</Label>
                      <Input
                        defaultValue="Indian"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280]">Sex</Label>
                      <Input
                        placeholder="Male / Female"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B7280]">Date of Birth</Label>
                    <Input
                      type="date"
                      className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-[#6B7280]">Place of Birth</Label>
                      <Input
                        placeholder="City"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280]">Place of Issue</Label>
                      <Input
                        placeholder="City"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-[#6B7280]">Marital Status</Label>
                      <Input
                        placeholder="Single"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280]">Date of Issue</Label>
                      <Input
                        type="date"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280]">Date of Expiry</Label>
                      <Input
                        type="date"
                        className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Documents */}
          <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-white mb-1">Additional Documents</h3>
              <p className="text-xs text-[#6B7280] mb-5">Upload supporting documents for this application</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {additionalDocs.map((doc, i) => (
                  <div key={i} className="space-y-1.5">
                    <Label className="text-sm text-white font-medium">{doc.title}</Label>
                    <p className="text-xs text-[#6B7280]">{doc.helper}</p>
                    <div className="border border-dashed border-[#2A2A38] rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 transition-colors cursor-pointer h-20">
                      <Scan className="h-3.5 w-3.5 text-[#6B7280] mb-1" />
                      <p className="text-xs text-[#6B7280]">Click to upload</p>
                      <span className="text-[9px] text-[#3D3D54] mt-0.5">ocr.z.ai ready</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add Traveler */}
          <Button
            variant="outline"
            onClick={() => setTravelers((p) => p + 1)}
            className="w-full border-dashed border-[#2A2A38] text-[#9CA3AF] hover:bg-[#1A1A24] hover:text-white rounded-xl h-12 flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Another Traveler
          </Button>

          {/* Review CTA (mobile) */}
          <div className="lg:hidden">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-11 flex items-center justify-center gap-2"
            >
              Review and Save <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right: Price Summary */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24">
            <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Price Summary</h3>
                  <span className="text-[9px] text-[#3D3D54] font-mono">enKOdaUD6df8RHXgzoP723VOvHA2</span>
                </div>

                <div className="space-y-3 mb-4">
                  {Array.from({ length: travelers }, (_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs text-[#9CA3AF]">Traveler {i + 1}</span>
                      <span className="text-sm font-mono text-white">{formatINR(pricePerTraveler)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="bg-[#2A2A38] my-3" />

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="text-lg font-bold font-mono text-white">{formatINR(total)}</span>
                </div>

                <Separator className="bg-[#2A2A38] my-3" />

                <div className="flex justify-between items-center mb-5">
                  <span className="text-xs text-[#6B7280]">Current Wallet Balance</span>
                  <span className="text-sm font-mono text-indigo-400">{formatINR(walletBalance)}</span>
                </div>

                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-10 flex items-center justify-center gap-2 text-sm"
                >
                  Review and Save <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}