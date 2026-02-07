"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from 'lucide-react';

interface AttributeValue {
  id?: string;
  value: string;
  extra_price: string;
}

interface Attribute {
  id?: string;
  name: string;
  values: AttributeValue[];
}

export default function AttributesPage() {
  const router = useRouter();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      const response = await apiClient.get<{ attributes: Attribute[] }>('/subscriptions/attributes/');
      setAttributes(response.data?.attributes || []);
    } catch (error) {
      console.error('Error fetching attributes:', error);
    }
  };

  const handleCreateAttribute = () => {
    const name = prompt('Enter attribute name (e.g., ChatGPT, Gemini):');
    if (name) {
      const newAttribute: Attribute = {
        name,
        values: [],
      };
      setAttributes([...attributes, newAttribute]);
      setSelectedAttribute(newAttribute);
    }
  };

  const handleSaveAttribute = async () => {
    if (!selectedAttribute) return;
    
    try {
      setLoading(true);
      if (selectedAttribute.id) {
        await apiClient.put(`/subscriptions/attributes/${selectedAttribute.id}/`, selectedAttribute);
      } else {
        const response = await apiClient.post<{ id: string }>('/subscriptions/attributes/', selectedAttribute);
        if (response.data) {
          selectedAttribute.id = response.data.id;
        }
      }
      fetchAttributes();
    } catch (error) {
      console.error('Error saving attribute:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttribute = async (id: string) => {
    if (confirm('Are you sure you want to delete this attribute?')) {
      try {
        await apiClient.delete(`/subscriptions/attributes/${id}/`);
        fetchAttributes();
        if (selectedAttribute?.id === id) {
          setSelectedAttribute(null);
        }
      } catch (error) {
        console.error('Error deleting attribute:', error);
      }
    }
  };

  const handleAddValue = () => {
    if (!selectedAttribute) return;
    
    const newValue: AttributeValue = {
      value: '',
      extra_price: '0',
    };
    
    setSelectedAttribute({
      ...selectedAttribute,
      values: [...selectedAttribute.values, newValue],
    });
  };

  const handleUpdateValue = (index: number, field: keyof AttributeValue, value: string) => {
    if (!selectedAttribute) return;
    
    const updatedValues = [...selectedAttribute.values];
    updatedValues[index] = { ...updatedValues[index], [field]: value };
    
    setSelectedAttribute({
      ...selectedAttribute,
      values: updatedValues,
    });
  };

  const handleDeleteValue = (index: number) => {
    if (!selectedAttribute) return;
    
    const updatedValues = selectedAttribute.values.filter((_, i) => i !== index);
    setSelectedAttribute({
      ...selectedAttribute,
      values: updatedValues,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Attribute List */}
        <div className="col-span-1">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Attributes</h2>
            <Button onClick={handleCreateAttribute} size="sm" className="bg-pink-600 hover:bg-pink-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            {attributes.map((attr) => (
              <div
                key={attr.id || attr.name}
                onClick={() => setSelectedAttribute(attr)}
                className={`p-3 rounded cursor-pointer flex justify-between items-center ${
                  selectedAttribute?.id === attr.id ? 'bg-pink-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <span>{attr.name}</span>
                {attr.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAttribute(attr.id!);
                    }}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {attributes.length === 0 && (
              <p className="text-gray-400 text-center py-4">No attributes found</p>
            )}
          </div>
        </div>

        {/* Right: Attribute Values */}
        <div className="col-span-2">
          {selectedAttribute ? (
            <>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">{selectedAttribute.name}</h2>
                <div className="flex gap-2">
                  <Button onClick={handleAddValue} size="sm" className="bg-pink-600 hover:bg-pink-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Value
                  </Button>
                  <Button onClick={handleSaveAttribute} disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-700">
                      <TableHead className="text-gray-300">Value</TableHead>
                      <TableHead className="text-gray-300">Default Extra Price</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedAttribute.values.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-400">
                          No values added
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedAttribute.values.map((val, index) => (
                        <TableRow key={index} className="border-b border-gray-700">
                          <TableCell>
                            <Input
                              value={val.value}
                              onChange={(e) => handleUpdateValue(index, 'value', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white"
                              placeholder="e.g., GPT Pro"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={val.extra_price}
                              onChange={(e) => handleUpdateValue(index, 'extra_price', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteValue(index)}
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
            </>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              <p>Select an attribute to view and edit values</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
