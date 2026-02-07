"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Edit2 } from 'lucide-react';

interface RecurringPrice {
  id?: string;
  recurring_plan: string;
  price: string;
  min_qty: string;
  start_date: string;
  end_date: string;
}

interface Variant {
  id?: string;
  attribute: string;
  values: string;
  extra_price: string;
}

const PRODUCT_TYPES = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'CONSUMABLE', label: 'Consumable' },
];

export default function NewProductPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    product_type: 'GOODS',
    tax: '',
    sales_price: '',
    cost: '',
    available_quantity: '',
    cgst_rate: '',
    sgst_rate: '',
    igst_rate: '',
  });
  
  const [recurringPrices, setRecurringPrices] = useState<RecurringPrice[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  
  // Modal states for adding/editing
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringPrice | null>(null);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchPlans();
  }, []);


  const fetchPlans = async () => {
    try {
      const response = await apiClient.get('/subscriptions/plans/');
      const data = response.data || {};
      setPlans(Array.isArray(data) ? data : ((data as any).plans || []));
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans([]);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.sales_price || parseFloat(formData.sales_price) < 0) {
      newErrors.sales_price = 'Sales price must be a positive number';
    }
    
    if (!formData.cost || parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Cost must be a positive number';
    }
    
    // Validate: sales_price >= cost
    if (formData.sales_price && formData.cost) {
      if (parseFloat(formData.sales_price) < parseFloat(formData.cost)) {
        newErrors.sales_price = 'Sales price must be greater than or equal to cost';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Remove temporary IDs from recurring prices and variants
      const cleanRecurringPrices = recurringPrices.map(({ id, ...rest }) => rest);
      const cleanVariants = variants.map(({ id, ...rest }) => rest);
      
      const payload = {
        name: formData.name,
        product_type: formData.product_type,
        tax_rate: parseFloat(formData.tax) || 0,
        price: parseFloat(formData.sales_price),
        cost: parseFloat(formData.cost),
        available_quantity: parseInt(formData.available_quantity) || 0,
        cgst_rate: parseFloat(formData.cgst_rate) || 0,
        sgst_rate: parseFloat(formData.sgst_rate) || 0,
        igst_rate: parseFloat(formData.igst_rate) || 0,
        recurring_prices: cleanRecurringPrices,
        variants: cleanVariants,
      };
      
      const response = await apiClient.post('/catalog/products/', payload);
      
      if (response.data) {
        router.push('/manufacturer/products');
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/manufacturer/products');
  };

  // Recurring Price handlers
  const handleAddRecurringPrice = (price: RecurringPrice) => {
    if (editingRecurring) {
      setRecurringPrices(prev => 
        prev.map(p => p.id === editingRecurring.id ? { ...price, id: editingRecurring.id } : p)
      );
    } else {
      setRecurringPrices(prev => [...prev, { ...price, id: Date.now().toString() }]);
    }
    setShowRecurringModal(false);
    setEditingRecurring(null);
  };

  const handleEditRecurringPrice = (price: RecurringPrice) => {
    setEditingRecurring(price);
    setShowRecurringModal(true);
  };

  const handleDeleteRecurringPrice = (id: string) => {
    setRecurringPrices(prev => prev.filter(p => p.id !== id));
  };

  // Variant handlers
  const handleAddVariant = (variant: Variant) => {
    if (editingVariant) {
      setVariants(prev => 
        prev.map(v => v.id === editingVariant.id ? { ...variant, id: editingVariant.id } : v)
      );
    } else {
      setVariants(prev => [...prev, { ...variant, id: Date.now().toString() }]);
    }
    setShowVariantModal(false);
    setEditingVariant(null);
  };

  const handleEditVariant = (variant: Variant) => {
    setEditingVariant(variant);
    setShowVariantModal(true);
  };

  const handleDeleteVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Product</h1>
      </div>

      <div className="max-w-5xl mx-auto bg-gray-800 rounded-lg p-6">
        {/* Product Form */}
        <div className="space-y-4 mb-6">
          {/* Product Name */}
          <div>
            <Label htmlFor="name" className="text-gray-300">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-1"
              placeholder="Enter product name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Type */}
            <div>
              <Label htmlFor="product_type" className="text-gray-300">Product Type</Label>
              <Select value={formData.product_type} onValueChange={(value) => handleInputChange('product_type', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tax */}
            <div>
              <Label htmlFor="tax" className="text-gray-300">Tax (%)</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                value={formData.tax}
                onChange={(e) => handleInputChange('tax', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-1"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales Price */}
            <div>
              <Label htmlFor="sales_price" className="text-gray-300">Sales Price</Label>
              <Input
                id="sales_price"
                type="number"
                step="0.01"
                value={formData.sales_price}
                onChange={(e) => handleInputChange('sales_price', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-1"
                placeholder="0.00"
              />
              {errors.sales_price && <p className="text-red-500 text-sm mt-1">{errors.sales_price}</p>}
            </div>

            {/* Cost Price */}
            <div>
              <Label htmlFor="cost" className="text-gray-300">Cost Price</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-1"
                placeholder="0.00"
              />
              {errors.cost && <p className="text-red-500 text-sm mt-1">{errors.cost}</p>}
            </div>
          </div>

          {/* Available Quantity */}
          <div>
            <Label htmlFor="available_quantity" className="text-gray-300">Available Quantity</Label>
            <Input
              id="available_quantity"
              type="number"
              step="1"
              min="0"
              value={formData.available_quantity}
              onChange={(e) => handleInputChange('available_quantity', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white mt-1"
              placeholder="0"
            />
          </div>

          {/* GST Rates */}
          <div className="border border-gray-600 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">GST Rates (%)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cgst_rate" className="text-gray-300">CGST Rate</Label>
                <Input
                  id="cgst_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cgst_rate}
                  onChange={(e) => handleInputChange('cgst_rate', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="sgst_rate" className="text-gray-300">SGST Rate</Label>
                <Input
                  id="sgst_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sgst_rate}
                  onChange={(e) => handleInputChange('sgst_rate', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="igst_rate" className="text-gray-300">IGST Rate</Label>
                <Input
                  id="igst_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.igst_rate}
                  onChange={(e) => handleInputChange('igst_rate', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Recurring Prices and Variants */}
        <Tabs defaultValue="recurring" className="w-full">
          <TabsList className="bg-gray-700 border-gray-600">
            <TabsTrigger value="recurring" className="data-[state=active]:bg-pink-600">
              Recurring Prices
            </TabsTrigger>
            <TabsTrigger value="variants" className="data-[state=active]:bg-pink-600">
              Variants
            </TabsTrigger>
          </TabsList>

          {/* Recurring Prices Tab */}
          <TabsContent value="recurring" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recurring Prices</h3>
              <Button
                onClick={() => {
                  setEditingRecurring(null);
                  setShowRecurringModal(true);
                }}
                size="sm"
                className="bg-pink-600 hover:bg-pink-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-700">
                  <TableHead className="text-gray-300">Recurring Plan</TableHead>
                  <TableHead className="text-gray-300">Price</TableHead>
                  <TableHead className="text-gray-300">Min Qty</TableHead>
                  <TableHead className="text-gray-300">Start Date</TableHead>
                  <TableHead className="text-gray-300">End Date</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringPrices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                      No recurring prices added
                    </TableCell>
                  </TableRow>
                ) : (
                  recurringPrices.map((price) => (
                    <TableRow key={price.id} className="border-b border-gray-700">
                      <TableCell>{price.recurring_plan}</TableCell>
                      <TableCell>₹{parseFloat(price.price).toFixed(2)}</TableCell>
                      <TableCell>{price.min_qty}</TableCell>
                      <TableCell>{price.start_date}</TableCell>
                      <TableCell>{price.end_date}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRecurringPrice(price)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRecurringPrice(price.id!)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Variants</h3>
              <Button
                onClick={() => {
                  setEditingVariant(null);
                  setShowVariantModal(true);
                }}
                size="sm"
                className="bg-pink-600 hover:bg-pink-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-700">
                  <TableHead className="text-gray-300">Attribute</TableHead>
                  <TableHead className="text-gray-300">Values</TableHead>
                  <TableHead className="text-gray-300">Extra Price</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                      No variants added
                    </TableCell>
                  </TableRow>
                ) : (
                  variants.map((variant) => (
                    <TableRow key={variant.id} className="border-b border-gray-700">
                      <TableCell>{variant.attribute}</TableCell>
                      <TableCell>{variant.values}</TableCell>
                      <TableCell>₹{parseFloat(variant.extra_price).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditVariant(variant)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteVariant(variant.id!)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </div>

      {/* Recurring Price Modal */}
      {showRecurringModal && (
        <RecurringPriceModal
          price={editingRecurring}
          plans={plans}
          onSave={handleAddRecurringPrice}
          onClose={() => {
            setShowRecurringModal(false);
            setEditingRecurring(null);
          }}
        />
      )}

      {/* Variant Modal */}
      {showVariantModal && (
        <VariantModal
          variant={editingVariant}
          onSave={handleAddVariant}
          onClose={() => {
            setShowVariantModal(false);
            setEditingVariant(null);
          }}
        />
      )}
    </div>
  );
}

// Recurring Price Modal Component
function RecurringPriceModal({
  price,
  plans,
  onSave,
  onClose,
}: {
  price: RecurringPrice | null;
  plans: any[];
  onSave: (price: RecurringPrice) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<RecurringPrice>({
    recurring_plan: price?.recurring_plan || '',
    price: price?.price || '',
    min_qty: price?.min_qty || '',
    start_date: price?.start_date || '',
    end_date: price?.end_date || '',
  });

  const handleSubmit = () => {
    if (!formData.recurring_plan || !formData.price) {
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {price ? 'Edit Recurring Price' : 'Add Recurring Price'}
        </h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="plan">Recurring Plan</Label>
            <Select
              value={formData.recurring_plan}
              onValueChange={(value) => setFormData(prev => ({ ...prev, recurring_plan: value }))}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.name}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>

          <div>
            <Label htmlFor="min_qty">Min Quantity</Label>
            <Input
              id="min_qty"
              type="number"
              value={formData.min_qty}
              onChange={(e) => setFormData(prev => ({ ...prev, min_qty: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>

          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>

          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// Variant Modal Component
function VariantModal({
  variant,
  onSave,
  onClose,
}: {
  variant: Variant | null;
  onSave: (variant: Variant) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Variant>({
    attribute: variant?.attribute || '',
    values: variant?.values || '',
    extra_price: variant?.extra_price || '',
  });

  const handleSubmit = () => {
    if (!formData.attribute || !formData.values) {
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {variant ? 'Edit Variant' : 'Add Variant'}
        </h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="attribute">Attribute</Label>
            <Input
              id="attribute"
              value={formData.attribute}
              onChange={(e) => setFormData(prev => ({ ...prev, attribute: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white mt-1"
              placeholder="e.g., Size, Color"
            />
          </div>

          <div>
            <Label htmlFor="values">Values</Label>
            <Input
              id="values"
              value={formData.values}
              onChange={(e) => setFormData(prev => ({ ...prev, values: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white mt-1"
              placeholder="e.g., Small, Medium, Large"
            />
          </div>

          <div>
            <Label htmlFor="extra_price">Extra Price</Label>
            <Input
              id="extra_price"
              type="number"
              step="0.01"
              value={formData.extra_price}
              onChange={(e) => setFormData(prev => ({ ...prev, extra_price: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white mt-1"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
