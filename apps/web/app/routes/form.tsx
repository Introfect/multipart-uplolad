import { useState, useCallback, useRef } from "react";
import { InView } from "react-intersection-observer";
import type { Route } from "./+types/form";
import type { UploadItem } from "~/types/form";
import { FORM_QUESTIONS } from "~/constants/form-questions";
import { SubmissionShell } from "~/components/submission/submission-shell";
import { PortalSidebar } from "~/components/submission/portal-sidebar";
import { SubmissionHeader } from "~/components/submission/submission-header";
import { SubmissionFooter } from "~/components/submission/submission-footer";
import { SectionIntro } from "~/components/submission/section-intro";
import { QuestionCard } from "~/components/submission/question-card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Tender Submission - MIST" },
    { name: "description", content: "Submit your tender documents" },
  ];
}

export default function FormPage() {
  const [uploads, setUploads] = useState<Record<string, UploadItem | null>>({});
  const [activeId, setActiveId] = useState(FORM_QUESTIONS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const simulateUpload = useCallback((questionId: string, file: File) => {
    const item: UploadItem = {
      id: `${questionId}-${Date.now()}`,
      questionId,
      fileName: file.name,
      sizeBytes: file.size,
      status: "uploading",
      progressPct: 0,
    };
    setUploads((prev) => ({ ...prev, [questionId]: item }));

    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 20 + 5;
      if (pct >= 100) {
        clearInterval(interval);
        setUploads((prev) => ({
          ...prev,
          [questionId]: prev[questionId] ? { ...prev[questionId]!, status: "complete", progressPct: 100 } : null,
        }));
      } else {
        setUploads((prev) => ({
          ...prev,
          [questionId]: prev[questionId] ? { ...prev[questionId]!, progressPct: Math.round(pct) } : null,
        }));
      }
    }, 400);
  }, []);

  const pendingCount = Object.values(uploads).filter((u) => u?.status === "uploading").length;

  return (
    <SubmissionShell
      sidebar={
        <PortalSidebar questions={FORM_QUESTIONS} activeId={activeId} onSelect={(id) => {
          setActiveId(id);
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }} />
      }
    >
      <SubmissionHeader
        title="Technical Submission —"
        highlight="MIST-2025-0847"
        subtitle="Tender Document Upload"
        deadlineLabel="15 Mar 2025, 17:00 IST"
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="p-8 lg:p-12 space-y-10 max-w-3xl">
          <SectionIntro
            current={1}
            total={1}
            title="Document Upload"
            description="Upload the required documents for your tender submission. Each question accepts one file."
          />

          <div className="space-y-6">
            {FORM_QUESTIONS.map((q) => (
              <InView
                key={q.id}
                root={scrollRef.current}
                rootMargin="-20% 0px -60% 0px"
                threshold={0}
                onChange={(inView) => { if (inView) setActiveId(q.id); }}
              >
                {({ ref }) => (
                  <div ref={ref} id={q.id}>
                    <QuestionCard
                      question={q}
                      upload={uploads[q.id] ?? null}
                      onAddFile={(file) => simulateUpload(q.id, file)}
                      onCancel={() => setUploads((prev) => ({ ...prev, [q.id]: null }))}
                      onDelete={() => setUploads((prev) => ({ ...prev, [q.id]: null }))}
                    />
                  </div>
                )}
              </InView>
            ))}
          </div>
        </div>
      </div>

      <SubmissionFooter
        pendingCount={pendingCount}
        primaryLabel="Submit Application"
        onSaveDraft={() => {}}
        onPrimary={() => {}}
        isProcessing={pendingCount > 0}
      />
    </SubmissionShell>
  );
}
