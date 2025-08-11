import type React from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/button";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";

interface EntityPageLayoutProps {
  pageTitle: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  headerContent?: React.ReactNode;
}

export function EntityPageLayout({
  pageTitle,
  onAdd,
  addLabel = "Add New",
  children,
  footerContent,
  headerContent,
}: EntityPageLayoutProps) {
  const navigate = useNavigate();

  const handleNavigateBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button
          onClick={handleNavigateBack}
          className="p-2"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">{pageTitle}</h1>
        {headerContent}
        {onAdd ? (
          <Button onClick={onAdd} className="p-2" aria-label={addLabel}>
            <PlusIcon className="h-6 w-6" />
          </Button>
        ) : (
          <div className="w-10"></div> // Placeholder to keep alignment
        )}
      </header>

      <main className="flex-grow overflow-y-auto">{children}</main>

      {footerContent && (
        <footer className="p-4 border-t border-slate-200 space-y-2">
          {footerContent}
        </footer>
      )}
    </div>
  );
}
