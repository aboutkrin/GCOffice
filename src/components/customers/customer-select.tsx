"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

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
}

export function CustomerSelect({ value, onSelect, customers: initialCustomers }: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<any[]>(initialCustomers ?? []);
  const [loading, setLoading] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === value);

  const fetchCustomers = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const { searchCustomers } = await import("@/data/customers");
      const results = await searchCustomers(searchQuery || "");
      setCustomers(results);
    } catch {
      // fallback to initial list
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        fetchCustomers(query);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open, fetchCustomers]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedCustomer ? (
            <span className="truncate">
              {selectedCustomer.companyName || selectedCustomer.customerName}
            </span>
          ) : (
            <span className="text-muted-foreground">เลือกลูกค้า...</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="ค้นหาลูกค้า..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "กำลังค้นหา..." : "ไม่พบข้อมูลลูกค้า"}
            </CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
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
                      {[customer.companyName, customer.phone]
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
