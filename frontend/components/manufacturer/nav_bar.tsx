import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Anchor from "@/components/retailer/anchor";
import { logout } from "@/utils/api";

export const NAVLINKS = [
  { title: "Subscriptions", href: "/manufacturer/subscriptions" },
  { title: "Dashboard", href: "/manufacturer" },
  { title: "Bills", href: "/manufacturer/bills" },
  { title: "Products", href: "/manufacturer/products" },
  { title: "Connections", href: "/manufacturer/connections" },
  { title: "Company Code", href: "/manufacturer/company-code" },
  { title: "Profile", href: "/manufacturer/profile" },
  { title: "Company", href: "/manufacturer/company" },
];

export const CONFIGURATION_LINKS = [
  { title: "Discounts", href: "/manufacturer/configuration/discounts" },
  { title: "Taxes", href: "/manufacturer/configuration/taxes" },
  { title: "Attributes", href: "/manufacturer/configuration/attributes" },
  { title: "Recurring Plans", href: "/manufacturer/configuration/recurring-plans" },
  { title: "Quotation Templates", href: "/manufacturer/configuration/quotation-templates" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Mobile menu button */}
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className={`${mobileOpen ? "hidden" : "block"} h-6 w-6`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              {/* Close icon */}
              <svg
                className={`${mobileOpen ? "block" : "hidden"} h-6 w-6`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Logo and desktop nav */}
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <Link href="/manufacturer" className="flex shrink-0 items-center">
              {/* SVG Logo */}
              <svg
                className="h-10 w-10"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="100" height="100" rx="20" fill="#3B82F6" />
                <path
                  d="M25 30h50v40H25V30zm10 10v20h30V40H35z"
                  fill="white"
                />
                <circle cx="30" cy="45" r="3" fill="#3B82F6" />
                <circle cx="70" cy="45" r="3" fill="#3B82F6" />
                <path
                  d="M40 50h20v5H40v-5z"
                  fill="#3B82F6"
                />
              </svg>
              <span className="ml-2 text-lg font-bold text-blue-400">Manufacturer</span>
            </Link>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {NAVLINKS.map((item) => (
                  <Anchor
                    key={item.title}
                    href={item.href}
                    activeClassName="bg-gray-900 text-white"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    {item.title}
                  </Anchor>
                ))}
                {/* Configuration dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setConfigOpen(!configOpen)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    Configuration
                    <svg
                      className={`inline-block ml-1 h-4 w-4 transition-transform ${configOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {configOpen && (
                    <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        {CONFIGURATION_LINKS.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            onClick={() => setConfigOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Right section: Log out button */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              suppressHydrationWarning
            >
              Log out
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      <div className={`sm:hidden ${mobileOpen ? "block" : "hidden"}`} id="mobile-menu">
        <div className="space-y-1 px-2 pt-2 pb-3">
          {NAVLINKS.map((item) => (
            <Anchor
              key={item.title}
              href={item.href}
              activeClassName="bg-gray-900 text-white"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {item.title}
            </Anchor>
          ))}
          {/* Configuration section */}
          <div>
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className="w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Configuration
              <svg
                className={`inline-block ml-1 h-4 w-4 transition-transform ${configOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {configOpen && (
              <div className="pl-4 space-y-1">
                {CONFIGURATION_LINKS.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}