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
import {
  Calendar, FileText, Search, Eye, Check, X, Clock,
  Pause, Play, Power, RefreshCw, Package
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type TabType = 'subscriptions' | 'offers';

interface Quotation {
  id: string;
  quotation_number: string;
  party: { id: string; name: string; };
  plan: { id: string; name: string; billing_interval: string; };
  status: string;
  valid_until: string;
  start_date: string;
  total_amount: number;
  currency: { code: string; symbol: string; };
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  subscription_number: string;
  plan_name: string;
  status: string;
  status_display: string;
  start_date: string | null;
  end_date: string | null;
  next_billing_date: string | null;
  billing_cycle_count: number;
  monthly_value: number;
  currency: { code: string; symbol: string; };
  billing_interval: string;
  billing_interval_display: string;
  is_pausable: boolean;
  is_closable: boolean;
  is_renewable: boolean;
  is_auto_closable: boolean;
  created_at: string | null;
}

const quotationStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
};

const subscriptionStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  QUOTATION: 'bg-indigo-100 text-indigo-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function RetailerSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('subscriptions');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subsSearchTerm, setSubsSearchTerm] = useState('');
  const [subsStatusFilter, setSubsStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const sessionData = getSessionData();

  useEffect(() => {
    fetchQuotations();
    fetchSubscriptions();
  }, []);

  // ========== QUOTATION METHODS ==========

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/subscriptions/quotations/`, {
        headers: {
          'Authorization': `Bearer ${sessionData?.access}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch quotations: ${response.status}`);
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
      if (!response.ok) throw new Error('Failed to accept quotation');
      toast.success('Quotation accepted successfully!');
      fetchQuotations();
      fetchSubscriptions();
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
      if (!response.ok) throw new Error('Failed to reject quotation');
      toast.success('Quotation rejected');
      fetchQuotations();
    } catch (err) {
      console.error('Error rejecting quotation:', err);
      toast.error('Failed to reject quotation');
    } finally {
      setProcessingId(null);
    }
  };

  // ========== SUBSCRIPTION METHODS ==========

  const fetchSubscriptions = async () => {
    try {
      setSubsLoading(true);
      const response = await fetch(`${API_URL}/subscriptions/my-subscriptions/`, {
        headers: {
          'Authorization': `Bearer ${sessionData?.access}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch subscriptions: ${response.status}`);
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setSubsLoading(false);
    }
  };

  const handleSubscriptionAction = async (subscriptionId: string, action: string) => {
    let reason = '';
    if (action === 'close') {
      const r = prompt('Reason for closing subscription (optional):');
      if (r === null) return; // User cancelled
      reason = r || '';
    }

    try {
      setProcessingId(subscriptionId);
      const response = await fetch(
        `${API_URL}/subscriptions/my-subscriptions/${subscriptionId}/action/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData?.access}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action, reason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} subscription`);
      }

      toast.success(data.message || `Subscription ${action} successful`);
      fetchSubscriptions();
    } catch (err) {
      console.error(`Error ${action} subscription:`, err);
      toast.error(err instanceof Error ? err.message : `Failed to ${action} subscription`);
    } finally {
      setProcessingId(null);
    }
  };

  // ========== HELPERS ==========

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesSearch = s.subscription_number?.toLowerCase().includes(subsSearchTerm.toLowerCase()) ||
                         s.plan_name?.toLowerCase().includes(subsSearchTerm.toLowerCase());
    const matchesStatus = subsStatusFilter === 'all' || s.status === subsStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | string, currency: any) => {
    const symbol = currency?.symbol || '$';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol}${numAmount.toFixed(2)}`;
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();
  const canTakeAction = (q: Quotation) => q.status === 'SENT' && !isExpired(q.valid_until);

  return (
    <div>
      <RetailerNavbar />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-gray-600 mt-1">Manage your subscriptions and view offers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b pb-2">
          <Button
            variant={activeTab === 'subscriptions' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('subscriptions')}
            className="relative"
          >
            <Package className="h-4 w-4 mr-2" />
            My Subscriptions
            {subscriptions.filter(s => s.status === 'ACTIVE').length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 text-xs">
                {subscriptions.filter(s => s.status === 'ACTIVE').length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'offers' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('offers')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Subscription Offers
            {quotations.filter(q => q.status === 'SENT').length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 text-xs">
                {quotations.filter(q => q.status === 'SENT').length}
              </Badge>
            )}
          </Button>
        </div>

        {/* ==================== MY SUBSCRIPTIONS TAB ==================== */}
        {activeTab === 'subscriptions' && (
          <>
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search subscriptions..."
                      value={subsSearchTerm}
                      onChange={(e) => setSubsSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={subsStatusFilter} onValueChange={setSubsStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => { setSubsSearchTerm(''); setSubsStatusFilter('all'); }}>
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {subsLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading subscriptions...</span>
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {subscriptions.length === 0
                        ? 'No subscriptions yet'
                        : 'No subscriptions match your filters'}
                    </p>
                    {subscriptions.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Accept a subscription offer to get started.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSubscriptions.map((sub) => (
                  <Card key={sub.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                        {/* Left: Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                            <h3 className="text-lg font-semibold">{sub.subscription_number}</h3>
                            <Badge className={subscriptionStatusColors[sub.status] || 'bg-gray-100 text-gray-800'}>
                              {sub.status_display || sub.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-700">{sub.plan_name}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            {sub.start_date && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>Started: {formatDate(sub.start_date)}</span>
                              </div>
                            )}
                            {sub.end_date && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>Ends: {formatDate(sub.end_date)}</span>
                              </div>
                            )}
                            {sub.next_billing_date && sub.status === 'ACTIVE' && (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>Next billing: {formatDate(sub.next_billing_date)}</span>
                              </div>
                            )}
                          </div>
                          {sub.billing_cycle_count > 0 && (
                            <p className="text-xs text-gray-500">
                              Billing cycles completed: {sub.billing_cycle_count}
                            </p>
                          )}
                          {/* Plan capabilities badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sub.is_pausable && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                <Pause className="h-3 w-3 mr-1" /> Pausable
                              </span>
                            )}
                            {sub.is_closable && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                                <Power className="h-3 w-3 mr-1" /> Closable
                              </span>
                            )}
                            {sub.is_renewable && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                                <RefreshCw className="h-3 w-3 mr-1" /> Renewable
                              </span>
                            )}
                            {sub.is_auto_closable && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">
                                Auto-close
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Amount + Actions */}
                        <div className="flex flex-col items-end space-y-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(sub.monthly_value, sub.currency)}
                            </p>
                            <p className="text-sm text-gray-500">
                              per {sub.billing_interval_display?.toLowerCase() || sub.billing_interval?.toLowerCase() || 'month'}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {/* Pause (only for ACTIVE + pausable) */}
                            {sub.status === 'ACTIVE' && sub.is_pausable && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                                disabled={processingId === sub.id}
                                onClick={() => handleSubscriptionAction(sub.id, 'pause')}
                              >
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </Button>
                            )}

                            {/* Resume (only for PAUSED) */}
                            {sub.status === 'PAUSED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                disabled={processingId === sub.id}
                                onClick={() => handleSubscriptionAction(sub.id, 'resume')}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Resume
                              </Button>
                            )}

                            {/* Close (ACTIVE or PAUSED + closable) */}
                            {['ACTIVE', 'PAUSED'].includes(sub.status) && sub.is_closable && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                disabled={processingId === sub.id}
                                onClick={() => handleSubscriptionAction(sub.id, 'close')}
                              >
                                <Power className="h-4 w-4 mr-1" />
                                Close
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Subscription Stats */}
            {subscriptions.length > 0 && (
              <Card className="mt-6">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{subscriptions.length}</p>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {subscriptions.filter(s => s.status === 'ACTIVE').length}
                      </p>
                      <p className="text-sm text-gray-600">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {subscriptions.filter(s => s.status === 'PAUSED').length}
                      </p>
                      <p className="text-sm text-gray-600">Paused</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {subscriptions.filter(s => s.status === 'CONFIRMED').length}
                      </p>
                      <p className="text-sm text-gray-600">Confirmed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-500">
                        {subscriptions.filter(s => s.status === 'CLOSED' || s.status === 'CANCELLED').length}
                      </p>
                      <p className="text-sm text-gray-600">Closed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ==================== OFFERS TAB ==================== */}
        {activeTab === 'offers' && (
          <>
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
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
                  <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading offers...</span>
              </div>
            ) : filteredQuotations.length === 0 ? (
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
              <div className="space-y-4">
                {filteredQuotations.map((quotation) => (
                  <Card key={quotation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                            <h3 className="text-lg font-semibold">{quotation.quotation_number || 'N/A'}</h3>
                            <div className="flex space-x-2">
                              <Badge className={quotationStatusColors[quotation.status] || 'bg-gray-100 text-gray-800'}>
                                {quotation.status}
                              </Badge>
                              {isExpired(quotation.valid_until) && quotation.status === 'SENT' && (
                                <Badge className="bg-orange-100 text-orange-800">Expired</Badge>
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
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(quotation.total_amount, quotation.currency)}
                            </p>
                            <p className="text-sm text-gray-500">
                              per {quotation.plan?.billing_interval?.toLowerCase() || 'month'}
                            </p>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/retailer/subscriptions/${quotation.id}`}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
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
                                  <Check className="h-4 w-4 mr-1" /> Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectQuotation(quotation.id)}
                                  disabled={processingId === quotation.id}
                                >
                                  <X className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quotation Stats */}
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
          </>
        )}
      </div>
    </div>
  );
}
