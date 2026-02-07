"use client";
import React from 'react';
import { Navbar } from '@/components/manufacturer/nav_bar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navbar />
      <main>{children}</main>
    </div>
  );
}