import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useListClients,
  useListJobs,
  useGetCompany,
  useCreateClient,
  useCreateJob,
  useCreateEstimate,
  useCreateEstimateItem,
  useUpdateEstimate,
  useAiQuickQuote,
  useAiMaterialPrice,
} from "@workspace/api-client-react";
import type { AiMaterialPriceResult } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  UserRound,
  Hammer,
  Sparkles,
  Plus,
  X,
  Printer,
  Save,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

type Path = "client" | "job" | "ai";
type Step = 1 | 2 | 3;
type Section = "material" | "labor";

interface LineItem {
  id: string;
  section: Section;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

const JOB_TYPES = [
  "General Construction",
  "Remodeling",
  "Roofing",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Painting",
  "Flooring",
  "Concrete / Masonry",
  "Landscaping",
  "Carpentry",
  "Drywall",
  "Fencing",
  "Gutters",
  "Other",
];

let idCounter = 0;
const nextId = () => `li-${idCounter++}`;

function emptyItem(section: Section): LineItem {
  return {
    id: nextId(),
    section,
    description: "",
    qty: 1,
    unit: section === "labor" ? "hr" : "ea",
    unitPrice: 0,
  };
}

export default function QuickQuotePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: clients } = useListClients({});
  const { data: jobs } = useListJobs({});
  const { data: company } = useGetCompany();

  const createClient = useCreateClient();
  const createJob = useCreateJob();
  const createEstimate = useCreateEstimate();
  const createItem = useCreateEstimateItem();
  const updateEstimate = useUpdateEstimate();
  const aiQuickQuote = useAiQuickQuote();
  const materialPrice = useAiMaterialPrice();

  const [step, setStep] = useState<Step>(1);
  const [path, setPath] = useState<Path | null>(null);

  // client
  const [clientId, setClientId] = useState<number | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // job
  const [jobId, setJobId] = useState<number | null>(null);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [creatingJob, setCreatingJob] = useState(false);
  const [jobType, setJobType] = useState<string>("General Construction");
  const [description, setDescription] = useState("");

  // ai
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);

  // line items + tax
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxRate, setTaxRate] = useState<number>(company?.defaultTaxRate ?? 0);

  // price hints keyed by line item id
  const [hints, setHints] = useState<Record<string, AiMaterialPriceResult | null>>({});
  const [hintLoading, setHintLoading] = useState<Record<string, boolean>>({});

  const [isSaving, setIsSaving] = useState(false);

  const selectedClient = clients?.find((c) => c.id === clientId) || null;
  const selectedJob = jobs?.find((j) => j.id === jobId) || null;

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
    [items],
  );
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  const materialItems = items.filter((i) => i.section === "material");
  const laborItems = items.filter((i) => i.section === "labor");

  function startPath(p: Path) {
    setPath(p);
    setStep(2);
    if (p !== "ai" && items.length === 0) {
      setItems([emptyItem("material")]);
    }
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setHints((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    try {
      const c = await createClient.mutateAsync({ data: { name: newClientName.trim() } });
      setClientId(c.id);
      setNewClientName("");
      toast({ title: "Client created", description: c.name });
    } catch {
      toast({ title: "Failed to create client", variant: "destructive" });
    } finally {
      setCreatingClient(false);
    }
  }

  async function handleGenerateAi() {
    if (!aiPrompt.trim()) {
      toast({ title: "Describe the job first", variant: "destructive" });
      return;
    }
    try {
      const res = await aiQuickQuote.mutateAsync({
        data: {
          jobDescription: aiPrompt.trim(),
          jobType: jobType || undefined,
          zipCode: company?.zipCode || undefined,
        },
      });
      const mats: LineItem[] = (res.materials || []).map((m) => ({
        id: nextId(),
        section: "material",
        description: m.name,
        qty: m.qty ?? 1,
        unit: m.unit ?? "ea",
        unitPrice: m.unitPrice ?? 0,
      }));
      const labor: LineItem[] = (res.labor || []).map((l) => ({
        id: nextId(),
        section: "labor",
        description: l.description,
        qty: l.qty ?? 1,
        unit: "hr",
        unitPrice: l.unitPrice ?? 0,
      }));
      setItems([...mats, ...labor]);
      if (!description.trim()) setDescription(aiPrompt.trim());
      setAiGenerated(true);
      toast({ title: "Quote drafted", description: "Review and adjust the line items below." });
    } catch (err: unknown) {
      toast({
        title: "AI error",
        description: err instanceof Error ? err.message : "Failed to generate quote",
        variant: "destructive",
      });
    }
  }

  async function handleCheckPrice(item: LineItem) {
    if (!item.description.trim()) {
      toast({ title: "Enter an item name first", variant: "destructive" });
      return;
    }
    setHintLoading((p) => ({ ...p, [item.id]: true }));
    try {
      const res = await materialPrice.mutateAsync({
        data: { itemName: item.description.trim(), unit: item.unit || undefined },
      });
      setHints((p) => ({ ...p, [item.id]: res }));
    } catch {
      toast({ title: "Price lookup failed", variant: "destructive" });
    } finally {
      setHintLoading((p) => ({ ...p, [item.id]: false }));
    }
  }

  async function handleSave() {
    // Validate everything BEFORE creating any records, so a bad row never
    // leaves an orphaned job/estimate behind.
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast({ title: "Add at least one line item with a description", variant: "destructive" });
      return;
    }
    const haveClient = clientId != null || newClientName.trim().length > 0;
    const haveJob = jobId != null || newJobTitle.trim().length > 0 || jobType.length > 0;
    if (!haveClient && !haveJob) {
      toast({ title: "Add a client or project first", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Resolve / create client inline if a new name was typed.
      let finalClientId = clientId;
      if (finalClientId == null && newClientName.trim()) {
        const c = await createClient.mutateAsync({ data: { name: newClientName.trim() } });
        finalClientId = c.id;
      }
      const clientName = selectedClient?.name || newClientName.trim();

      // 2. Resolve / create job
      let finalJobId = jobId;
      if (!finalJobId) {
        const title =
          newJobTitle.trim() || (clientName ? `${jobType} — ${clientName}` : jobType);
        const job = await createJob.mutateAsync({
          data: {
            title,
            jobType,
            clientId: finalClientId ?? undefined,
            description: description || undefined,
          },
        });
        finalJobId = job.id;
      }

      // 3. Create estimate linked to job + client
      const estTitle = selectedJob?.title || newJobTitle.trim() || `${jobType} Quote`;
      const est = await createEstimate.mutateAsync({
        data: {
          title: estTitle,
          jobId: finalJobId ?? undefined,
          clientId: finalClientId ?? undefined,
        },
      });

      // 4. Create line items
      let sortOrder = 0;
      for (const item of validItems) {
        await createItem.mutateAsync({
          estimateId: est.id,
          data: {
            section: item.section,
            description: item.description,
            quantity: item.section === "material" ? item.qty : undefined,
            unit: item.section === "material" ? item.unit : undefined,
            unitPrice: item.section === "material" ? item.unitPrice : undefined,
            hours: item.section === "labor" ? item.qty : undefined,
            hourlyRate: item.section === "labor" ? item.unitPrice : undefined,
            sortOrder: sortOrder++,
          },
        });
      }

      // 5. Configure totals
      await updateEstimate.mutateAsync({
        id: est.id,
        data: {
          scopeOfWork: description || undefined,
          taxRate,
          includeTax: taxRate > 0,
          includeLabor: laborItems.length > 0,
          includeMaterials: materialItems.length > 0,
        },
      });

      toast({ title: "Quote saved", description: "Saved as an estimate on the project." });
      setLocation(`/jobs/${finalJobId}`);
    } catch (err: unknown) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const confidenceLabel = (c: string) =>
    c === "high" ? "High" : c === "estimate" ? "Estimate" : "Approximate";

  // ── STEP 1: choose path ──────────────────────────────
  if (step === 1) {
    const cards: { path: Path; icon: typeof UserRound; title: string; desc: string }[] = [
      { path: "client", icon: UserRound, title: "Client First", desc: "Pick or add a client, then build the quote." },
      { path: "job", icon: Hammer, title: "Job First", desc: "Start with the job type and scope of work." },
      { path: "ai", icon: Sparkles, title: "AI Assisted", desc: "Describe the job — AI drafts the line items." },
    ];
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Build a Quote</h1>
        <p className="text-muted-foreground mt-1.5">
          From driveway to done in under three minutes. Choose how you want to start.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {cards.map((c) => (
            <button
              key={c.path}
              onClick={() => startPath(c.path)}
              className="group text-left bg-card border border-card-border rounded-xl p-6 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <c.icon className="w-6 h-6" />
              </div>
              <div className="mt-4 font-semibold flex items-center gap-1.5">
                {c.title}
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const stepLabels = ["Start", "Details", "Preview & Save"];

  // ── STEP 3: preview ──────────────────────────────────
  if (step === 3) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-5 print:p-0">
        <Stepper step={step} labels={stepLabels} />
        <div className="flex items-center gap-3 flex-wrap print:hidden">
          <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to details
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Print / PDF
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Save Quote
            </Button>
          </div>
        </div>

        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-6 pb-6 border-b">
              <div>
                {company?.logoUrl && (
                  <img src={company.logoUrl} alt="logo" className="h-12 w-auto object-contain mb-3" />
                )}
                <h2 className="text-xl font-bold">{company?.name || "Your Company"}</h2>
                {company?.address && <div className="text-sm text-muted-foreground">{company.address}</div>}
                {company?.city && (
                  <div className="text-sm text-muted-foreground">
                    {company.city}
                    {company.state ? `, ${company.state}` : ""} {company.zipCode || ""}
                  </div>
                )}
                {company?.phone && <div className="text-sm text-muted-foreground">{company.phone}</div>}
                {company?.email && <div className="text-sm text-muted-foreground">{company.email}</div>}
              </div>
              <div className="text-sm sm:text-right space-y-1">
                <div className="font-semibold text-base">ESTIMATE</div>
                <div className="text-muted-foreground">Date: {new Date().toLocaleDateString()}</div>
                {(selectedClient || newClientName) && (
                  <div className="mt-2">
                    <div className="font-medium">Bill To:</div>
                    <div>{selectedClient?.name || newClientName}</div>
                    {selectedClient?.address && (
                      <div className="text-muted-foreground">{selectedClient.address}</div>
                    )}
                    {selectedClient?.email && (
                      <div className="text-muted-foreground">{selectedClient.email}</div>
                    )}
                  </div>
                )}
                {(selectedJob || newJobTitle) && (
                  <div className="mt-2">
                    <div className="font-medium">Project:</div>
                    <div>{selectedJob?.title || newJobTitle || jobType}</div>
                  </div>
                )}
              </div>
            </div>

            {description && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Scope of Work
                </div>
                <p className="text-sm text-foreground/90">{description}</p>
              </div>
            )}

            <PreviewSection title="Materials" items={materialItems} qtyLabel="Qty" rateLabel="Unit Price" />
            <PreviewSection title="Labor" items={laborItems} qtyLabel="Hrs" rateLabel="Rate/hr" />

            <div className="border-t pt-4">
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex gap-8 text-muted-foreground w-64 justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex gap-8 text-muted-foreground w-64 justify-between">
                    <span>Tax ({taxRate}%)</span>
                    <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex gap-8 font-bold text-lg pt-1.5 border-t w-64 justify-between">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── STEP 2: details ──────────────────────────────────
  const clientBlock = (
    <div className="space-y-1.5">
      <Label>Client {path === "client" ? "" : "(optional)"}</Label>
      <div className="flex gap-2">
        <Select
          value={clientId?.toString() ?? "none"}
          onValueChange={(v) => setClientId(v === "none" ? null : parseInt(v))}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a client..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No client</SelectItem>
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="…or type a new client name"
          value={newClientName}
          onChange={(e) => setNewClientName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreateClient();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateClient}
          disabled={creatingClient || !newClientName.trim()}
        >
          {creatingClient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
        </Button>
      </div>
    </div>
  );

  const jobBlock = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Project</Label>
        <Select
          value={jobId?.toString() ?? "none"}
          onValueChange={(v) => setJobId(v === "none" ? null : parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="New project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Create a new project</SelectItem>
            {jobs?.map((j) => (
              <SelectItem key={j.id} value={j.id.toString()}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!jobId && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>New project name</Label>
            <Input
              placeholder="e.g. Smith gutter replacement"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Job type</Label>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-5">
      <Stepper step={step} labels={stepLabels} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Change path
        </Button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          {path === "ai" ? (
            <>
              <Sparkles className="w-5 h-5 text-primary" /> AI Assisted Quote
            </>
          ) : path === "client" ? (
            <>
              <UserRound className="w-5 h-5 text-primary" /> Client First
            </>
          ) : (
            <>
              <Hammer className="w-5 h-5 text-primary" /> Job First
            </>
          )}
        </h1>
      </div>

      {path === "ai" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>Describe the job in one sentence</Label>
            <Textarea
              placeholder='e.g. "Install 200 ft of seamless gutters with 4 downspouts"'
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <Button onClick={handleGenerateAi} disabled={aiQuickQuote.isPending || !aiPrompt.trim()}>
              {aiQuickQuote.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> {aiGenerated ? "Regenerate" : "Generate line items"}
                </>
              )}
            </Button>
            {aiGenerated && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                AI estimates are approximate — review every line before sending.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(path !== "ai" || aiGenerated) && (
        <>
          <div className="grid md:grid-cols-2 gap-5">
            {path === "job" ? (
              <>
                {jobBlock}
                {clientBlock}
              </>
            ) : (
              <>
                {clientBlock}
                {jobBlock}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Scope of work / description</Label>
            <Textarea
              placeholder="Briefly describe the work for the client…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, emptyItem("material")])}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Material
                </Button>
                <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, emptyItem("labor")])}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Labor
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {items.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No line items yet. Add a material or labor row to begin.
                  </div>
                ) : (
                  <div className="divide-y">
                    {items.map((item) => {
                      const hint = hints[item.id];
                      return (
                        <div key={item.id} className="p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <Badge variant={item.section === "labor" ? "secondary" : "outline"} className="mt-1.5 shrink-0">
                              {item.section === "labor" ? "Labor" : "Material"}
                            </Badge>
                            <div className="flex-1 grid grid-cols-12 gap-2">
                              <Input
                                className="col-span-12 sm:col-span-5"
                                placeholder={item.section === "labor" ? "Task description" : "Item name"}
                                value={item.description}
                                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                              />
                              <Input
                                className="col-span-3 sm:col-span-2"
                                type="number"
                                placeholder={item.section === "labor" ? "Hrs" : "Qty"}
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                              />
                              <Input
                                className="col-span-3 sm:col-span-2"
                                placeholder="Unit"
                                value={item.unit}
                                disabled={item.section === "labor"}
                                onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                              />
                              <Input
                                className="col-span-4 sm:col-span-2"
                                type="number"
                                placeholder={item.section === "labor" ? "Rate/hr" : "Unit price"}
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                              />
                              <div className="col-span-2 sm:col-span-1 flex items-center justify-end text-sm font-medium tabular-nums">
                                {formatCurrency(item.qty * item.unitPrice)}
                              </div>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="mt-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {item.section === "material" && (
                            <div className="flex flex-wrap items-center gap-2 pl-1">
                              <button
                                onClick={() => handleCheckPrice(item)}
                                disabled={hintLoading[item.id]}
                                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                              >
                                {hintLoading[item.id] ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Tag className="w-3 h-3" />
                                )}
                                Check price
                              </button>
                              {hint && (
                                <>
                                  {hint.historical.latest != null && (
                                    <button
                                      onClick={() => updateItem(item.id, { unitPrice: hint.historical.latest! })}
                                      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                    >
                                      <Badge variant="secondary" className="text-[10px]">Your records</Badge>
                                      <span className="font-medium">{formatCurrency(hint.historical.latest)}</span>
                                      <span className="text-primary">· Use</span>
                                    </button>
                                  )}
                                  {hint.retailEstimates
                                    .filter((e) => e.price != null)
                                    .map((e, i) => (
                                      <button
                                        key={i}
                                        onClick={() => updateItem(item.id, { unitPrice: e.price! })}
                                        className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                      >
                                        <Badge variant="outline" className="text-[10px]">AI estimate</Badge>
                                        <span className="font-medium">{formatCurrency(e.price!)}</span>
                                        <span className="text-muted-foreground">{e.store}</span>
                                        <span className="text-muted-foreground">· {confidenceLabel(e.confidence)}</span>
                                        <span className="text-primary">· Use</span>
                                      </button>
                                    ))}
                                  {hint.historical.latest == null &&
                                    hint.retailEstimates.filter((e) => e.price != null).length === 0 && (
                                      <span className="text-xs text-muted-foreground">No pricing found.</span>
                                    )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Totals + tax */}
          <div className="flex flex-col items-end gap-1.5 text-sm">
            <div className="flex gap-8 text-muted-foreground w-64 justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2 w-64 justify-between text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>Tax</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-16 h-7 text-xs px-1.5"
                />
                <span className="text-xs">%</span>
              </div>
              <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex gap-8 font-bold text-lg pt-1.5 border-t w-64 justify-between">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(3)} disabled={items.length === 0}>
              Preview & Save <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Stepper({ step, labels }: { step: Step; labels: string[] }) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-sm font-medium ${
                active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < labels.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function PreviewSection({
  title,
  items,
  qtyLabel,
  rateLabel,
}: {
  title: string;
  items: LineItem[];
  qtyLabel: string;
  rateLabel: string;
}) {
  if (items.length === 0) return null;
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <div className="flex-1 h-px bg-border" />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs">
            <th className="text-left pb-1.5">Description</th>
            <th className="text-right pb-1.5 w-16">{qtyLabel}</th>
            <th className="text-right pb-1.5 w-24">{rateLabel}</th>
            <th className="text-right pb-1.5 w-24">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-1.5 pr-2">{item.description || "—"}</td>
              <td className="py-1.5 text-right tabular-nums">
                {item.qty}
                {item.section === "material" && item.unit ? ` ${item.unit}` : ""}
              </td>
              <td className="py-1.5 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
              <td className="py-1.5 text-right font-medium tabular-nums">
                {formatCurrency(item.qty * item.unitPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end mt-1">
        <span className="text-sm text-muted-foreground">
          {title} subtotal: <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
        </span>
      </div>
    </div>
  );
}
