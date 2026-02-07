"use client";
import React from 'react';

export default function RetailerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950">
      <main>{children}</main>
    </div>
  );
}