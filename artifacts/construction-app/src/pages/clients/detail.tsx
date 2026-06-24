import { useRoute } from "wouter";
import { useGetClient, useGetClientHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  
  const { data: client, isLoading: clientLoading } = useGetClient(id);
  const { data: history, isLoading: historyLoading } = useGetClientHistory(id);

  if (clientLoading || historyLoading) {
    return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!client) return <div className="p-6">Client not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Email:</strong> {client.email || 'N/A'}</div>
            <div><strong>Phone:</strong> {client.phone || 'N/A'}</div>
            <div><strong>Address:</strong> {client.address || 'N/A'}, {client.city} {client.state}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Total Jobs:</strong> {history?.totalJobs || 0}</div>
            <div><strong>Completed:</strong> {history?.completedJobs || 0}</div>
            <div><strong>Total Revenue:</strong> {formatCurrency(history?.totalRevenue || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Jobs</CardTitle></CardHeader>
        <CardContent>
          {history?.jobs?.length ? (
            <div className="space-y-4">
              {history.jobs.map(job => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="flex justify-between items-center p-4 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                    <div>
                      <div className="font-semibold">{job.title}</div>
                      <div className="text-sm text-muted-foreground">{job.status}</div>
                    </div>
                    <div className="font-mono">{formatCurrency(job.estimatedValue)}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-4 text-center">No jobs found for this client.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}