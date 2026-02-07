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

interface QuotationProduct {
  id?: string;
  product: string;
  description: string;
  quantity: string;
}

interface QuotationTemplate {
  id?: string;
  name: string;
  validity_days: string;
  plan: string;
  plan_name?: string;
  last_forever?: boolean;
  end_after_value?: string;
  end_after_period?: string;
  products: QuotationProduct[];
}

interface ApiResponse<T> {
  templates?: T[];
  plans?: T[];
  products?: T[];
}

export default function QuotationTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuotationTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState<QuotationTemplate>({
    name: '',
    validity_days: '30',
    plan: '',
    last_forever: false,
    end_after_value: '1',
    end_after_period: 'MONTH',
    products: [],
  });

  useEffect(() => {
    fetchTemplates();
    fetchPlans();
    fetchProducts();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.get<ApiResponse<QuotationTemplate>>('/subscriptions/quotation-templates/');
      setTemplates(response.data?.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/subscriptions/plans/');
      setPlans(response.data?.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/catalog/products/');
      setProducts(response.data?.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingTemplate?.id) {
        await apiClient.put(`/subscriptions/quotation-templates-config/${editingTemplate.id}/`, formData);
      } else {
        await apiClient.post('/subscriptions/quotation-templates-config/', formData);
      }
      fetchTemplates();
      closeModal();
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this quotation template?')) {
      try {
        await apiClient.delete(`/subscriptions/quotation-templates-config/${id}/`);
        fetchTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  const openModal = (template?: QuotationTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData(template);
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        validity_days: '30',
        plan: '',
        last_forever: false,
        end_after_value: '1',
        end_after_period: 'MONTH',
        products: [],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [
        ...formData.products,
        { product: '', description: '', quantity: '1' },
      ],
    });
  };

  const handleUpdateProduct = (index: number, field: keyof QuotationProduct, value: string) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setFormData({ ...formData, products: updatedProducts });
  };

  const handleDeleteProduct = (index: number) => {
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: updatedProducts });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quotation Templates</h1>
        <Button onClick={() => openModal()} className="bg-pink-600 hover:bg-pink-700">
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-700">
              <TableHead className="text-gray-300">Template Name</TableHead>
              <TableHead className="text-gray-300">Validity (Days)</TableHead>
              <TableHead className="text-gray-300">Recurring Plan</TableHead>
              <TableHead className="text-gray-300">Duration</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  No quotation templates found
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id} className="border-b border-gray-700">
                  <TableCell>{template.name}</TableCell>
                  <TableCell>{template.validity_days}</TableCell>
                  <TableCell>
                    {template.plan_name || plans.find(p => p.id === template.plan)?.name || template.plan}
                  </TableCell>
                  <TableCell>
                    {template.last_forever ? 'Forever' : template.end_after_value && template.end_after_period ? `${template.end_after_value} ${template.end_after_period}${template.end_after_value !== '1' ? 'S' : ''}` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openModal(template)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(template.id!)} className="text-red-500">
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
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? 'Edit Quotation Template' : 'New Quotation Template'}
            </h2>

            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quotation Validity (days)</Label>
                  <Input
                    type="number"
                    value={formData.validity_days}
                    onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label>Recurring Plan</Label>
                  <Select value={formData.plan} onValueChange={(value) => setFormData({ ...formData, plan: value })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.last_forever}
                  onChange={(e) => setFormData({ ...formData, last_forever: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label>Last Forever</Label>
              </div>

              {!formData.last_forever && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>End After</Label>
                    <Input
                      type="number"
                      value={formData.end_after_value}
                      onChange={(e) => setFormData({ ...formData, end_after_value: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label>Period</Label>
                    <Select value={formData.end_after_period} onValueChange={(value) => setFormData({ ...formData, end_after_period: value })}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="WEEK">Week</SelectItem>
                        <SelectItem value="MONTH">Month</SelectItem>
                        <SelectItem value="YEAR">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Products</Label>
                  <Button type="button" size="sm" onClick={handleAddProduct} className="bg-pink-600 hover:bg-pink-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-700">
                      <TableHead className="text-gray-300">Product</TableHead>
                      <TableHead className="text-gray-300">Description</TableHead>
                      <TableHead className="text-gray-300">Quantity</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-gray-400">
                          No products added
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.products.map((product, index) => (
                        <TableRow key={index} className="border-b border-gray-700">
                          <TableCell>
                            <Select value={product.product} onValueChange={(value) => handleUpdateProduct(index, 'product', value)}>
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                {products.map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={product.description}
                              onChange={(e) => handleUpdateProduct(index, 'description', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => handleUpdateProduct(index, 'quantity', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProduct(index)}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
