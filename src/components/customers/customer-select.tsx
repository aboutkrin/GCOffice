"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface CustomerSelectProps {
  value?: string;
  onSelect: (customer: any) => void;
  customers?: any[];
  placeholder?: string;
  className?: string;
}

export function CustomerSelect({
  value,
  onSelect,
  customers: initialCustomers,
  placeholder = "เลือกลูกค้า...",
  className,
}: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const customers = initialCustomers ?? [];

  const filteredCustomers = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.code?.toLowerCase().includes(q) ||
        c.customerName?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [customers, query]);

  const selectedCustomer = customers.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full min-w-0 justify-between font-normal", className)}
        >
          {selectedCustomer ? (
            <span className="min-w-0 truncate">
              {selectedCustomer.companyName || selectedCustomer.customerName}
            </span>
          ) : (
            <span className="min-w-0 truncate text-muted-foreground">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(400px,calc(100vw-2rem))] p-0"
        align="start"
        side="bottom"
        avoidCollisions={false}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="ค้นหาลูกค้า..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[min(70vh,var(--radix-popover-content-available-height))]">
            <CommandEmpty>ไม่พบข้อมูลลูกค้า</CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onSelect(customer);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {customer.customerName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[customer.code, customer.companyName, customer.phone]
                        .filter(Boolean)
                        .join(" | ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
