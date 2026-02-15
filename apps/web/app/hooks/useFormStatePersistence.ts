import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useMachine } from "@xstate/react";
import { formStateMachine } from "../stores/formStateMachine";
import type { PersistedFormState, FormStateMachineEvents } from "../types/persistence.types";

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function useFormStatePersistence({
  submissionId,
  apiKey,
  initialState,
}: {
  submissionId: string;
  apiKey: string;
  initialState?: PersistedFormState | null;
}) {
  const [state, send, actor] = useMachine(formStateMachine, {
    input: { submissionId },
  });

  const pendingStateRef = useRef<PersistedFormState | null>(null);
  const isSavingRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving">("idle");

  // Initialize with loaded state
  useEffect(() => {
    if (initialState) {
      send({ type: "INIT_STATE", state: initialState });
    }
  }, []); // Only on mount

  // Save state to backend
  const saveStateInternal = useCallback(
    async (stateToSave: PersistedFormState) => {
      isSavingRef.current = true;
      setSaveStatus("saving");

      try {
        const response = await fetch(`/api/application/${submissionId}/state`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: stateToSave }),
        });

        const result = await response.json();

        if (result.ok) {
          send({ type: "MARK_SAVED" });
        }
      } catch (error) {
        console.error("Failed to save form state:", error);
      } finally {
        isSavingRef.current = false;
        setSaveStatus("idle");

        // Process queued state if any
        if (pendingStateRef.current) {
          const pendingState = pendingStateRef.current;
          pendingStateRef.current = null;
          saveStateInternal(pendingState);
        }
      }
    },
    [submissionId, send]
  );

  // Queue or save state
  const saveOrQueueState = useCallback(() => {
    const currentState = actor.getSnapshot().context.state;

    if (isSavingRef.current) {
      pendingStateRef.current = currentState;
      return;
    }

    saveStateInternal(currentState);
  }, [actor, saveStateInternal]);

  // Debounced save
  const debouncedSave = useMemo(
    () => debounce(saveOrQueueState, 300),
    [saveOrQueueState]
  );

  // Wrapped send that triggers persistence
  const sendWithPersist = useCallback(
    (event: FormStateMachineEvents) => {
      send(event);

      const persistEvents = [
        "ADD_SINGLE_UPLOAD",
        "REMOVE_SINGLE_UPLOAD",
        "ADD_MULTI_UPLOAD",
        "REMOVE_MULTI_UPLOAD",
      ];

      if (persistEvents.includes(event.type)) {
        queueMicrotask(() => {
          debouncedSave();
        });
      }
    },
    [send, debouncedSave]
  );

  return {
    state: state.context.state,
    send: sendWithPersist,
    isDirty: state.context.isDirty,
    isSaving: saveStatus === "saving",
  };
}
