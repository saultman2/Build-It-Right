import { useRoute } from "wouter";
import { useGetInvoice } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  
  const { data: invoice, isLoading } = useGetInvoice(id);

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!invoice) return <div className="p-6">Invoice not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber || `#${invoice.id}`}</h1>
      
      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><strong>Client:</strong> {invoice.clientName || 'N/A'}</div>
          <div><strong>Job:</strong> {invoice.jobTitle || 'N/A'}</div>
          <div><strong>Status:</strong> {invoice.status}</div>
          <div><strong>Total:</strong> {formatCurrency(invoice.totalAmount)}</div>
          <div><strong>Paid:</strong> {formatCurrency(invoice.amountPaid)}</div>
          <div><strong>Balance Due:</strong> {formatCurrency(invoice.balanceDue)}</div>
          <div><strong>Due Date:</strong> {formatDate(invoice.dueDate)}</div>
        </CardContent>
      </Card>
    </div>
  );
}