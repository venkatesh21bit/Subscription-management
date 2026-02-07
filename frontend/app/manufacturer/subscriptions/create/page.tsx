"use client"

import React, { useState } from "react"
import { Plus, Trash2, Send, Check, ArrowRight, FileText, TrendingUp, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type SubscriptionStatus = "Quotation" | "Quotation Sent" | "Confirmed"

export default function CreateSubscriptionPage() {
    const [status, setStatus] = useState<SubscriptionStatus>("Quotation")
    const [activeTab, setActiveTab] = useState("orderLines")
    const [showInvoice, setShowInvoice] = useState(false)
    const [invoiceState, setInvoiceState] = useState<"Draft" | "Confirmed">("Draft")

    return (
        <div className="container mx-auto py-6 px-4">
            {/* Header / Action Bar */}
            <div className="mb-6 flex flex-col gap-4">
                {/* Action Buttons Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Left Side Buttons - Conditional based on status */}
                    <div className="flex gap-2 flex-wrap">
                        {status === "Quotation" ? (
                            <>
                                <Button variant="secondary" className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    New
                                </Button>
                                <Button variant="destructive" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="gap-2"
                                    onClick={() => setStatus("Quotation Sent")}
                                >
                                    <Send className="h-4 w-4" />
                                    Send
                                </Button>
                                <Button
                                    variant="default"
                                    className="gap-2"
                                    onClick={() => setStatus("Confirmed")}
                                >
                                    <Check className="h-4 w-4" />
                                    Confirm
                                </Button>
                            </>
                        ) : status === "Quotation Sent" ? (
                            <>
                                <Button
                                    variant="default"
                                    className="gap-2"
                                    onClick={() => setStatus("Confirmed")}
                                >
                                    <Check className="h-4 w-4" />
                                    Confirm
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="gap-2"
                                    onClick={() => setStatus("Quotation")}
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button variant="outline" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                            </>
                        ) : status === "Confirmed" ? (
                            <>
                                <Button
                                    variant="default"
                                    className="gap-2"
                                    onClick={() => setShowInvoice(true)}
                                >
                                    <FileText className="h-4 w-4" />
                                    Create Invoice
                                </Button>
                                <Button variant="secondary" className="gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Upsell
                                </Button>
                                <Button variant="secondary" className="gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Renew
                                </Button>
                                <Button variant="secondary" className="gap-2">
                                    <X className="h-4 w-4" />
                                    Close
                                </Button>
                                <Button variant="destructive" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="secondary" className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    New
                                </Button>
                                <Button variant="destructive" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Right Side Status Pipeline */}
                    <div className="flex items-center gap-2 text-sm">
                        <button
                            onClick={() => setStatus("Quotation")}
                            className="cursor-pointer select-none transition-all"
                        >
                            <Badge
                                variant={status === "Quotation" ? "default" : "secondary"}
                                className={
                                    status === "Quotation"
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                                }
                            >
                                Quotation
                            </Badge>
                        </button>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <button
                            onClick={() => setStatus("Quotation Sent")}
                            className="cursor-pointer select-none transition-all"
                        >
                            <Badge
                                variant={status === "Quotation Sent" ? "default" : "secondary"}
                                className={
                                    status === "Quotation Sent"
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                                }
                            >
                                Quotation Sent
                            </Badge>
                        </button>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <button
                            onClick={() => setStatus("Confirmed")}
                            className="cursor-pointer select-none transition-all"
                        >
                            <Badge
                                variant={status === "Confirmed" ? "default" : "secondary"}
                                className={
                                    status === "Confirmed"
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                                }
                            >
                                Confirmed
                            </Badge>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Conditional Rendering */}
            {showInvoice ? (
                <div className="space-y-6">
                    {/* Invoice View Header */}
                    <div className="mb-6 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            {/* Invoice Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant="default"
                                    className="gap-2"
                                    onClick={() => {
                                        setInvoiceState("Confirmed")
                                        // Additional logic for confirming invoice
                                    }}
                                >
                                    <Check className="h-4 w-4" />
                                    Confirm
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="gap-2"
                                    onClick={() => setShowInvoice(false)}
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button variant="destructive" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Sub-Header Toggle for Draft/Confirmed */}
                    <div className="flex gap-2 border-b">
                        <button
                            onClick={() => setInvoiceState("Draft")}
                            className={`px-4 py-2 font-medium transition-all ${invoiceState === "Draft"
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Draft
                        </button>
                        <button
                            onClick={() => setInvoiceState("Confirmed")}
                            className={`px-4 py-2 font-medium transition-all ${invoiceState === "Confirmed"
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Confirmed
                        </button>
                    </div>

                    {/* Invoice Form Card */}
                    <Card>
                        <CardContent className="pt-6">
                            {invoiceState === "Draft" ? (
                                <>
                                    {/* Invoice Fields Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="invoiceCustomer">Customer Name</Label>
                                            <Select>
                                                <SelectTrigger id="invoiceCustomer">
                                                    <SelectValue placeholder="Select Customer..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="new">
                                                        Create new customer
                                                    </SelectItem>
                                                    <SelectItem value="apple">Apple Inc</SelectItem>
                                                    <SelectItem value="microsoft">
                                                        Microsoft Corp
                                                    </SelectItem>
                                                    <SelectItem value="google">Google LLC</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="invoiceDate">Invoice Date</Label>
                                            <Input id="invoiceDate" type="date" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dueDate">Due Date</Label>
                                            <Input id="dueDate" type="date" />
                                        </div>
                                    </div>

                                    {/* Tabs for Order Lines and Other Info */}
                                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                                        <TabsList className="grid w-full max-w-md grid-cols-2">
                                            <TabsTrigger value="orderLines">Order Lines</TabsTrigger>
                                            <TabsTrigger value="otherInfo">Other Info</TabsTrigger>
                                        </TabsList>

                                        {/* Order Lines Tab */}
                                        <TabsContent value="orderLines" className="mt-4">
                                            <div className="rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Product</TableHead>
                                                            <TableHead>Quantity</TableHead>
                                                            <TableHead>Unit Price</TableHead>
                                                            <TableHead>Discount (%)</TableHead>
                                                            <TableHead>Taxes</TableHead>
                                                            <TableHead className="text-right">
                                                                Amount
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        <TableRow>
                                                            <TableCell
                                                                colSpan={6}
                                                                className="text-center py-8 text-gray-500"
                                                            >
                                                                No order lines added yet. Click "Add Line" to
                                                                get started.
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <div className="mt-4">
                                                <Button variant="outline" className="gap-2">
                                                    <Plus className="h-4 w-4" />
                                                    Add Line
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        {/* Other Info Tab */}
                                        <TabsContent value="otherInfo" className="mt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="salesperson">Salesperson</Label>
                                                    <Input
                                                        id="salesperson"
                                                        placeholder="Enter salesperson name"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="startDate">Start Date</Label>
                                                    <Input id="startDate" type="date" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="paymentMethod">Payment Method</Label>
                                                    <Select>
                                                        <SelectTrigger id="paymentMethod">
                                                            <SelectValue placeholder="Select method..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="credit_card">
                                                                Credit Card
                                                            </SelectItem>
                                                            <SelectItem value="bank_transfer">
                                                                Bank Transfer
                                                            </SelectItem>
                                                            <SelectItem value="cash">Cash</SelectItem>
                                                            <SelectItem value="check">Check</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2 flex items-center gap-2 pt-8">
                                                    <input
                                                        type="checkbox"
                                                        id="paymentDone"
                                                        className="h-4 w-4 rounded border-gray-300"
                                                    />
                                                    <Label htmlFor="paymentDone" className="cursor-pointer">
                                                        Payment Done
                                                    </Label>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <p className="text-lg">Invoice confirmed view is not implemented yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : status === "Quotation" || status === "Quotation Sent" || status === "Confirmed" ? (
                <div className="space-y-6">
                    {/* Form Card */}
                    <Card>
                        <CardContent className="pt-6">
                            {/* Row 1: Top Form - Two Columns */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="subscriptionNumber">
                                            Subscription Number
                                        </Label>
                                        <Input
                                            id="subscriptionNumber"
                                            value="Draft"
                                            readOnly
                                            className="bg-gray-50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customer">Customer</Label>
                                        <Select>
                                            <SelectTrigger id="customer">
                                                <SelectValue placeholder="Select Customer..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="new">
                                                    Create new customer
                                                </SelectItem>
                                                <SelectItem value="apple">Apple Inc</SelectItem>
                                                <SelectItem value="microsoft">
                                                    Microsoft Corp
                                                </SelectItem>
                                                <SelectItem value="google">Google LLC</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Right Column - Conditional based on status */}
                                <div className="space-y-4">
                                    {status === "Confirmed" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="orderDate">Order Date</Label>
                                            <Input id="orderDate" type="date" />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="expiration">Expiration</Label>
                                        <Input id="expiration" type="date" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="recurringPlan">Recurring Plan</Label>
                                        <Select>
                                            <SelectTrigger id="recurringPlan">
                                                <SelectValue placeholder="Select plan..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="quarterly">
                                                    Quarterly
                                                </SelectItem>
                                                <SelectItem value="yearly">Yearly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="paymentTerms">Payment Terms</Label>
                                        <Select>
                                            <SelectTrigger id="paymentTerms">
                                                <SelectValue placeholder="Select terms..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="immediate">Immediate</SelectItem>
                                                <SelectItem value="15days">15 Days</SelectItem>
                                                <SelectItem value="30days">30 Days</SelectItem>
                                                <SelectItem value="60days">60 Days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {status === "Confirmed" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="nextInvoice">Next Invoice</Label>
                                            <Input id="nextInvoice" type="date" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 2 & 3: Tabs for Order Lines and Other Info */}
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full max-w-md grid-cols-2">
                                    <TabsTrigger value="orderLines">Order Lines</TabsTrigger>
                                    <TabsTrigger value="otherInfo">Other Info</TabsTrigger>
                                </TabsList>

                                {/* Order Lines Tab */}
                                <TabsContent value="orderLines" className="mt-4">
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Unit Price</TableHead>
                                                    <TableHead>Discount (%)</TableHead>
                                                    <TableHead>Taxes</TableHead>
                                                    <TableHead className="text-right">
                                                        Amount
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={6}
                                                        className="text-center py-8 text-gray-500"
                                                    >
                                                        No order lines added yet. Click "Add Line" to
                                                        get started.
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="mt-4">
                                        <Button variant="outline" className="gap-2">
                                            <Plus className="h-4 w-4" />
                                            Add Line
                                        </Button>
                                    </div>
                                </TabsContent>

                                {/* Other Info Tab */}
                                <TabsContent value="otherInfo" className="mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="salesperson">Salesperson</Label>
                                            <Input
                                                id="salesperson"
                                                placeholder="Enter salesperson name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="startDate">Start Date</Label>
                                            <Input id="startDate" type="date" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="paymentMethod">Payment Method</Label>
                                            <Select>
                                                <SelectTrigger id="paymentMethod">
                                                    <SelectValue placeholder="Select method..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="credit_card">
                                                        Credit Card
                                                    </SelectItem>
                                                    <SelectItem value="bank_transfer">
                                                        Bank Transfer
                                                    </SelectItem>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="check">Check</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 flex items-center gap-2 pt-8">
                                            <input
                                                type="checkbox"
                                                id="paymentDone"
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <Label htmlFor="paymentDone" className="cursor-pointer">
                                                Payment Done
                                            </Label>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                // Placeholder for other states
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-gray-500">
                            <p className="text-lg">
                                View for <span className="font-semibold">{status}</span> state is
                                not implemented yet.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
