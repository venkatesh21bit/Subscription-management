"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RetailerNavbar } from '@/components/retailer/nav_bar';
import { getSessionData } from '@/utils/session';
import { ArrowLeft, Calendar, FileText, User, CreditCard, Download, Printer, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface BillDetail {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  party: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  invoice_type: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  financial_year?: {
    name: string;
  };
  voucher?: {
    voucher_number: string;
    total_amount: number;
  };
  lines?: Array<{
    id: string;
    product?: {
      name: string;
      code: string;
    };
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  posted_at?: string;
  billing_period_start?: string;
  billing_period_end?: string;
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

export default function RetailerBillDetailPage() {
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const sessionData = getSessionData();
  const billId = params.id;

  useEffect(() => {
    if (billId) {
      fetchBillDetail();
    }
  }, [billId]);

  const fetchBillDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/invoices/${billId}/`, {
        headers: {
          'Authorization': `Bearer ${sessionData?.access}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bill details: ${response.status}`);
      }

      const data = await response.json();
      setBill(data);
    } catch (err) {
      console.error('Error fetching bill details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bill details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: any) => {
    const symbol = currency?.symbol || '$';
    const code = currency?.code || 'USD';
    return `${symbol}${amount.toFixed(2)} ${code}`;
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'PAID' && status !== 'CANCELLED' && new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading bill details...</span>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || 'Bill not found'}</p>
              <Button onClick={() => router.back()} variant="outline">
                Go Back
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bills
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{bill.invoice_number}</h1>
            <p className="text-gray-600">Bill Details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Invoice Information
                </CardTitle>
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
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Invoice Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number:</span>
                      <span className="font-medium">{bill.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Date:</span>
                      <span className="font-medium">{formatDate(bill.invoice_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">{formatDate(bill.due_date)}</span>
                    </div>
                    {bill.financial_year && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Financial Year:</span>
                        <span className="font-medium">{bill.financial_year.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={statusColors[bill.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                        {bill.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {bill.outstanding_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount Due:</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(bill.outstanding_amount, bill.currency)}
                        </span>
                      </div>
                    )}
                    {bill.billing_period_start && bill.billing_period_end && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Billing Period:</span>
                        <span className="font-medium">
                          {formatDate(bill.billing_period_start)} - {formatDate(bill.billing_period_end)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          {bill.lines && bill.lines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items & Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Item</th>
                        <th className="text-right p-2 font-medium">Quantity</th>
                        <th className="text-right p-2 font-medium">Unit Price</th>
                        <th className="text-right p-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.lines.map((line) => (
                        <tr key={line.id} className="border-b">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{line.product?.name || 'Service'}</p>
                              {line.product?.code && (
                                <p className="text-sm text-gray-500">{line.product.code}</p>
                              )}
                              {line.description && (
                                <p className="text-sm text-gray-500">{line.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-right">{line.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(line.unit_price, bill.currency)}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(line.total, bill.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes & Terms */}
          {(bill.notes || bill.terms_and_conditions) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                {bill.notes && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bill.notes}</p>
                  </div>
                )}
                {bill.terms_and_conditions && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bill.terms_and_conditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900">{bill.party.name}</p>
                  <p className="text-sm text-gray-600">{bill.party.email}</p>
                  {bill.party.phone && (
                    <p className="text-sm text-gray-600">{bill.party.phone}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bill.subtotal !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(bill.subtotal, bill.currency)}</span>
                  </div>
                )}
                {bill.discount_amount !== undefined && bill.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(bill.discount_amount, bill.currency)}</span>
                  </div>
                )}
                {bill.tax_amount !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(bill.tax_amount, bill.currency)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span>{formatCurrency(bill.total_amount, bill.currency)}</span>
                </div>
                {bill.paid_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(bill.paid_amount, bill.currency)}</span>
                  </div>
                )}
                {bill.outstanding_amount > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Amount Due</span>
                    <span>{formatCurrency(bill.outstanding_amount, bill.currency)}</span>
                  </div>
                )}
                
                {/* Payment Action */}
                {bill.outstanding_amount > 0 && bill.status !== 'PAID' && bill.status !== 'CANCELLED' && (
                  <div className="pt-4">
                    <Button className="w-full" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Make Payment
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}