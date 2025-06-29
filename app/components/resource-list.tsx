import type React from "react";

interface ResourceListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  isLoading: boolean;
  error: string | null;
  emptyStateMessage?: React.ReactNode; // Changed to React.ReactNode
  itemKey?: keyof T | ((item: T) => string | number);
  listClassName?: string;
  itemClassName?: string;
}

export function ResourceList<T>({
  items,
  renderItem,
  isLoading,
  error,
  emptyStateMessage = "No items found.",
  itemKey = "id" as keyof T,
  listClassName = "divide-y divide-slate-200",
  itemClassName = "",
}: ResourceListProps<T>) {
  if (isLoading) {
    return <p className="p-4 text-center">Loading...</p>;
  }

  if (error) {
    return <p className="p-4 text-center text-red-500">{error}</p>;
  }

  if (items.length === 0) {
    if (typeof emptyStateMessage === 'string') {
      return <p className="p-4 text-center text-slate-500">{emptyStateMessage}</p>;
    }
    return <>{emptyStateMessage}</>; // Render ReactNode directly
  }

  const getKey = (item: T): string | number => {
    if (typeof itemKey === 'function') {
      return itemKey(item);
    }
    // Ensure item is an object and itemKey is a valid key before trying to access it.
    if (typeof item === 'object' && item !== null && itemKey in item) {
      const keyVal = item[itemKey];
      if (typeof keyVal === 'string' || typeof keyVal === 'number') {
        return keyVal;
      }
    }
    // Fallback if key is not found or not a primitive, though this should be avoided by proper itemKey usage.
    // Using index as a last resort is generally discouraged for dynamic lists.
    // Consider logging a warning here in development.
    console.warn("ResourceList: Could not determine a valid key for an item. Consider providing a custom 'itemKey' prop.", item);
    return JSON.stringify(item); // Or generate a unique ID if possible
  };


  return (
    <ul className={listClassName}>
      {items.map((item) => (
        <li key={getKey(item)} className={itemClassName}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
