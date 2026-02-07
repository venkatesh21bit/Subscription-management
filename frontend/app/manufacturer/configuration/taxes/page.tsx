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

interface Tax {
  id?: string;
  name: string;
  computation: string;
  amount: string;
}

export default function TaxesPage() {
  const router = useRouter();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Tax>({
    name: '',
    computation: 'PERCENTAGE',
    amount: '',
  });

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const response = await apiClient.get<{ taxes: Tax[] }>('/pricing/taxes/');
      setTaxes(response.data?.taxes || []);
    } catch (error) {
      console.error('Error fetching taxes:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingTax?.id) {
        await apiClient.put(`/pricing/taxes/${editingTax.id}/`, formData);
      } else {
        await apiClient.post('/pricing/taxes/', formData);
      }
      fetchTaxes();
      closeModal();
    } catch (error) {
      console.error('Error saving tax:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tax?')) {
      try {
        await apiClient.delete(`/pricing/taxes/${id}/`);
        fetchTaxes();
      } catch (error) {
        console.error('Error deleting tax:', error);
      }
    }
  };

  const openModal = (tax?: Tax) => {
    if (tax) {
      setEditingTax(tax);
      setFormData(tax);
    } else {
      setEditingTax(null);
      setFormData({
        name: '',
        computation: 'PERCENTAGE',
        amount: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTax(null);
  };

  const getHelperText = () => {
    if (formData.computation === 'PERCENTAGE') {
      return 'Enter percentage value (e.g., 18 for 18% GST)';
    }
    return 'Enter fixed amount';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Taxes</h1>
        <Button onClick={() => openModal()} className="bg-pink-600 hover:bg-pink-700">
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-700">
              <TableHead className="text-gray-300">Tax Name</TableHead>
              <TableHead className="text-gray-300">Computation</TableHead>
              <TableHead className="text-gray-300">Amount</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                  No taxes found
                </TableCell>
              </TableRow>
            ) : (
              taxes.map((tax) => (
                <TableRow key={tax.id} className="border-b border-gray-700">
                  <TableCell>{tax.name}</TableCell>
                  <TableCell>{tax.computation}</TableCell>
                  <TableCell>
                    {tax.amount}{tax.computation === 'PERCENTAGE' ? '%' : ''}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openModal(tax)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(tax.id!)} className="text-red-500">
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
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingTax ? 'Edit Tax' : 'New Tax'}
            </h2>

            <div className="space-y-4">
              <div>
                <Label>Tax Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  placeholder="e.g., GST, VAT, Sales Tax"
                />
              </div>

              <div>
                <Label>Tax Computation</Label>
                <Select value={formData.computation} onValueChange={(value) => setFormData({ ...formData, computation: value })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">{getHelperText()}</p>
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
