"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  product_type?: string;
  price: string;
  cost?: string;
  available_quantity?: string;
  unit?: string;
  status?: string;
}

interface ProductResponse {
  products?: Product[];
  results?: Product[];
  count?: number;
  total?: number;
}

const PRODUCT_TYPES = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'CONSUMABLE', label: 'Consumable' },
];

export default function ProductListPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [assignedUserFilter, setAssignedUserFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState<any[]>([]);

  const itemsPerPage = 10;

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, productTypeFilter, assignedUserFilter, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users/');
      if (response.data) {
        setUsers((response.data as any).users || response.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let url = `/catalog/products/?page=${currentPage}&page_size=${itemsPerPage}`;

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (productTypeFilter && productTypeFilter !== 'all') {
        url += `&product_type=${productTypeFilter}`;
      }

      if (assignedUserFilter && assignedUserFilter !== 'all') {
        url += `&assigned_user=${assignedUserFilter}`;
      }

      const response = await apiClient.get<ProductResponse>(url);

      if (response.data) {
        setProducts(response.data.products || response.data.results || []);

        // Calculate total pages
        const total = response.data.count || response.data.total || 0;
        setTotalPages(Math.ceil(total / itemsPerPage));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (productId: string) => {
    router.push(`/manufacturer/products/${productId}?mode=view`);
  };

  const handleViewProduct = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    router.push(`/manufacturer/products/${productId}?mode=view`);
  };

  const handleEditProduct = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    router.push(`/manufacturer/products/${productId}?mode=edit`);
  };

  const handleDeleteProduct = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await apiClient.delete(`/catalog/products/${productId}/`);
      // Refresh the list
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.error || 'Failed to delete product');
    }
  };

  const handleNewProduct = () => {
    router.push('/manufacturer/products/new');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <Button
          onClick={handleNewProduct}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          New Product
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Bar */}
        <div>
          <Input
            type="text"
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        {/* Product Type Filter */}
        <div>
          <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Product Type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="all">All Types</SelectItem>
              {PRODUCT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assigned User Filter */}
        <div>
          <Select value={assignedUserFilter} onValueChange={setAssignedUserFilter}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Assigned User" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.username || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-700 hover:bg-gray-800">
              <TableHead className="text-gray-300">Product Name</TableHead>
              <TableHead className="text-gray-300">Sales Price</TableHead>
              <TableHead className="text-gray-300">Cost</TableHead>
              <TableHead className="text-gray-300">Type</TableHead>
              <TableHead className="text-gray-300">Available Qty</TableHead>
              <TableHead className="text-gray-300">Unit</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  onClick={() => handleRowClick(product.id)}
                  className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>${parseFloat(product.price || '0').toFixed(2)}</TableCell>
                  <TableCell>${parseFloat(product.cost || '0').toFixed(2)}</TableCell>
                  <TableCell>{product.product_type || 'N/A'}</TableCell>
                  <TableCell>{product.available_quantity || '0'}</TableCell>
                  <TableCell>{product.unit || 'N/A'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${product.status === 'active'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-600 text-white'
                      }`}>
                      {product.status || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleViewProduct(e, product.id)}
                        title="View Product"
                        className="text-blue-400 hover:text-blue-300 hover:bg-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleEditProduct(e, product.id)}
                        title="Edit Product"
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteProduct(e, product.id)}
                        title="Delete Product"
                        className="text-red-400 hover:text-red-300 hover:bg-gray-600"
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            Previous
          </Button>
          <span className="text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
