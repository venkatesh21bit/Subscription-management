"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Trash2, Receipt, Send, CheckCircle, Play, Clock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { api } from "@/utils/api"

// Subscription type definition matching API response
type Subscription = {
    id: string;
    subscription_number: string;
    customer: string;
    customer_id: string;
    full_name: string;
    expiration: string | null;
    monthly: string;
    plan_name: string;
    recurring_plan: string;
    status: string;
    status_display: string;
    start_date: string;
    created_at: string;
    last_billing_date: string | null;
    next_billing_date: string | null;
    billing_interval: string | null;
    billing_interval_display: string | null;
    billing_cycle_count: number;
}

type SimulationResult = {
    success: boolean;
    message: string;
    invoice?: {
        invoice_number: string;
        total_amount: number;
        currency: string;
    };
    check: {
        billing_interval_display: string;
        next_billing_date: string;
        is_due: boolean;
        days_overdue: number;
        days_remaining: number;
        cycles_completed: number;
        new_next_billing_date?: string;
        new_cycles_completed?: number;
    };
}

// Helper function to get badge variant based on status
const getStatusVariant = (status: string) => {
    switch (status) {
        case "ACTIVE":
            return "default"
        case "QUOTATION":
            return "secondary" 
        case "CONFIRMED":
            return "default"
        case "DRAFT":
            return "secondary"
        case "PAUSED":
            return "warning"
        case "CANCELLED":
            return "destructive"
        case "CLOSED":
            return "outline"
        default:
            return "secondary"
    }
}

// Helper function to format date
const formatDate = (dateString: string | null) => {
    if (!dateString) return "No end date"
    return new Date(dateString).toLocaleDateString()
}

