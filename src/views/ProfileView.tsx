'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockAgency } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload, AlertTriangle, Lock, User, Building2, Scan } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh',
];

export default function ProfileView() {
  const { navigate } = useAppStore();
  const [country, setCountry] = useState('India');
  const [state, setState] = useState(mockAgency.state || 'Karnataka');

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 max-w-3xl"
    >
      {/* Section 1: Agency Logo */}
      <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#9CA3AF]" />
              Agency Logo
            </div>
            <span className="text-xs text-[#6B7280] font-mono font-normal">enKOdaUD6df8RHXgzoP723VOvHA2</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="border-2 border-dashed border-[#2A2A38] rounded-xl w-32 h-32 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 transition-colors cursor-pointer shrink-0">
              <Upload className="h-6 w-6 text-[#6B7280] mb-1" />
              <p className="text-xs text-[#6B7280]">Upload</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/30 border border-indigo-800/30 text-[10px] text-indigo-400 font-medium mt-2">
                <Scan className="h-3 w-3" />
                Powered by ocr.z.ai
              </span>
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-[#9CA3AF]">
                JPG, JPEG, PNG or SVG — max 1 MB
              </p>
              <Button
                variant="outline"
                className="border-[#2A2A38] text-[#9CA3AF] hover:bg-[#1A1A24] hover:text-white rounded-lg text-xs"
              >
                Choose file
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Agency Information */}
      <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[#9CA3AF]" />
              Agency Information
            </div>
            <span className="text-xs text-[#6B7280] font-mono font-normal">enKOdaUD6df8RHXgzoP723VOvHA2</span>
          </CardTitle>
          <p className="text-xs text-[#6B7280]">Update your GST, PAN, and address details</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Details */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Basic Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-[#6B7280] mb-1.5 block">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111118] border border-[#2A2A38]">
                    <SelectItem value="India">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#6B7280] mb-1.5 block">Account Type</Label>
                <Input
                  value="b2b"
                  readOnly
                  className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg text-white h-10 opacity-60 cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="text-xs text-[#6B7280] mb-1.5 block">Contact Number</Label>
                <Input
                  defaultValue={mockAgency.phone}
                  className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-[#2A2A38]" />

          {/* Tax Details */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Tax Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#6B7280] mb-1.5 block">GST Number</Label>
                <Input
                  defaultValue={mockAgency.gstNumber}
                  className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-[#6B7280] mb-1.5 block">PAN Card</Label>
                <Input
                  defaultValue={mockAgency.panCard}
                  className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Documents</h4>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-800/30 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80">
                Upload your GST certificate to enable GST input credit on your invoices.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-white font-medium">GST Certificate</Label>
                <p className="text-xs text-[#6B7280]">PDF — max 5 MB</p>
                <div className="border border-dashed border-[#2A2A38] rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 transition-colors cursor-pointer h-20">
                  <Scan className="h-3.5 w-3.5 text-[#6B7280] mb-1" />
                  <p className="text-xs text-[#6B7280]">Click to upload</p>
                  <span className="text-[9px] text-[#3D3D54] mt-0.5">ocr.z.ai ready</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-white font-medium">Cancelled Cheque</Label>
                <p className="text-xs text-[#6B7280]">JPG, PNG or PDF — max 5 MB</p>
                <div className="border border-dashed border-[#2A2A38] rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 transition-colors cursor-pointer h-20">
                  <Scan className="h-3.5 w-3.5 text-[#6B7280] mb-1" />
                  <p className="text-xs text-[#6B7280]">Click to upload</p>
                  <span className="text-[9px] text-[#3D3D54] mt-0.5">ocr.z.ai ready</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-[#2A2A38]" />

          {/* Address */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Address</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-[#6B7280] mb-1.5 block">Address Line 1</Label>
                <Input
                  defaultValue={mockAgency.addressLine1}
                  className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-[#6B7280] mb-1.5 block">Address Line 2</Label>
                <Input
                  defaultValue={mockAgency.addressLine2}
                  className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-[#6B7280] mb-1.5 block">City</Label>
                  <Input
                    defaultValue={mockAgency.city}
                    className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#6B7280] mb-1.5 block">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111118] border border-[#2A2A38] max-h-60 overflow-y-auto">
                      {indianStates.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs text-[#6B7280] mb-1.5 block">Zip Code</Label>
                  <Input
                    defaultValue={mockAgency.zipCode}
                    className="bg-[#0A0A0F] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white h-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-10 px-6">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Aadhar Details */}
      <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#9CA3AF]" />
              Aadhar Details
            </div>
            <span className="text-xs text-[#6B7280] font-mono font-normal">enKOdaUD6df8RHXgzoP723VOvHA2</span>
          </CardTitle>
          <p className="text-xs text-[#6B7280]">Identity verification information</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-[#6B7280] mb-1.5 block">Name as per Aadhar</Label>
              <Input
                value="—"
                readOnly
                className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg text-white h-10 opacity-60 cursor-not-allowed"
              />
            </div>
            <div>
              <Label className="text-xs text-[#6B7280] mb-1.5 block">Aadhar Number</Label>
              <Input
                value="—"
                readOnly
                className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg text-white h-10 opacity-60 cursor-not-allowed"
              />
            </div>
            <div>
              <Label className="text-xs text-[#6B7280] mb-1.5 block">Address</Label>
              <Input
                value="—"
                readOnly
                className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg text-white h-10 opacity-60 cursor-not-allowed"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}