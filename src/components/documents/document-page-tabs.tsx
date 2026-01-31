"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DocumentTable } from "./document-table";
import { Badge } from "@/components/ui/badge";

interface DocumentPageTabsProps {
  activeDocuments: any[];
  cancelledDocuments: any[];
  basePath: string;
  documentType: "QUOTATION" | "INVOICE";
}

export function DocumentPageTabs({
  activeDocuments,
  cancelledDocuments,
  basePath,
  documentType,
}: DocumentPageTabsProps) {
  return (
    <Tabs defaultValue="active">
      <TabsList>
        <TabsTrigger value="active">
          ใช้งาน
          {activeDocuments.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs min-w-5 justify-center">
              {activeDocuments.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="cancelled">
          ยกเลิก
          {cancelledDocuments.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs min-w-5 justify-center">
              {cancelledDocuments.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <DocumentTable
          documents={activeDocuments}
          basePath={basePath}
          documentType={documentType}
        />
      </TabsContent>
      <TabsContent value="cancelled">
        <DocumentTable
          documents={cancelledDocuments}
          basePath={basePath}
          documentType={documentType}
        />
      </TabsContent>
    </Tabs>
  );
}
