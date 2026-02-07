"use client";
import React from "react";
import Link from "next/link";
import { Settings, Tag, Receipt, Clock, FileText, Grid3x3 } from "lucide-react";

const CONFIGURATION_OPTIONS = [
  {
    title: "Discounts",
    description: "Manage discount rules and promotions",
    href: "/manufacturer/configuration/discounts",
    icon: Tag,
  },
  {
    title: "Taxes",
    description: "Configure tax rates and computations",
    href: "/manufacturer/configuration/taxes",
    icon: Receipt,
  },
  {
    title: "Attributes",
    description: "Define product attributes and values",
    href: "/manufacturer/configuration/attributes",
    icon: Grid3x3,
  },
  {
    title: "Recurring Plans",
    description: "Set up subscription and recurring billing plans",
    href: "/manufacturer/configuration/recurring-plans",
    icon: Clock,
  },
  {
    title: "Quotation Templates",
    description: "Create and manage quotation templates",
    href: "/manufacturer/configuration/quotation-templates",
    icon: FileText,
  },
];

export default function ConfigurationPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configuration</h1>
          <p className="text-gray-400">Manage your system settings and configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CONFIGURATION_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.title}
                href={option.href}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-pink-600"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-pink-600 rounded-lg p-3">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{option.title}</h3>
                    <p className="text-sm text-gray-400">{option.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}