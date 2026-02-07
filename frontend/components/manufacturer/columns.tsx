"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, XCircle, Clock, Loader } from "lucide-react";
import { JSX } from "react";

// Define the shape of the payment data
export type Payment = {
  id: string;
  amount: number;
  status: "pending" | "processing" | "success" | "failed";
  email: string;
};

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const statusColors: Record<string, { icon: JSX.Element; color: string }> = {
        success: { icon: <CheckCircle className="w-4 h-4 text-green-400" />, color: "text-green-400" },
        pending: { icon: <Clock className="w-4 h-4 text-yellow-400" />, color: "text-yellow-400" },
        processing: { icon: <Loader className="w-4 h-4 text-blue-400 animate-spin" />, color: "text-blue-400" },
        failed: { icon: <XCircle className="w-4 h-4 text-red-400" />, color: "text-red-400" },
      };

      return (
        <div className="flex items-center gap-2">
          {statusColors[status]?.icon}
          <span className={statusColors[status]?.color}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="font-mono text-gray-300">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-medium text-gray-200">₹{row.original.amount.toLocaleString()}</span>
    ),
  },
];