export default function SubscriptionsPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRows, setSelectedRows] = useState<string[]>([])
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sendingInvoice, setSendingInvoice] = useState<string | null>(null)
    const [bulkBilling, setBulkBilling] = useState(false)
    const [simulatingId, setSimulatingId] = useState<string | null>(null)
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
    const [showSimResult, setShowSimResult] = useState(false)

    // Fetch subscriptions from API
    const fetchSubscriptions = async () => {
        try {
            setLoading(true)
            setError(null)
            
            const response = await api<{subscriptions: Subscription[], count: number}>(
                '/subscriptions/subscriptions/',
                { method: 'GET' }
            )
            
            if (response.error) {
                setError(response.error)
            } else if (response.data) {
                setSubscriptions(response.data.subscriptions)
            }
        } catch (err) {
            setError('Failed to fetch subscriptions')
            console.error('Error fetching subscriptions:', err)
        } finally {
            setLoading(false)
        }
    }

    // Load subscriptions on component mount
    useEffect(() => {
        fetchSubscriptions()
    }, [])

    // Send invoice for a subscription
    const handleSendInvoice = async (subscriptionId: string) => {
        try {
            setSendingInvoice(subscriptionId)
            
            const response = await api<{ invoice: { invoice_number: string } }>(
                `/subscriptions/subscriptions/${subscriptionId}/generate-invoice/`,
                { 
                    method: 'POST',
                    body: JSON.stringify({
                        auto_post: true
                    })
                }
            )
            
            if (response.error) {
                toast.error(response.error)
            } else if (response.data) {
                toast.success(`Invoice ${response.data.invoice.invoice_number} sent successfully!`)
                // Optionally refresh subscriptions to update status
                fetchSubscriptions()
            }
        } catch (err) {
            toast.error('Failed to send invoice')
            console.error('Error sending invoice:', err)
        } finally {
            setSendingInvoice(null)
        }
    }

    // Process bulk billing
    const handleBulkBilling = async () => {
        try {
            setBulkBilling(true)
            
            const response = await api<{ results: { successful: number; failed: number } }>(
                '/subscriptions/subscriptions/bulk-billing/',
                { method: 'POST' }
            )
            
            if (response.error) {
                toast.error(response.error)
            } else if (response.data) {
                const { results } = response.data
                toast.success(
                    `Bulk billing completed! ${results.successful} invoices created, ${results.failed} failed.`
                )
                // Refresh subscriptions
                fetchSubscriptions()
            }
        } catch (err) {
            toast.error('Failed to process bulk billing')
            console.error('Error processing bulk billing:', err)
        } finally {
            setBulkBilling(false)
        }
    }

    // Simulate recurring payment
    const handleSimulateRecurring = async (subscriptionId: string) => {
        try {
            setSimulatingId(subscriptionId)
            setSimulationResult(null)
            
            const response = await api<SimulationResult>(
                `/subscriptions/subscriptions/${subscriptionId}/simulate-recurring/`,
                { 
                    method: 'POST',
                    body: JSON.stringify({ force: true })
                }
            )
            
            if (response.data) {
                setSimulationResult(response.data)
                setShowSimResult(true)
                if (response.data.success) {
                    toast.success(response.data.message)
                    fetchSubscriptions()
                } else {
                    toast.info(response.data.message)
                }
            } else if (response.error) {
                toast.error(response.error)
            }
        } catch (err) {
            toast.error('Failed to simulate recurring payment')
            console.error('Error simulating recurring:', err)
        } finally {
            setSimulatingId(null)
        }
    }

    // Filter subscriptions based on search query
    const filteredSubscriptions = subscriptions.filter((sub) =>
        sub.subscription_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.plan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.status.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Select all handler
    const handleSelectAll = () => {
        if (selectedRows.length === filteredSubscriptions.length) {
            setSelectedRows([])
        } else {
            setSelectedRows(filteredSubscriptions.map((sub) => sub.id))
        }
    }

    // Row selection handler
    const handleRowSelect = (subscriptionId: string) => {
        if (selectedRows.includes(subscriptionId)) {
            setSelectedRows(selectedRows.filter((id) => id !== subscriptionId))
        } else {
            setSelectedRows([...selectedRows, subscriptionId])
        }
    }

    // Delete handler
    const handleDelete = async () => {
        console.log("Delete subscriptions:", selectedRows)
        // TODO: Implement delete API call
        setSelectedRows([])
    }

    // Check if all rows are selected
    const isAllSelected = filteredSubscriptions.length > 0 && selectedRows.length === filteredSubscriptions.length
    const isIndeterminate = selectedRows.length > 0 && selectedRows.length < filteredSubscriptions.length

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-6">Subscriptions</h1>

                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search subscriptions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleBulkBilling}
                            disabled={bulkBilling || loading}
                        >
                            <Receipt className="h-4 w-4" />
                            {bulkBilling ? 'Processing...' : 'Bulk Billing'}
                        </Button>
                        <Button
                            variant="default"
                            className="gap-2"
                            onClick={() => router.push("/manufacturer/subscriptions/create")}
                        >
                            <Plus className="h-4 w-4" />
                            New
                        </Button>
                        <Button
                            variant="destructive"
                            className="gap-2"
                            disabled={selectedRows.length === 0}
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete {selectedRows.length > 0 && `(${selectedRows.length})`}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all"
                                    className={isIndeterminate ? "data-[state=checked]:bg-primary" : ""}
                                />
                            </TableHead>
                            <TableHead className="w-[100px]">Number</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Expiration</TableHead>
                            <TableHead>Recurring</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Next Billing</TableHead>
                            <TableHead className="w-[240px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                    Loading subscriptions...
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-red-500">
                                    Error: {error}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={fetchSubscriptions}
                                        className="ml-2"
                                    >
                                        Retry
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : filteredSubscriptions.length > 0 ? (
                            filteredSubscriptions.map((subscription) => (
                                <TableRow key={subscription.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedRows.includes(subscription.id)}
                                            onCheckedChange={() => handleRowSelect(subscription.id)}
                                            aria-label={`Select ${subscription.subscription_number}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {subscription.subscription_number}
                                    </TableCell>
                                    <TableCell>{subscription.customer}</TableCell>
                                    <TableCell>{formatDate(subscription.expiration)}</TableCell>
                                    <TableCell>{subscription.recurring_plan}</TableCell>
                                    <TableCell>{subscription.plan_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(subscription.status) as any}>
                                            {subscription.status_display}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            {subscription.next_billing_date ? (
                                                <>
                                                    <div className="font-medium">{formatDate(subscription.next_billing_date)}</div>
                                                    <div className="text-muted-foreground">
                                                        {subscription.billing_interval_display} · Cycle #{subscription.billing_cycle_count}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {subscription.last_billing_date ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 opacity-60 cursor-default"
                                                    disabled
                                                >
                                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                                    Sent
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                    onClick={() => handleSendInvoice(subscription.id)}
                                                    disabled={
                                                        sendingInvoice === subscription.id || 
                                                        (subscription.status !== 'ACTIVE' && subscription.status !== 'CONFIRMED')
                                                    }
                                                >
                                                    <Send className="h-3 w-3" />
                                                    {sendingInvoice === subscription.id ? 'Sending...' : 'Send Invoice'}
                                                </Button>
                                            )}
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-1"
                                                onClick={() => handleSimulateRecurring(subscription.id)}
                                                disabled={
                                                    simulatingId === subscription.id ||
                                                    (subscription.status !== 'ACTIVE' && subscription.status !== 'CONFIRMED')
                                                }
                                                title="Simulate recurring payment (fast-forward billing cycle)"
                                            >
                                                <Zap className="h-3 w-3" />
                                                {simulatingId === subscription.id ? 'Simulating...' : 'Simulate'}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                    No subscriptions found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Results Count */}
            {!loading && !error && (
                <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
                </div>
            )}

            {/* Simulation Result Dialog */}
            {showSimResult && simulationResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSimResult(false)}>
                    <div className="bg-background border rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Recurring Payment Simulation
                        </h3>
                        
                        <div className={`rounded-md p-3 mb-4 text-sm ${
                            simulationResult.success 
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20'
                        }`}>
                            {simulationResult.message}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Billing Interval:</span>
                                <span className="font-medium">{simulationResult.check.billing_interval_display}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Was Due:</span>
                                <span className="font-medium">{simulationResult.check.is_due ? `Yes (${simulationResult.check.days_overdue} days overdue)` : `No (${simulationResult.check.days_remaining} days remaining)`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cycles Completed:</span>
                                <span className="font-medium">{simulationResult.check.new_cycles_completed ?? simulationResult.check.cycles_completed}</span>
                            </div>
                            {simulationResult.check.new_next_billing_date && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Next Billing:</span>
                                    <span className="font-medium">{formatDate(simulationResult.check.new_next_billing_date)}</span>
                                </div>
                            )}
                            {simulationResult.invoice && (
                                <>
                                    <hr className="my-2" />
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Invoice:</span>
                                        <span className="font-medium">{simulationResult.invoice.invoice_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Amount:</span>
                                        <span className="font-medium">{simulationResult.invoice.currency} {simulationResult.invoice.total_amount}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <Button className="w-full mt-4" onClick={() => setShowSimResult(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
