'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShieldAlert, ShieldCheck, ExternalLink, Wallet } from 'lucide-react';
import { toggleUserStatus } from './actions';
import { toast } from 'sonner';
import { VisaCustomizationDialog } from './VisaCustomizationDialog';
import { useRouter } from 'next/navigation';

export type AdminUserPayload = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  memberships: {
    agency: {
      id: string;
      name: string;
      disabledVisaCategories: any;
    };
    role: string;
  }[];
};

export default function AdminUsersClient({ users, availableCategories }: { users: AdminUserPayload[], availableCategories: string[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [uidJump, setUidJump] = useState('');
  const [localUsers, setLocalUsers] = useState(users);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredUsers = localUsers.filter((u) =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (user: AdminUserPayload) => {
    const newStatus = !user.isActive;
    setLoadingId(user.id);
    const res = await toggleUserStatus(user.id, newStatus);
    setLoadingId(null);
    if (res.success) {
      setLocalUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
      toast.success(`User has been ${newStatus ? 'activated' : 'deactivated'}.`);
    } else {
      toast.error(res.error || 'Failed to update user status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500">Track and manage portal users and their agency access.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="Paste Agent UID..."
              className="h-10 w-full sm:w-48"
              value={uidJump}
              onChange={(e) => setUidJump(e.target.value)}
            />
            <Button 
              variant="secondary" 
              className="h-10"
              onClick={() => {
                if (uidJump.trim()) {
                  router.push(`/admin/${uidJump.trim()}/dashboard`);
                }
              }}
            >
              Go
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Details</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{user.phone || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    {user.memberships.map((m, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{m.agency.name}</span>
                        <Badge variant="outline" className="w-fit text-[10px]">
                          {m.role}
                        </Badge>
                      </div>
                    ))}
                    {user.memberships.length === 0 && (
                      <span className="text-xs text-slate-400">No Agency</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.memberships.length > 0 && (
                        <>
                          <VisaCustomizationDialog 
                            agencyId={user.memberships[0].agency.id} 
                            agencyName={user.memberships[0].agency.name}
                            availableCategories={availableCategories}
                            initialDisabled={
                              user.memberships[0].agency.disabledVisaCategories 
                                ? (typeof user.memberships[0].agency.disabledVisaCategories === 'string' 
                                  ? JSON.parse(user.memberships[0].agency.disabledVisaCategories) 
                                  : user.memberships[0].agency.disabledVisaCategories) 
                                : []
                            }
                          />
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                          >
                            <Link href={`/admin/${user.memberships[0].agency.id}/dashboard`}>
                              <ExternalLink className="size-3.5" />
                              Portal
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                          >
                            <Link href={`/admin/${user.memberships[0].agency.id}/wallet`}>
                              <Wallet className="size-3.5" />
                              Wallet
                            </Link>
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingId === user.id}
                        onClick={() => handleToggleStatus(user)}
                        className={user.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50 h-8' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8'}
                      >
                        {user.isActive ? <ShieldAlert className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        {user.isActive ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
