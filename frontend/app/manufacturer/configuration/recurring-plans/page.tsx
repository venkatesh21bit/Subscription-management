"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit2, Plus } from 'lucide-react';

interface RecurringPlan {
  id?: string;
  name: string;
  billing_period: string;
  billing_interval: string;
  reminder_days: string;
  auto_charge: boolean;
  closable: boolean;
  pausable: boolean;
  resumable: boolean;
}

export default function RecurringPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RecurringPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<RecurringPlan>({
    name: '',
    billing_period: 'MONTHLY',
    billing_interval: '1',
    reminder_days: '7',
    auto_charge: false,
    closable: true,
    pausable: false,
    resumable: false,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await apiClient.get<{ plans: RecurringPlan[] }>('/subscriptions/plans/');
      setPlans(response.data?.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingPlan?.id) {
        await apiClient.put(`/subscriptions/recurring-plans/${editingPlan.id}/`, formData);
      } else {
        await apiClient.post('/subscriptions/recurring-plans/', formData);
      }
      fetchPlans();
      closeModal();
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this recurring plan?')) {
      try {
        await apiClient.delete(`/subscriptions/recurring-plans/${id}/`);
        fetchPlans();
      } catch (error) {
        console.error('Error deleting plan:', error);
      }
    }
  };

  const openModal = (plan?: RecurringPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        billing_period: 'MONTHLY',
        billing_interval: '1',
        reminder_days: '7',
        auto_charge: false,
        closable: true,
        pausable: false,
        resumable: false,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
  };

  const getPeriodDisplay = (period: string, interval: string) => {
    const intervalNum = parseInt(interval);
    if (intervalNum === 1) {
      return period;
    }
    return `${interval} ${period}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recurring Plans</h1>
        <Button onClick={() => openModal()} className="bg-pink-600 hover:bg-pink-700">
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-700">
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Billing Period</TableHead>
              <TableHead className="text-gray-300">Auto-charge</TableHead>
              <TableHead className="text-gray-300">Closable</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  No recurring plans found
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id} className="border-b border-gray-700">
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>{getPeriodDisplay(plan.billing_period, plan.billing_interval)}</TableCell>
                  <TableCell>{plan.auto_charge ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{plan.closable ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openModal(plan)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(plan.id!)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPlan ? 'Edit Recurring Plan' : 'New Recurring Plan'}
            </h2>

            <div className="space-y-4">
              <div>
                <Label>Recurring Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  placeholder="e.g., Monthly Plan, Quarterly Plan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Billing Period</Label>
                  <Select value={formData.billing_period} onValueChange={(value) => setFormData({ ...formData, billing_period: value })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="WEEKLY">Weeks</SelectItem>
                      <SelectItem value="MONTHLY">Months</SelectItem>
                      <SelectItem value="YEARLY">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Billing Interval</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.billing_interval}
                    onChange={(e) => setFormData({ ...formData, billing_interval: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Bill every {formData.billing_interval} {formData.billing_period.toLowerCase()}
                  </p>
                </div>
              </div>

              <div>
                <Label>Reminder Days Before</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.reminder_days}
                  onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">Send reminder X days before billing</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.auto_charge}
                    onChange={(e) => setFormData({ ...formData, auto_charge: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label>Auto-charge customer</Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.closable}
                    onChange={(e) => setFormData({ ...formData, closable: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label>Closable (customer can cancel)</Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.pausable}
                    onChange={(e) => setFormData({ ...formData, pausable: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label>Pausable (customer can pause)</Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.resumable}
                    onChange={(e) => setFormData({ ...formData, resumable: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label>Resumable (customer can resume)</Label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <Button onClick={closeModal} variant="outline" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white">
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
