"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getSessionData } from '@/utils/session';
import { ArrowLeft, Calendar, FileText, User, CreditCard, Download, Printer } from 'lucide-react';
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

export default function BillDetailPage() {
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

      // Normalize flat API fields to nested objects the template expects
      const lines = (data.lines || []).map((line: any) => ({
        ...line,
        product: line.product || {
          name: line.item_name || 'Service',
          code: line.item_sku || '',
        },
        unit_price: parseFloat(line.unit_price ?? line.unit_rate) || 0,
        total: parseFloat(line.total ?? line.line_total) || 0,
      }));

      setBill({
        ...data,
        lines,
        party: {
          id: data.party || '',
          name: data.party_name || data.party?.name || '',
          email: data.party_email || data.party?.email || '',
          phone: data.party_phone || data.party?.phone || '',
        },
        currency: {
          code: data.currency_code || data.currency?.code || 'USD',
          symbol: data.currency_symbol || data.currency?.symbol || '$',
          name: data.currency_name || data.currency?.name || '',
        },
        subtotal: parseFloat(data.subtotal) || 0,
        tax_amount: parseFloat(data.tax_amount) || 0,
        discount_amount: parseFloat(data.discount_amount) || 0,
        total_amount: parseFloat(data.total_amount ?? data.grand_total) || 0,
        paid_amount: parseFloat(data.paid_amount ?? data.amount_received) || 0,
        outstanding_amount: parseFloat(data.outstanding_amount) || ((parseFloat(data.grand_total) || 0) - (parseFloat(data.amount_received) || 0)),
        payments: data.payments || [],
      });
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

  const formatCurrency = (amount: number | string | undefined | null, currency: any) => {
    const symbol = currency?.symbol || '$';
    const code = currency?.code || 'USD';
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return `${symbol}${(num || 0).toFixed(2)} ${code}`;
  };

  const handlePrintInvoice = () => {
    if (!bill) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const sym = bill.currency?.symbol || '$';
    const code = bill.currency?.code || 'USD';
    const fmtAmt = (n: number) => `${sym}${n.toFixed(2)} ${code}`;
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const linesHtml = (bill.lines || []).map(l => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.product?.name || 'Service'}${l.description ? '<br/><small style="color:#6b7280">' + l.description + '</small>' : ''}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${l.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtAmt(l.unit_price ?? 0)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmtAmt(l.total ?? 0)}</td>
      </tr>
    `).join('');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Invoice ${bill.invoice_number}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; color: #1f2937; }
        .invoice-box { max-width: 800px; margin: auto; border: 1px solid #e5e7eb; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .title { font-size: 28px; font-weight: 700; color: #1e40af; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .bg-blue { background: #dbeafe; color: #1e40af; }
        .bg-green { background: #d1fae5; color: #065f46; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
        .info-label { color: #6b7280; }
        .info-value { font-weight: 500; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 8px; border-bottom: 2px solid #d1d5db; font-size: 14px; color: #374151; }
        .text-right { text-align: right; }
        .totals { margin-top: 16px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .total-grand { font-size: 18px; font-weight: 700; border-top: 2px solid #1e40af; padding-top: 8px; margin-top: 8px; }
        .outstanding { color: #dc2626; }
        .paid { color: #059669; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
        @media print { body { padding: 20px; } .invoice-box { border: none; padding: 0; } }
      </style></head><body>
      <div class="invoice-box">
        <div class="header">
          <div>
            <div class="title">INVOICE</div>
            <div style="font-size:20px;font-weight:600;margin-top:4px">${bill.invoice_number}</div>
          </div>
          <div style="text-align:right">
            <span class="badge bg-blue">${bill.status.replace('_', ' ')}</span>
            <span class="badge bg-green" style="margin-left:8px">${bill.invoice_type.replace('_', ' ')}</span>
          </div>
        </div>

        <div class="grid section">
          <div>
            <div class="section-title">Bill To</div>
            <div style="font-weight:600;font-size:16px">${bill.party?.name || 'N/A'}</div>
            <div style="color:#6b7280;font-size:14px">${bill.party?.email || ''}</div>
            ${bill.party?.phone ? '<div style="color:#6b7280;font-size:14px">' + bill.party.phone + '</div>' : ''}
          </div>
          <div>
            <div class="section-title">Invoice Details</div>
            <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${fmtDate(bill.invoice_date)}</span></div>
            <div class="info-row"><span class="info-label">Due Date:</span><span class="info-value">${fmtDate(bill.due_date)}</span></div>
            ${bill.billing_period_start ? '<div class="info-row"><span class="info-label">Period:</span><span class="info-value">' + fmtDate(bill.billing_period_start) + ' – ' + fmtDate(bill.billing_period_end || '') + '</span></div>' : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Items</div>
          <table>
            <thead><tr>
              <th>Description</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr></thead>
            <tbody>${linesHtml || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#9ca3af">No line items</td></tr>'}</tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:flex-end">
          <div style="width:300px" class="totals">
            ${bill.subtotal ? '<div class="total-row"><span>Subtotal</span><span>' + fmtAmt(bill.subtotal) + '</span></div>' : ''}
            ${(bill.discount_amount && bill.discount_amount > 0) ? '<div class="total-row paid"><span>Discount</span><span>-' + fmtAmt(bill.discount_amount) + '</span></div>' : ''}
            ${bill.tax_amount ? '<div class="total-row"><span>Tax</span><span>' + fmtAmt(bill.tax_amount) + '</span></div>' : ''}
            <div class="total-row total-grand"><span>Total</span><span>${fmtAmt(bill.total_amount)}</span></div>
            ${bill.paid_amount > 0 ? '<div class="total-row paid"><span>Paid</span><span>' + fmtAmt(bill.paid_amount) + '</span></div>' : ''}
            ${bill.outstanding_amount > 0 ? '<div class="total-row outstanding" style="font-weight:700"><span>Outstanding</span><span>' + fmtAmt(bill.outstanding_amount) + '</span></div>' : ''}
          </div>
        </div>

        ${bill.notes ? '<div class="section" style="margin-top:24px"><div class="section-title">Notes</div><p style="font-size:14px;color:#4b5563">' + bill.notes + '</p></div>' : ''}
        ${bill.terms_and_conditions ? '<div class="section"><div class="section-title">Terms & Conditions</div><p style="font-size:14px;color:#4b5563">' + bill.terms_and_conditions + '</p></div>' : ''}

        <div class="footer">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div></body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
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
            <p className="text-gray-600">Invoice Details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => handlePrintInvoice()}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrintInvoice()}>
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
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Basic Details</h3>
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
                  <h3 className="font-semibold text-gray-900 mb-3">Billing Period</h3>
                  <div className="space-y-2 text-sm">
                    {bill.billing_period_start && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Period Start:</span>
                        <span className="font-medium">{formatDate(bill.billing_period_start)}</span>
                      </div>
                    )}
                    {bill.billing_period_end && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Period End:</span>
                        <span className="font-medium">{formatDate(bill.billing_period_end)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">{formatDate(bill.created_at)}</span>
                    </div>
                    {bill.posted_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Posted:</span>
                        <span className="font-medium">{formatDate(bill.posted_at)}</span>
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
                <CardTitle>Line Items</CardTitle>
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
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer
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

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Summary
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
                    <span>Paid Amount</span>
                    <span>{formatCurrency(bill.paid_amount, bill.currency)}</span>
                  </div>
                )}
                {bill.outstanding_amount > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Outstanding</span>
                    <span>{formatCurrency(bill.outstanding_amount, bill.currency)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Voucher Information */}
          {bill.voucher && (
            <Card>
              <CardHeader>
                <CardTitle>Accounting Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Voucher Number</span>
                    <span className="font-medium">{bill.voucher.voucher_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-medium">{formatCurrency(bill.voucher.total_amount, bill.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}