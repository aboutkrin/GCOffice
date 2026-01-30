"use client";

import { useState, useEffect } from "react";
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

interface CompanySelectProps {
  value?: string;
  onSelect: (company: any) => void;
  companies?: any[];
}

export function CompanySelect({ value, onSelect, companies: initialCompanies }: CompanySelectProps) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<any[]>(initialCompanies ?? []);
  const [loading, setLoading] = useState(false);

  const selectedCompany = companies.find((c) => c.id === value);

  useEffect(() => {
    if (open && companies.length === 0) {
      setLoading(true);
      import("@/data/companies")
        .then(({ getAllCompanies }) => getAllCompanies())
        .then((results) => setCompanies(results))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, companies.length]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedCompany ? (
            <span className="truncate">{selectedCompany.name}</span>
          ) : (
            <span className="text-muted-foreground">เลือกบริษัท...</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="ค้นหาบริษัท..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "กำลังโหลด..." : "ไม่พบข้อมูลบริษัท"}
            </CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => {
                    onSelect(company);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === company.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{company.name}</span>
                    {company.phone && (
                      <span className="text-xs text-muted-foreground">
                        {company.phone}
                      </span>
                    )}
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
