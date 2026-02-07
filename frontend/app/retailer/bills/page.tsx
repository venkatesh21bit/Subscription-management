"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RetailerNavbar } from '@/components/retailer/nav_bar';
import { getSessionData } from '@/utils/session';
import { API_URL } from '@/utils/auth_fn';
import { Calendar, FileText, Filter, Search, Eye } from 'lucide-react';
import Link from 'next/link';

interface Bill {
  id: string;
  invoice_number: string;
  invoice_date: string;
  party: {
    id: string;
    name: string;
    email: string;
  };
  invoice_type: string;
  status: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  currency: {
    code: string;
    symbol: string;
  };
  bills?: Array<{
    bill_number: string;
    total: number;
  }>;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  POSTED: 'bg-blue-100 text-blue-800',
  SUBMITTED: 'bg-green-100 text-green-800',
  PAID: 'bg-green-100 text-green-800',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const typeColors = {
  SALES: 'bg-emerald-100 text-emerald-800',
  PURCHASE: 'bg-purple-100 text-purple-800',
  DEBIT_NOTE: 'bg-orange-100 text-orange-800',
  CREDIT_NOTE: 'bg-cyan-100 text-cyan-800',
  PROFORMA: 'bg-indigo-100 text-indigo-800',
};

export default function RetailerBillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const sessionData = getSessionData();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      // For retailers, we might want to fetch bills where they are the customer
      const response = await fetch(`${API_URL}/invoices/`, {
        headers: {
          'Authorization': `Bearer ${sessionData?.access}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bills: ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data.results || [];
      // Map flat API fields to nested objects the template expects
      const mapped = items.map((item: any) => ({
        ...item,
        party: {
          id: item.party || '',
          name: item.party_name || '',
          email: item.party_email || '',
        },
        currency: {
          code: item.currency_code || 'USD',
          symbol: item.currency_symbol || '$',
        },
        total_amount: item.total_amount ?? item.grand_total ?? 0,
        paid_amount: item.paid_amount ?? item.amount_received ?? 0,
        outstanding_amount: item.outstanding_amount ?? 0,
      }));
      setBills(mapped);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.party.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    const matchesType = typeFilter === 'all' || bill.invoice_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | string | undefined | null, currency: any) => {
    const symbol = currency?.symbol || '$';
    const code = currency?.code || 'USD';
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return `${symbol}${(num || 0).toFixed(2)} ${code}`;
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'PAID' && status !== 'CANCELLED' && new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading bills...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchBills} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <RetailerNavbar />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bills</h1>
          <p className="text-gray-600 mt-2">View your invoices and payment status</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SALES">Invoice</SelectItem>
                <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
                <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                <SelectItem value="PROFORMA">Proforma Invoice</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <div className="space-y-4">
        {filteredBills.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {bills.length === 0 ? 'No bills found' : 'No bills match your filters'}
                </p>
                {bills.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Bills will appear here when you receive invoices from manufacturers.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredBills.map((bill) => (
            <Card key={bill.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Left side - Main info */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                      <h3 className="text-lg font-semibold">{bill.invoice_number}</h3>
                      <div className="flex space-x-2">
                        <Badge className={statusColors[bill.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                          {bill.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={typeColors[bill.invoice_type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'}>
                          {bill.invoice_type.replace('_', ' ')}
                        </Badge>
                        {isOverdue(bill.due_date, bill.status) && (
                          <Badge className="bg-red-100 text-red-800">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><span className="font-medium">From:</span> {bill.party.name}</p>
                      <p><span className="font-medium">Email:</span> {bill.party.email}</p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Date: {formatDate(bill.invoice_date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Due: {formatDate(bill.due_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Amount and actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(bill.total_amount, bill.currency)}
                      </p>
                      {bill.outstanding_amount > 0 && (
                        <p className="text-sm text-red-600">
                          Outstanding: {formatCurrency(bill.outstanding_amount, bill.currency)}
                        </p>
                      )}
                      {bill.paid_amount > 0 && (
                        <p className="text-sm text-green-600">
                          Paid: {formatCurrency(bill.paid_amount, bill.currency)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/retailer/bills/${bill.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {filteredBills.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{filteredBills.length}</p>
                <p className="text-sm text-gray-600">Total Bills</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {filteredBills.filter(b => b.status === 'PAID').length}
                </p>
                <p className="text-sm text-gray-600">Paid</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {filteredBills.filter(b => isOverdue(b.due_date, b.status)).length}
                </p>
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredBills.filter(b => b.status === 'PARTIALLY_PAID').length}
                </p>
                <p className="text-sm text-gray-600">Partially Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}