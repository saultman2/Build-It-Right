import { useState } from "react";
import { useListInvoices } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useListInvoices({});

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !invoices?.length ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <p className="text-muted-foreground">No invoices found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map(invoice => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div>
                    <div className="text-sm text-muted-foreground">{invoice.clientName || 'Unknown Client'} - {invoice.jobTitle}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(invoice.totalAmount)}</div>
                    <div className="text-sm text-muted-foreground">{invoice.status} • Due {formatDate(invoice.dueDate)}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}