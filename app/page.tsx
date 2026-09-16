"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarDays, Check, ChevronDown, ChevronRight, Clock3, DoorOpen, Eye, HeartHandshake, Home, LockKeyhole, MessageCircle, MoonStar, Phone, Play, Radio, Settings, ShieldCheck, Sparkles, UserCheck, UsersRound, Video, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { correlateDoorActivity, type CareAppointment, type DoorActivity } from "@/lib/correlation";

type Resolution = "pending" | "expected" | "calling" | "escalated";
type DemoScenario = "expected" | "unmatched";

const mariaVisit: CareAppointment = { id: "visit-maria", visitorName: "Maria", role: "home-care", startsAt: "2026-09-16T14:00:00-04:00", endsAt: "2026-09-16T15:00:00-04:00", arrivalWindowMinutes: 15 };
const scenarioEvents: Record<DemoScenario, DoorActivity> = {
  expected: { id: "ring-expected", occurredAt: "2026-09-16T13:58:00-04:00", eventType: "motion.human", repeatedCount: 1, windowMinutes: 1 },
  unmatched: { id: "ring-unmatched", occurredAt: "2026-09-16T23:42:00-04:00", eventType: "motion.human", repeatedCount: 3, windowMinutes: 6 },
};

const scenarioCopy = {
  expected: { badge: "Expected caregiver", time: "1:58 PM", title: "Maria may have arrived", description: "A person was detected two minutes before Maria’s scheduled 2:00 PM care visit.", fallback: "This activity aligns with Maria’s scheduled care visit." },
  unmatched: { badge: "Unmatched visitor", time: "11:42 PM", title: "Activity at the front door", description: "A person was detected three times in six minutes. There is no visit scheduled for this time.", fallback: "Unusual timing and repeated activity." },
} satisfies Record<DemoScenario, { badge: string; time: string; title: string; description: string; fallback: string }>;

const navItems = [
  { label: "Home", icon: Home, active: true },
  { label: "Visits", icon: CalendarDays },
  { label: "People", icon: UsersRound },
  { label: "Privacy", icon: ShieldCheck },
];

const timeline = [
  { time: "1:58 PM", title: "Maria arrived", detail: "Matched to today’s care visit", tone: "safe" },
  { time: "2:01 PM", title: "Visit confirmed", detail: "Confirmed by you", tone: "quiet" },
  { time: "3:04 PM", title: "Visit complete", detail: "46 minutes at the residence", tone: "quiet" },
];

