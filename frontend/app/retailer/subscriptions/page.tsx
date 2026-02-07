"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RetailerNavbar } from '@/components/retailer/nav_bar';
import { getSessionData } from '@/utils/session';
import { API_URL } from '@/utils/auth_fn';
import { Calendar, FileText, Search, Eye, Check, X, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Quotation {
  id: string;
  quotation_number: string;
  party: {
    id: string;
    name: string;
  };
  plan: {
    id: string;
    name: string;
    billing_interval: string;
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
  created_at: string;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
};

export default function RetailerSubscriptionsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const sessionData = getSessionData();

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/subscriptions/quotations/`, {
        headers: {
          'Authorization': `Bearer ${sessionData?.access}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quotations: ${response.status}`);
      }

      const data = await response.json();
      setQuotations(Array.isArray(data) ? data : data.quotations || []);
    } catch (err) {
      console.error('Error fetching quotations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuotation = async (quotationId: string) => {
    try {
      setProcessingId(quotationId);
      const response = await fetch(
        `${API_URL}/subscriptions/quotations/${quotationId}/accept/`,
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

      toast.success('Quotation accepted successfully!');
      fetchQuotations(); // Refresh the list
    } catch (err) {
      console.error('Error accepting quotation:', err);
      toast.error('Failed to accept quotation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectQuotation = async (quotationId: string) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    try {
      setProcessingId(quotationId);
      const response = await fetch(
        `${API_URL}/subscriptions/quotations/${quotationId}/reject/`,
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
      fetchQuotations(); // Refresh the list
    } catch (err) {
      console.error('Error rejecting quotation:', err);
      toast.error('Failed to reject quotation');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = quotation.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quotation.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | string, currency: any) => {
    const symbol = currency?.symbol || '$';
    const code = currency?.code || 'USD';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol}${numAmount.toFixed(2)} ${code}`;
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const canTakeAction = (quotation: Quotation) => {
    return quotation.status === 'SENT' && !isExpired(quotation.valid_until);
  };

  if (loading) {
    return (
      <div>
        <RetailerNavbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading subscription offers...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <RetailerNavbar />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchQuotations} variant="outline">
                  Try Again
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscription Offers</h1>
            <p className="text-gray-600 mt-2">View and manage subscription offers from manufacturers</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search offers..."
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
                  <SelectItem value="SENT">Pending</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quotations List */}
        <div className="space-y-4">
          {filteredQuotations.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {quotations.length === 0 ? 'No subscription offers found' : 'No offers match your filters'}
                  </p>
                  {quotations.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Subscription offers from manufacturers will appear here.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredQuotations.map((quotation) => (
              <Card key={quotation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    {/* Left side - Main info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                        <h3 className="text-lg font-semibold">{quotation.quotation_number || 'N/A'}</h3>
                        <div className="flex space-x-2">
                          <Badge className={statusColors[quotation.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                            {quotation.status}
                          </Badge>
                          {isExpired(quotation.valid_until) && quotation.status === 'SENT' && (
                            <Badge className="bg-orange-100 text-orange-800">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p><span className="font-medium">Plan:</span> {quotation.plan?.name || 'N/A'}</p>
                        <p><span className="font-medium">Billing:</span> {quotation.plan?.billing_interval || 'N/A'}</p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Start: {formatDate(quotation.start_date)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Valid Until: {formatDate(quotation.valid_until)}</span>
                        </div>
                      </div>
                      {quotation.sent_at && (
                        <p className="text-xs text-gray-500">
                          Sent on: {formatDate(quotation.sent_at)}
                        </p>
                      )}
                    </div>

                    {/* Right side - Amount and actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(quotation.total_amount, quotation.currency)}
                        </p>
                        <p className="text-sm text-gray-500">per {quotation.plan?.billing_interval?.toLowerCase() || 'month'}</p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/retailer/subscriptions/${quotation.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                        {canTakeAction(quotation) && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptQuotation(quotation.id)}
                              disabled={processingId === quotation.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectQuotation(quotation.id)}
                              disabled={processingId === quotation.id}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {filteredQuotations.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{filteredQuotations.length}</p>
                  <p className="text-sm text-gray-600">Total Offers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredQuotations.filter(q => q.status === 'SENT').length}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {filteredQuotations.filter(q => q.status === 'ACCEPTED').length}
                  </p>
                  <p className="text-sm text-gray-600">Accepted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {filteredQuotations.filter(q => q.status === 'REJECTED').length}
                  </p>
                  <p className="text-sm text-gray-600">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
