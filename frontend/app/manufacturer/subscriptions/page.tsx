"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// Subscription type definition
type Subscription = {
    number: string;
    customer: string;
    nextInvoice: string;
    recurring: string;
    plan: string;
    status: string;
}

// Empty subscriptions array - ready for API integration
const subscriptions: Subscription[] = [];

// Helper function to get badge variant based on status
const getStatusVariant = (status: string) => {
    switch (status) {
        case "Active":
            return "success"
        case "Quotation Sent":
            return "warning"
        case "Draft":
            return "secondary"
        default:
            return "default"
    }
}

export default function SubscriptionsPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRows, setSelectedRows] = useState<string[]>([])

    // Filter subscriptions based on search query
    const filteredSubscriptions = subscriptions.filter((sub) =>
        Object.values(sub).some((value) =>
            value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    )

    // Select all handler
    const handleSelectAll = () => {
        if (selectedRows.length === filteredSubscriptions.length) {
            setSelectedRows([])
        } else {
            setSelectedRows(filteredSubscriptions.map((sub) => sub.number))
        }
    }

    // Row selection handler
    const handleRowSelect = (subscriptionNumber: string) => {
        if (selectedRows.includes(subscriptionNumber)) {
            setSelectedRows(selectedRows.filter((num) => num !== subscriptionNumber))
        } else {
            setSelectedRows([...selectedRows, subscriptionNumber])
        }
    }

    // Delete handler
    const handleDelete = () => {
        console.log("Deleted:", selectedRows)
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
                            <TableHead>Next Invoice</TableHead>
                            <TableHead>Recurring</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubscriptions.length > 0 ? (
                            filteredSubscriptions.map((subscription) => (
                                <TableRow key={subscription.number}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedRows.includes(subscription.number)}
                                            onCheckedChange={() => handleRowSelect(subscription.number)}
                                            aria-label={`Select ${subscription.number}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {subscription.number}
                                    </TableCell>
                                    <TableCell>{subscription.customer}</TableCell>
                                    <TableCell>{subscription.nextInvoice}</TableCell>
                                    <TableCell>{subscription.recurring}</TableCell>
                                    <TableCell>{subscription.plan}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(subscription.status) as any}>
                                            {subscription.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No subscriptions found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Results Count */}
            {filteredSubscriptions.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
                </div>
            )}
        </div>
    )
}