export default function HomePage() {
  const [eventVisible, setEventVisible] = useState(true);
  const [resolution, setResolution] = useState<Resolution>("pending");
  const [metadataOnly, setMetadataOnly] = useState(false);
  const [scenario, setScenario] = useState<DemoScenario>("unmatched");
  const [explanation, setExplanation] = useState("Unusual timing and repeated activity.");
  const [explanationSource, setExplanationSource] = useState<"rules" | "bedrock" | "loading">("rules");

  const statusCopy = useMemo(() => {
    if (resolution === "expected") return "Marked expected — no follow-up needed";
    if (resolution === "calling") return "Calling Margaret now…";
    if (resolution === "escalated") return "Daniel and the care team were notified";
    return scenario === "expected" ? "Matched to Maria’s 2:00 PM care visit" : "No matching visit found";
  }, [resolution, scenario]);

  function simulateEvent(nextScenario: DemoScenario = scenario) {
    const event = scenarioEvents[nextScenario];
    const correlation = correlateDoorActivity(event, [mariaVisit]);
    const copy = scenarioCopy[nextScenario];
    setScenario(nextScenario);
    setEventVisible(false);
    setResolution("pending");
    setExplanation(copy.fallback);
    setExplanationSource("loading");
    window.setTimeout(() => setEventVisible(true), 240);
    void fetch("/api/events/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: event.eventType, detectedAt: copy.time, repeatedCount: event.repeatedCount, windowMinutes: event.windowMinutes, hasMatchingVisit: correlation.classification === "expected", deviceName: "Front Door" }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Bedrock unavailable");
        return response.json() as Promise<{ explanation: string }>;
      })
      .then((result) => { setExplanation(result.explanation); setExplanationSource("bedrock"); })
      .catch(() => { setExplanation(copy.fallback); setExplanationSource("rules"); });
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "simulate_ring_event",
        title: "Simulate Ring event",
        description: "Run a CareDoor Ring demo scenario for either an expected caregiver arrival or an unmatched late-night visitor.",
        inputSchema: { type: "object", properties: { scenario: { type: "string", enum: ["expected", "unmatched"] } }, required: ["scenario"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => { const selected = (input as { scenario?: DemoScenario })?.scenario; if (selected !== "expected" && selected !== "unmatched") throw new Error("Scenario must be expected or unmatched"); simulateEvent(selected); return { status: "received", classification: selected }; },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "resolve_door_event",
        title: "Resolve doorstep event",
        description: "Resolve the active doorstep event as expected or escalate it to the care circle.",
        inputSchema: { type: "object", properties: { action: { type: "string", enum: ["expected", "escalated"] } }, required: ["action"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const action = (input as { action?: string })?.action;
          if (action !== "expected" && action !== "escalated") throw new Error("Action must be expected or escalated");
          setResolution(action);
          return { status: action, event: "front-door-1142" };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-[var(--line)] bg-[var(--navy)] text-white lg:flex">
        <div className="flex h-24 items-center gap-3 px-7">
          <div className="grid size-10 place-items-center rounded-[14px] bg-[var(--coral)] text-white shadow-[0_8px_20px_rgba(255,112,88,.25)]"><DoorOpen className="size-5" strokeWidth={2.4} /></div>
          <div><p className="text-[1.15rem] font-bold tracking-[-0.03em]">CareDoor</p><p className="text-xs text-white/55">Margaret’s home</p></div>
        </div>
        <nav aria-label="Main navigation" className="px-4 pt-5">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Care center</p>
          <div className="space-y-1.5">
            {navItems.map(({ label, icon: Icon, active }) => (
              <button key={label} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[0.94rem] transition ${active ? "bg-white/10 font-semibold text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`} type="button"><Icon className="size-[18px]" />{label}</button>
            ))}
          </div>
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><LockKeyhole className="size-4 text-[var(--mint)]" />Privacy protected</div>
            <p className="text-xs leading-5 text-white/48">Snapshots delete automatically after 24 hours.</p>
            <button className="mt-3 text-xs font-semibold text-white/75 hover:text-white" type="button">Review settings →</button>
          </div>
          <button className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/55 hover:bg-white/5 hover:text-white" type="button"><Settings className="size-4" /> Settings</button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[var(--line)] bg-[color:var(--canvas)/0.92] px-5 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex items-center gap-3 lg:hidden"><div className="grid size-9 place-items-center rounded-xl bg-[var(--navy)] text-white"><DoorOpen className="size-4" /></div><span className="font-bold">CareDoor</span></div>
          <div className="hidden lg:block"><p className="text-sm font-semibold">Good afternoon, Daniel</p><p className="mt-0.5 text-xs text-[var(--muted-ink)]">Tuesday, September 16</p></div>
          <div className="flex items-center gap-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button className="h-10 rounded-xl bg-[var(--navy)] px-4 text-white hover:bg-[#1d3146]"><Play className="size-4 fill-current" /><span className="hidden sm:inline">Run Ring demo</span><span className="sm:hidden">Demo</span><ChevronDown className="size-3.5 opacity-65" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px] rounded-xl p-1.5 shadow-xl">
                <DropdownMenuLabel className="px-2.5 py-2 text-xs uppercase tracking-[0.1em] text-[var(--muted-ink)]">Choose a doorstep event</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => simulateEvent("expected")} className="rounded-lg px-2.5 py-2.5"><UserCheck className="size-4 text-[var(--safe)]" /><span><strong className="block text-[var(--navy)]">Expected caregiver</strong><small className="text-xs text-[var(--muted-ink)]">Maria arrives for her 2 PM visit</small></span></DropdownMenuItem>
                <DropdownMenuItem onSelect={() => simulateEvent("unmatched")} className="rounded-lg px-2.5 py-2.5"><MoonStar className="size-4 text-[var(--coral)]" /><span><strong className="block text-[var(--navy)]">Late-night visitor</strong><small className="text-xs text-[var(--muted-ink)]">Repeated motion with no visit scheduled</small></span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-xl border border-[var(--line)] bg-white text-[var(--navy)] shadow-sm" type="button"><BellRing className="size-[18px]" /><span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-[var(--coral)]" /></button>
            <button aria-label="Open profile" className="grid size-10 place-items-center rounded-xl bg-[#dfe8ef] text-sm font-bold text-[var(--navy)]" type="button">DK</button>
          </div>
        </header>

        <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--safe)]"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--safe)] opacity-25" /><span className="relative inline-flex size-2.5 rounded-full bg-[var(--safe)]" /></span>All systems ready</div>
              <h1 className="text-[clamp(2rem,4vw,3.35rem)] font-bold leading-[1.03] tracking-[-0.055em] text-[var(--navy)]">Margaret is covered.</h1>
              <p className="mt-2 max-w-xl text-[0.98rem] leading-6 text-[var(--muted-ink)]">See who’s expected, understand doorstep activity, and step in only when needed.</p>
            </div>
            <Dialog>
              <DialogTrigger asChild><Button variant="outline" className="h-11 rounded-xl border-[var(--line)] bg-white px-4 text-[var(--navy)] shadow-sm hover:bg-white"><Eye className="size-4" /> Preview resident view</Button></DialogTrigger>
              <DialogContent className="overflow-hidden rounded-[28px] border-0 bg-[#f7f4ee] p-0 shadow-2xl sm:max-w-[560px]">
                <div className="bg-[var(--navy)] px-7 py-5 text-white"><div className="flex items-center gap-2 text-sm font-semibold"><HeartHandshake className="size-5 text-[var(--mint)]" /> Resident view</div></div>
                <div className="px-8 py-10 text-center sm:px-12">
                  <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-[#e2efe9] text-[var(--safe)]"><DoorOpen className="size-9" /></div>
                  <DialogHeader><DialogTitle className="text-center text-3xl font-bold leading-tight tracking-[-0.04em] text-[var(--navy)]">Someone is at the front door.</DialogTitle><DialogDescription className="mt-3 text-center text-lg leading-7 text-[var(--muted-ink)]">This may be Maria, your scheduled caregiver.</DialogDescription></DialogHeader>
                  <DialogFooter className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2"><Button className="h-14 rounded-2xl bg-[var(--navy)] text-base text-white"><Phone className="size-5" /> Call Daniel</Button><Button variant="outline" className="h-14 rounded-2xl border-[var(--line)] bg-white text-base text-[var(--navy)]"><Check className="size-5" /> I’m okay</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </section>

          <section aria-label="Status summary" className="mb-7 grid gap-4 md:grid-cols-3">
            <StatusCard icon={Video} label="Front Door" value="Online" detail="Ring Video Doorbell" tone="safe" />
            <StatusCard icon={CalendarDays} label="Next visit" value="Tomorrow, 10:00 AM" detail="Sam · Physical therapist" />
            <StatusCard icon={ShieldCheck} label="Privacy" value={metadataOnly ? "Metadata only" : "Snapshots enabled"} detail={metadataOnly ? "No images are requested" : "Auto-delete after 24 hours"}><Switch checked={metadataOnly} onCheckedChange={setMetadataOnly} aria-label="Use metadata only" className="data-[state=checked]:bg-[var(--navy)]" /></StatusCard>
          </section>

          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
            <div className="space-y-7">
              <section>
                <div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Live Ring event</p><h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--navy)]">Doorstep context</h2></div><button className="text-sm font-semibold text-[var(--navy)] hover:underline" type="button">View all</button></div>
                {eventVisible ? (
                  <article className={`event-card overflow-hidden rounded-[26px] border bg-white shadow-[0_14px_45px_rgba(29,45,60,.07)] ${resolution === "escalated" ? "border-[#e8a697]" : "border-[var(--line)]"}`}>
                    <div className="grid md:grid-cols-[205px_minmax(0,1fr)]">
                      <div className="event-visual relative min-h-[210px] overflow-hidden bg-[var(--navy)]">
                        {metadataOnly ? <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/75"><div><LockKeyhole className="mx-auto mb-3 size-7" /><p className="text-sm font-semibold">Snapshot hidden</p><p className="mt-1 text-xs text-white/45">Metadata-only mode is on</p></div></div> : <><div className="door-frame"><span /><span /></div><div className="person-silhouette"><span /><i /></div><div className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/45 px-2.5 py-1.5 text-[11px] font-semibold text-white/85 backdrop-blur">RING · {scenarioCopy[scenario].time}</div></>}
                      </div>
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scenario === "expected" ? "bg-[#e7f3ee] text-[var(--safe)]" : "bg-[#fff0ec] text-[#bd4f39]"}`}>{scenarioCopy[scenario].badge}</span><span className="text-xs font-medium text-[var(--muted-ink)]">Just now</span></div>
                        <h3 className="mt-3 text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--navy)]">{scenarioCopy[scenario].title}</h3>
                        <p className="mt-1.5 max-w-xl text-[0.92rem] leading-6 text-[var(--muted-ink)]">{scenarioCopy[scenario].description}</p>
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f5f7f8] px-3.5 py-3 text-sm text-[var(--navy)]"><Sparkles className={`mt-0.5 size-4 shrink-0 text-[#7d6bc6] ${explanationSource === "loading" ? "animate-pulse" : ""}`} /><span><strong>Why this matters:</strong> {explanationSource === "loading" ? "Reviewing the event context…" : explanation}<small className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-ink)]">{explanationSource === "bedrock" ? "Explained by Amazon Bedrock" : "CareDoor safety rules"}</small></span></div>
                        <p aria-live="polite" className={`mt-4 text-sm font-semibold ${resolution === "pending" ? "text-[var(--muted-ink)]" : resolution === "escalated" ? "text-[#b54836]" : "text-[var(--safe)]"}`}>{statusCopy}</p>
                        <div className="mt-4 flex flex-wrap gap-2.5"><Button onClick={() => setResolution("expected")} variant="outline" className="h-10 rounded-xl border-[var(--line)] px-4"><Check /> Expected</Button><Button onClick={() => setResolution("calling")} variant="outline" className="h-10 rounded-xl border-[var(--line)] px-4"><Phone /> Call Margaret</Button><Button onClick={() => setResolution("escalated")} className="h-10 rounded-xl bg-[var(--coral)] px-4 text-white hover:bg-[#e9624c]"><Radio /> Escalate</Button></div>
                      </div>
                    </div>
                  </article>
                ) : <div className="grid min-h-[330px] place-items-center rounded-[26px] border border-[var(--line)] bg-white text-center shadow-sm"><div><Radio className="mx-auto mb-3 size-7 animate-pulse text-[var(--coral)]" /><p className="font-bold text-[var(--navy)]">Receiving Ring event…</p><p className="mt-1 text-sm text-[var(--muted-ink)]">Verifying signed webhook</p></div></div>}
              </section>

              <section className="rounded-[26px] border border-[var(--line)] bg-white p-5 shadow-[0_10px_35px_rgba(29,45,60,.04)] sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="eyebrow">Expected next</p><h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--navy)]">Sam’s physical therapy visit</h2></div><span className="w-fit rounded-full bg-[#e7f3ee] px-3 py-1.5 text-xs font-bold text-[var(--safe)]">Tomorrow · 10–11 AM</span></div>
                <div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-full bg-[#e5ebf0] text-sm font-bold text-[var(--navy)]">SH</div><div><p className="font-semibold text-[var(--navy)]">Sam Howard</p><p className="text-sm text-[var(--muted-ink)]">Physical therapist · Harbor Health</p></div></div><button className="flex items-center gap-1 text-sm font-semibold text-[var(--navy)]" type="button">Visit details <ChevronRight className="size-4" /></button></div>
              </section>
            </div>

            <aside className="space-y-7">
              <section className="rounded-[26px] border border-[var(--line)] bg-white p-5 shadow-[0_10px_35px_rgba(29,45,60,.04)] sm:p-6">
                <div className="flex items-center justify-between"><div><p className="eyebrow">Today</p><h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--navy)]">Visit timeline</h2></div><Clock3 className="size-5 text-[var(--muted-ink)]" /></div>
                <div className="relative mt-6 space-y-6 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-[var(--line)]">
                  {timeline.map((item) => <div key={item.time} className="relative grid grid-cols-[12px_62px_1fr] gap-3"><span className={`relative z-10 mt-1.5 size-[11px] rounded-full border-[3px] border-white ${item.tone === "safe" ? "bg-[var(--safe)] shadow-[0_0_0_2px_#d7ebe3]" : "bg-[#a9b3ba]"}`} /><time className="text-xs font-semibold text-[var(--muted-ink)]">{item.time}</time><div><p className="text-sm font-semibold text-[var(--navy)]">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-[var(--muted-ink)]">{item.detail}</p></div></div>)}
                </div>
                <button className="mt-6 w-full rounded-xl border border-[var(--line)] py-2.5 text-sm font-semibold text-[var(--navy)] hover:bg-[#f7f8f9]" type="button">See complete history</button>
              </section>
              <section className="rounded-[26px] bg-[var(--navy)] p-5 text-white shadow-[0_16px_40px_rgba(16,35,50,.16)] sm:p-6">
                <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">Care circle</p><h2 className="mt-1.5 text-xl font-bold tracking-[-0.03em]">Everyone is reachable</h2></div><UsersRound className="size-5 text-[var(--mint)]" /></div>
                <div className="mt-5 flex items-center">{["DK", "MS", "SH"].map((initials, index) => <span key={initials} className="grid size-10 place-items-center rounded-full border-[3px] border-[var(--navy)] bg-[#dfe8ef] text-xs font-bold text-[var(--navy)]" style={{ marginLeft: index ? -8 : 0 }}>{initials}</span>)}<span className="ml-3 text-sm text-white/60">3 trusted contacts</span></div>
                <div className="mt-5 grid grid-cols-2 gap-2.5"><button className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[var(--navy)]" type="button"><MessageCircle className="size-4" /> Message</button><button className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-white" type="button"><Phone className="size-4" /> Call</button></div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, detail, tone, children }: { icon: typeof Wifi; label: string; value: string; detail: string; tone?: "safe"; children?: React.ReactNode }) {
  return <article className="flex min-h-[116px] items-center gap-4 rounded-[22px] border border-[var(--line)] bg-white p-[18px] shadow-[0_8px_30px_rgba(29,45,60,.035)]"><div className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${tone === "safe" ? "bg-[#e5f2ec] text-[var(--safe)]" : "bg-[#edf1f4] text-[var(--navy)]"}`}><Icon className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[var(--muted-ink)]">{label}</p><p className="mt-0.5 truncate text-[0.96rem] font-bold text-[var(--navy)]">{value}</p><p className="mt-1 truncate text-xs text-[var(--muted-ink)]">{detail}</p></div>{children}</article>;
}
