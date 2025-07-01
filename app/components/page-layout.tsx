import type React from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "./button";

interface PageLayoutProps {
  /**
   * The title to display in the page header
   */
  title: string;

  /**
   * Function to call when the back button is clicked
   */
  onBack?: () => void;

  /**
   * Content to render in the footer area
   */
  footer?: React.ReactNode;

  /**
   * Main content of the page
   */
  children: React.ReactNode;
}

export function PageLayout({
  title,
  onBack,
  footer,
  children,
}: PageLayoutProps) {
  let backEl = onBack ? (
    <Button onClick={onBack} className="p-2" aria-label="Go back">
      <ArrowLeftIcon className="h-6 w-6" />
    </Button>
  ) : (
    <div className="w-10"></div> /* Empty placeholder to maintain layout when no back button */
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
        {backEl}
        <h1 className="text-lg font-bold">{title}</h1>
        <div className="w-10"></div> {/* Placeholder for symmetry */}
      </header>

      <main className="flex-grow overflow-y-auto">{children}</main>

      {footer && (
        <footer className="p-4 border-t border-slate-200 space-y-2">
          {footer}
        </footer>
      )}
    </div>
  );
}
