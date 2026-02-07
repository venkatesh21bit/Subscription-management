"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Trash2, Receipt, Send } from "lucide-react"
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
                            <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    Loading subscriptions...
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-red-500">
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
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
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
        </div>
    )
}
