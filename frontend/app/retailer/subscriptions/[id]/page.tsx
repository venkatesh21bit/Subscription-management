"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RetailerNavbar } from '@/components/retailer/nav_bar';
import { getSessionData } from '@/utils/session';
import { API_URL } from '@/utils/auth_fn';
import { ArrowLeft, Calendar, FileText, Package, Check, X, Clock, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuotationDetail {
  id: string;
  quotation_number: string;
  party: {
    id: string;
    name: string;
    email: string;
  };
  plan: {
    id: string;
    name: string;
    description: string;
    billing_interval: string;
    billing_interval_count: number;
  };
  status: string;
  valid_until: string;
  start_date: string;
  total_amount: number;
  currency: {
    code: string;
    symbol: string;
  };
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  terms_and_conditions: string;
  notes: string;
  created_at: string;
  items?: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
};

export default function RetailerSubscriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = params?.id as string;
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const sessionData = getSessionData();

  useEffect(() => {
    if (quotationId) {
      fetchQuotationDetail();
    }
  }, [quotationId]);

  const fetchQuotationDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/subscriptions/quotations/${quotationId}/`,
        {
          headers: {
            'Authorization': `Bearer ${sessionData?.access}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch quotation: ${response.status}`);
      }

      const data = await response.json();
      setQuotation(data);
    } catch (err) {
      console.error('Error fetching quotation:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuotation = async () => {
    if (!quotation) return;

    try {
      setProcessing(true);
      const response = await fetch(
        `${API_URL}/subscriptions/quotations/${quotation.id}/accept/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData?.access}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to accept quotation');
      }

      toast.success('Quotation accepted successfully! Subscription has been created.');
      fetchQuotationDetail(); // Refresh to show updated status
    } catch (err) {
      console.error('Error accepting quotation:', err);
      toast.error('Failed to accept quotation');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectQuotation = async () => {
    if (!quotation) return;

    const reason = prompt('Please provide a reason for rejection (optional):');

    try {
      setProcessing(true);
      const response = await fetch(
        `${API_URL}/subscriptions/quotations/${quotation.id}/reject/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData?.access}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: reason || '' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject quotation');
      }

      toast.success('Quotation rejected');
      fetchQuotationDetail(); // Refresh to show updated status
    } catch (err) {
      console.error('Error rejecting quotation:', err);
      toast.error('Failed to reject quotation');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    if (!quotation) return '';
    const symbol = quotation.currency?.symbol || '$';
    const code = quotation.currency?.code || 'USD';
    return `${symbol}${amount.toFixed(2)} ${code}`;
  };

  const isExpired = () => {
    if (!quotation) return false;
    return new Date(quotation.valid_until) < new Date();
  };

  const canTakeAction = () => {
    return quotation?.status === 'SENT' && !isExpired();
  };

  if (loading) {
    return (
      <div>
        <RetailerNavbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading subscription offer...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div>
        <RetailerNavbar />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error || 'Quotation not found'}</p>
                <Button onClick={() => router.back()} variant="outline">
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
              Back to Offers
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{quotation.quotation_number}</h1>
              <p className="text-gray-600">Subscription Offer Details</p>
            </div>
          </div>
          {canTakeAction() && (
            <div className="flex space-x-2">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleAcceptQuotation}
                disabled={processing}
              >
                <Check className="h-4 w-4 mr-2" />
                Accept Offer
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectQuotation}
                disabled={processing}
              >
                <X className="h-4 w-4 mr-2" />
                Reject Offer
              </Button>
            </div>
          )}
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
                    Offer Information
                  </CardTitle>
                  <Badge className={statusColors[quotation.status as keyof typeof statusColors]}>
                    {quotation.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Offer Number</p>
                    <p className="font-semibold">{quotation.quotation_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={statusColors[quotation.status as keyof typeof statusColors]}>
                      {quotation.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-semibold">{formatDate(quotation.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valid Until</p>
                    <p className="font-semibold">{formatDate(quotation.valid_until)}</p>
                    {isExpired() && (
                      <p className="text-xs text-red-600 mt-1">This offer has expired</p>
                    )}
                  </div>
                </div>
                
                {quotation.sent_at && (
                  <div>
                    <p className="text-sm text-gray-600">Sent On</p>
                    <p className="font-semibold">{formatDate(quotation.sent_at)}</p>
                  </div>
                )}

                {quotation.accepted_at && (
                  <div>
                    <p className="text-sm text-gray-600">Accepted On</p>
                    <p className="font-semibold text-green-600">{formatDate(quotation.accepted_at)}</p>
                  </div>
                )}

                {quotation.rejected_at && (
                  <div>
                    <p className="text-sm text-gray-600">Rejected On</p>
                    <p className="font-semibold text-red-600">{formatDate(quotation.rejected_at)}</p>
                    {quotation.rejection_reason && (
                      <p className="text-sm text-gray-600 mt-1">Reason: {quotation.rejection_reason}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Plan Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Subscription Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Plan Name</p>
                  <p className="text-xl font-bold">{quotation.plan.name}</p>
                </div>
                {quotation.plan.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-800">{quotation.plan.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Billing Frequency</p>
                    <p className="font-semibold">
                      Every {quotation.plan.billing_interval_count} {quotation.plan.billing_interval.toLowerCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(quotation.total_amount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            {quotation.items && quotation.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Included Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quotation.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-semibold">{item.product.name}</p>
                          <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Qty: {item.quantity}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(item.unit_price)} each</p>
                          <p className="font-bold text-blue-600">{formatCurrency(item.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-semibold">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(quotation.total_amount)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terms and Conditions */}
            {quotation.terms_and_conditions && (
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{quotation.terms_and_conditions}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Offer Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Current Status</p>
                    <Badge className={statusColors[quotation.status as keyof typeof statusColors]}>
                      {quotation.status}
                    </Badge>
                  </div>
                </div>
                
                {canTakeAction() && (
                  <div className="pt-4 space-y-2">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleAcceptQuotation}
                      disabled={processing}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accept This Offer
                    </Button>
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={handleRejectQuotation}
                      disabled={processing}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject This Offer
                    </Button>
                  </div>
                )}

                {isExpired() && quotation.status === 'SENT' && (
                  <div className="pt-4">
                    <Badge className="bg-orange-100 text-orange-800 w-full justify-center py-2">
                      This offer has expired
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validity Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Important Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Subscription Start</p>
                    <p className="font-semibold">{formatDate(quotation.start_date)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Offer Valid Until</p>
                    <p className="font-semibold">{formatDate(quotation.valid_until)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
