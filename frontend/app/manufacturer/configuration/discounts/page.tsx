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

interface Discount {
  id?: string;
  name: string;
  discount_type: string;
  value: string;
  minimum_purchase: string;
  minimum_quantity: string;
  products: string[];
  start_date: string;
  end_date: string;
  limit_usage: boolean;
  usage_limit: string;
}

interface DiscountResponse {
  id: string;
  name: string;
  discount_type: string;
  discount_value: string;
  min_purchase_amount: string;
  min_quantity: string;
  products: string[];
  start_date: string;
  end_date: string;
  max_total_usage: string;
  is_active: boolean;
}

export default function DiscountsPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState<DiscountResponse[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountResponse | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Discount>({
    name: '',
    discount_type: 'PERCENTAGE',
    value: '',
    minimum_purchase: '',
    minimum_quantity: '',
    products: [],
    start_date: '',
    end_date: '',
    limit_usage: false,
    usage_limit: '',
  });

  useEffect(() => {
    fetchDiscounts();
    fetchProducts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await apiClient.get<{ discounts: DiscountResponse[] }>('/subscriptions/discounts/');
      setDiscounts(response.data?.discounts || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get<{ products: any[] }>('/catalog/products/');
      setProducts(response.data?.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Transform payload to match backend field names
      const payload = {
        name: formData.name,
        discount_type: formData.discount_type,
        discount_value: formData.value,
        min_purchase_amount: formData.minimum_purchase || '0',
        min_quantity: formData.minimum_quantity || '0',
        max_total_usage: formData.limit_usage ? formData.usage_limit : '0',
        products: formData.products,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: true,
      };
      
      if (editingDiscount?.id) {
        await apiClient.put(`/subscriptions/discounts/${editingDiscount.id}/`, payload);
      } else {
        await apiClient.post('/subscriptions/discounts/', payload);
      }
      fetchDiscounts();
      closeModal();
    } catch (error) {
      console.error('Error saving discount:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this discount?')) {
      try {
        await apiClient.delete(`/subscriptions/discounts/${id}/`);
        fetchDiscounts();
      } catch (error) {
        console.error('Error deleting discount:', error);
      }
    }
  };

  const openModal = (discount?: DiscountResponse) => {
    if (discount) {
      setEditingDiscount(discount);
      // Transform backend data to frontend format
      setFormData({
        name: discount.name,
        discount_type: discount.discount_type,
        value: discount.discount_value,
        minimum_purchase: discount.min_purchase_amount,
        minimum_quantity: discount.min_quantity,
        products: discount.products,
        start_date: discount.start_date,
        end_date: discount.end_date,
        limit_usage: parseInt(discount.max_total_usage) > 0,
        usage_limit: discount.max_total_usage,
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        name: '',
        discount_type: 'PERCENTAGE',
        value: '',
        minimum_purchase: '',
        minimum_quantity: '',
        products: [],
        start_date: '',
        end_date: '',
        limit_usage: false,
        usage_limit: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Discounts</h1>
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
              <TableHead className="text-gray-300">Type</TableHead>
              <TableHead className="text-gray-300">Value</TableHead>
              <TableHead className="text-gray-300">Start Date</TableHead>
              <TableHead className="text-gray-300">End Date</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>discount_
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  No discounts found
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id} className="border-b border-gray-700">
                  <TableCell>{discount.name}</TableCell>
                  <TableCell>{discount.discount_type}</TableCell>
                  <TableCell>{discount.discount_value}{discount.discount_type === 'PERCENTAGE' ? '%' : ''}</TableCell>
                  <TableCell>{discount.start_date}</TableCell>
                  <TableCell>{discount.end_date}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openModal(discount)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(discount.id!)} className="text-red-500">
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
              {editingDiscount ? 'Edit Discount' : 'New Discount'}
            </h2>

            <div className="space-y-4">
              <div>
                <Label>Discount Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED">Fixed Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Purchase</Label>
                  <Input
                    type="number"
                    value={formData.minimum_purchase}
                    onChange={(e) => setFormData({ ...formData, minimum_purchase: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label>Minimum Quantity</Label>
                  <Input
                    type="number"
                    value={formData.minimum_quantity}
                    onChange={(e) => setFormData({ ...formData, minimum_quantity: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.limit_usage}
                  onChange={(e) => setFormData({ ...formData, limit_usage: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label>Limit Usage</Label>
              </div>

              {formData.limit_usage && (
                <div>
                  <Label>Usage Limit</Label>
                  <Input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
              )}
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
