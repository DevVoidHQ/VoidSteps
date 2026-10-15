import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

// Radix Tabs: arrow keys move between tabs, only the active tab sits in the
// Tab order, and each panel is labelled by its own trigger.

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex items-center gap-1 rounded-lg bg-field p-1", className)}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

function TabsTrigger({ value, children, disabled = false, className }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 type-label",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.97]",
        "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-elev-1 data-[state=active]:hover:bg-accent/90",
        "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground",
        className
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function TabsContent({ value, children, className }: TabsContentProps) {
  return (
    <TabsPrimitive.Content value={value} className={cn("mt-4 outline-none", className)}>
      {children}
    </TabsPrimitive.Content>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
