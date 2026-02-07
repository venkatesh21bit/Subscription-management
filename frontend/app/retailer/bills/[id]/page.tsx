"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RetailerNavbar } from '@/components/retailer/nav_bar';
import { getSessionData } from '@/utils/session';
import { API_URL } from '@/utils/auth_fn';
import {
  ArrowLeft, Calendar, FileText, User, CreditCard,
  Download, Printer, CheckCircle, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number: string;
  notes: string;
  created_at: string;
}

interface BillLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  product?: { name: string; code: string; };
  item_name?: string;
  item_sku?: string;
  unit_rate?: number;
  line_total?: number;
}

interface BillDetail {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  party_name: string;
  party_email: string;
  invoice_type: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  amount_received: number;
  currency_code: string;
  currency_symbol: string;
  billing_period_start?: string;
  billing_period_end?: string;
  is_auto_generated?: boolean;
  lines: BillLine[];
  payments: Payment[];
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  POSTED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const typeColors: Record<string, string> = {
  SALES: 'bg-emerald-100 text-emerald-800',
  PURCHASE: 'bg-purple-100 text-purple-800',
  DEBIT_NOTE: 'bg-orange-100 text-orange-800',
  CREDIT_NOTE: 'bg-cyan-100 text-cyan-800',
  PROFORMA: 'bg-indigo-100 text-indigo-800',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

export default function RetailerBillDetailPage() {
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const router = useRouter();
  const params = useParams();
  const sessionData = getSessionData();
  const billId = params.id;

  useEffect(() => {
    if (billId) fetchBillDetail();
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
      if (!response.ok) throw new Error(`Failed to fetch bill details: ${response.status}`);

      const data = await response.json();

      // Normalize line items
      const lines = (data.lines || []).map((line: any) => ({
        ...line,
        product: line.product || {
          name: line.item_name || 'Service',
          code: line.item_sku || '',
        },
        unit_price: line.unit_price ?? line.unit_rate ?? 0,
        total: line.total ?? line.line_total ?? 0,
      }));

      setBill({
        ...data,
        lines,
        payments: data.payments || [],
        total_amount: data.total_amount ?? data.grand_total ?? 0,
        paid_amount: data.paid_amount ?? data.amount_received ?? 0,
        outstanding_amount: data.outstanding_amount ?? ((data.grand_total ?? 0) - (data.amount_received ?? 0)),
        currency_symbol: data.currency_symbol || '$',
        currency_code: data.currency_code || 'USD',
        party_name: data.party_name || '',
        party_email: data.party_email || '',
      });
    } catch (err) {
      console.error('Error fetching bill details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bill details');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > bill.outstanding_amount) {
      toast.error(`Amount cannot exceed outstanding balance of ${fmt(bill.outstanding_amount)}`);
      return;
    }

    try {
      setPaymentSubmitting(true);
      const response = await fetch(`${API_URL}/invoices/${billId}/record-payment/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData?.access}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentAmount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          reference_number: paymentRef,
          notes: paymentNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      toast.success(data.message || 'Payment recorded successfully');
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      fetchBillDetail(); // Refresh
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const fmt = (amount: number) => {
    const symbol = bill?.currency_symbol || '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'PAID' && status !== 'CANCELLED' && new Date(dueDate) < new Date();
  };

  const handlePrintInvoice = () => {
    if (!bill) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const sym = bill.currency_symbol || '$';
    const code = bill.currency_code || 'USD';
    const fmtAmt = (n: number) => `${sym}${n.toFixed(2)} ${code}`;
    const fmtDt = (d: string | undefined | null) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const linesHtml = (bill.lines || []).map(l => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.product?.name || l.item_name || 'Service'}${l.description ? '<br/><small style="color:#6b7280">' + l.description + '</small>' : ''}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${l.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtAmt(l.unit_price ?? l.unit_rate ?? 0)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmtAmt(l.total ?? l.line_total ?? 0)}</td>
      </tr>
    `).join('');
    const paymentsHtml = (bill.payments || []).map(p => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;font-size:13px">${fmtDt(p.payment_date)}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;font-size:13px">${p.payment_method}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;font-size:13px">${p.reference_number || '\u2014'}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;color:#059669;font-weight:600">${fmtAmt(p.amount)}</td>
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
          </div>
        </div>
        <div class="grid section">
          <div>
            <div class="section-title">From</div>
            <div style="font-weight:600;font-size:16px">${bill.party_name || 'N/A'}</div>
            <div style="color:#6b7280;font-size:14px">${bill.party_email || ''}</div>
          </div>
          <div>
            <div class="section-title">Invoice Details</div>
            <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${fmtDt(bill.invoice_date)}</span></div>
            <div class="info-row"><span class="info-label">Due Date:</span><span class="info-value">${fmtDt(bill.due_date)}</span></div>
            ${bill.billing_period_start ? '<div class="info-row"><span class="info-label">Period:</span><span class="info-value">' + fmtDt(bill.billing_period_start) + ' \u2013 ' + fmtDt(bill.billing_period_end) + '</span></div>' : ''}
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
            ${bill.subtotal > 0 ? '<div class="total-row"><span>Subtotal</span><span>' + fmtAmt(bill.subtotal) + '</span></div>' : ''}
            ${bill.discount_amount > 0 ? '<div class="total-row paid"><span>Discount</span><span>-' + fmtAmt(bill.discount_amount) + '</span></div>' : ''}
            ${bill.tax_amount > 0 ? '<div class="total-row"><span>Tax</span><span>' + fmtAmt(bill.tax_amount) + '</span></div>' : ''}
            <div class="total-row total-grand"><span>Total</span><span>${fmtAmt(bill.total_amount)}</span></div>
            ${bill.paid_amount > 0 ? '<div class="total-row paid"><span>Paid</span><span>' + fmtAmt(bill.paid_amount) + '</span></div>' : ''}
            ${bill.outstanding_amount > 0 ? '<div class="total-row outstanding" style="font-weight:700"><span>Outstanding</span><span>' + fmtAmt(bill.outstanding_amount) + '</span></div>' : ''}
          </div>
        </div>
        ${paymentsHtml ? '<div class="section" style="margin-top:24px"><div class="section-title">Payment History</div><table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="text-right">Amount</th></tr></thead><tbody>' + paymentsHtml + '</tbody></table></div>' : ''}
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
      <div>
        <RetailerNavbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading bill details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div>
        <RetailerNavbar />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error || 'Bill not found'}</p>
                <Button onClick={() => router.back()} variant="outline">Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canPay = bill.outstanding_amount > 0 && !['PAID', 'CANCELLED', 'DRAFT'].includes(bill.status);

  return (
    <div>
      <RetailerNavbar />
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Bills
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{bill.invoice_number}</h1>
              <p className="text-gray-600">Bill Details</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handlePrintInvoice()}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePrintInvoice()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" /> Invoice Information
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Badge className={statusColors[bill.status] || 'bg-gray-100 text-gray-800'}>
                      {bill.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className={typeColors[bill.invoice_type] || ''}>
                      {bill.invoice_type.replace('_', ' ')}
                    </Badge>
                    {isOverdue(bill.due_date, bill.status) && (
                      <Badge className="bg-red-100 text-red-800">Overdue</Badge>
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
                      {bill.billing_period_start && bill.billing_period_end && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Billing Period:</span>
                          <span className="font-medium">
                            {formatDate(bill.billing_period_start)} – {formatDate(bill.billing_period_end)}
                          </span>
                        </div>
                      )}
                      {bill.is_auto_generated && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <Badge variant="outline" className="text-xs">Auto-generated</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Payment Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge className={statusColors[bill.status] || ''}>
                          {bill.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {bill.paid_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount Paid:</span>
                          <span className="font-medium text-green-600">{fmt(bill.paid_amount)}</span>
                        </div>
                      )}
                      {bill.outstanding_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount Due:</span>
                          <span className="font-medium text-red-600">{fmt(bill.outstanding_amount)}</span>
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
                          <th className="text-right p-2 font-medium">Qty</th>
                          <th className="text-right p-2 font-medium">Unit Price</th>
                          <th className="text-right p-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.lines.map((line) => (
                          <tr key={line.id} className="border-b">
                            <td className="p-2">
                              <p className="font-medium">{line.product?.name || line.item_name || 'Service'}</p>
                              {(line.product?.code || line.item_sku) && (
                                <p className="text-sm text-gray-500">{line.product?.code || line.item_sku}</p>
                              )}
                              {line.description && (
                                <p className="text-sm text-gray-500">{line.description}</p>
                              )}
                            </td>
                            <td className="p-2 text-right">{line.quantity}</td>
                            <td className="p-2 text-right">
                              {fmt(line.unit_price ?? line.unit_rate ?? 0)}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {fmt(line.total ?? line.line_total ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            {bill.payments && bill.payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Date</th>
                          <th className="text-left p-2 font-medium">Method</th>
                          <th className="text-left p-2 font-medium">Reference</th>
                          <th className="text-right p-2 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.payments.map((payment) => (
                          <tr key={payment.id} className="border-b">
                            <td className="p-2 text-sm">{formatDate(payment.payment_date)}</td>
                            <td className="p-2 text-sm">
                              <Badge variant="outline">
                                {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                              </Badge>
                            </td>
                            <td className="p-2 text-sm text-gray-600">
                              {payment.reference_number || '—'}
                            </td>
                            <td className="p-2 text-right font-medium text-green-600">
                              {fmt(payment.amount)}
                            </td>
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
                <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
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
            {/* Supplier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" /> Supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-gray-900">{bill.party_name}</p>
                {bill.party_email && <p className="text-sm text-gray-600">{bill.party_email}</p>}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" /> Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bill.subtotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{fmt(bill.subtotal)}</span>
                    </div>
                  )}
                  {bill.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{fmt(bill.discount_amount)}</span>
                    </div>
                  )}
                  {bill.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span>{fmt(bill.tax_amount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Amount</span>
                    <span>{fmt(bill.total_amount)}</span>
                  </div>
                  {bill.paid_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Amount Paid</span>
                      <span>{fmt(bill.paid_amount)}</span>
                    </div>
                  )}
                  {bill.outstanding_amount > 0 && (
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>Amount Due</span>
                      <span>{fmt(bill.outstanding_amount)}</span>
                    </div>
                  )}

                  {/* Make Payment Button */}
                  {canPay && !showPaymentForm && (
                    <div className="pt-4">
                      <Button
                        className="w-full"
                        onClick={() => {
                          setPaymentAmount(bill.outstanding_amount.toFixed(2));
                          setShowPaymentForm(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-2" /> Make Payment
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            {showPaymentForm && canPay && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" /> Record Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRecordPayment} className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={bill.outstanding_amount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={`Max: ${fmt(bill.outstanding_amount)}`}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Outstanding: {fmt(bill.outstanding_amount)}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="method">Payment Method *</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="date">Payment Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="ref">Reference Number</Label>
                      <Input
                        id="ref"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="Transaction ID, cheque no, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="flex-1" disabled={paymentSubmitting}>
                        {paymentSubmitting ? 'Recording...' : 'Record Payment'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPaymentForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
