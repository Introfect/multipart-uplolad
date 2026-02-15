import { setup, assign } from "xstate";
import type {
  FormStateMachineContext,
  FormStateMachineEvents,
  PersistedFormState,
} from "../types/persistence.types";

const INITIAL_STATE: PersistedFormState = {
  version: 1,
  singleUploads: {},
  multiUploads: {},
};

export const formStateMachine = setup({
  types: {
    context: {} as FormStateMachineContext,
    events: {} as FormStateMachineEvents,
    input: {} as { submissionId: string },
  },
  actions: {
    initializeState: assign({
      state: ({ event }) => {
        if (event.type !== "INIT_STATE") return INITIAL_STATE;
        return event.state;
      },
      isDirty: false,
    }),

    addSingleUpload: assign({
      state: ({ context, event }) => {
        if (event.type !== "ADD_SINGLE_UPLOAD") return context.state;
        return {
          ...context.state,
          singleUploads: {
            ...context.state.singleUploads,
            [event.fieldId]: event.upload,
          },
        };
      },
      isDirty: true,
    }),

    removeSingleUpload: assign({
      state: ({ context, event }) => {
        if (event.type !== "REMOVE_SINGLE_UPLOAD") return context.state;
        const { [event.fieldId]: removed, ...rest } = context.state.singleUploads;
        return { ...context.state, singleUploads: rest };
      },
      isDirty: true,
    }),

    addMultiUpload: assign({
      state: ({ context, event }) => {
        if (event.type !== "ADD_MULTI_UPLOAD") return context.state;
        const existing = context.state.multiUploads[event.fieldId] || [];
        return {
          ...context.state,
          multiUploads: {
            ...context.state.multiUploads,
            [event.fieldId]: [...existing, event.upload],
          },
        };
      },
      isDirty: true,
    }),

    removeMultiUpload: assign({
      state: ({ context, event }) => {
        if (event.type !== "REMOVE_MULTI_UPLOAD") return context.state;
        const existing = context.state.multiUploads[event.fieldId] || [];
        const filtered = existing.filter((f) => f.key !== event.key);

        if (filtered.length === 0) {
          const { [event.fieldId]: removed, ...rest } = context.state.multiUploads;
          return { ...context.state, multiUploads: rest };
        }

        return {
          ...context.state,
          multiUploads: {
            ...context.state.multiUploads,
            [event.fieldId]: filtered,
          },
        };
      },
      isDirty: true,
    }),

    markSaved: assign({
      isDirty: false,
    }),
  },
}).createMachine({
  id: "formState",
  initial: "idle",
  context: ({ input }) => ({
    submissionId: input.submissionId,
    state: INITIAL_STATE,
    isDirty: false,
  }),
  states: {
    idle: {
      on: {
        INIT_STATE: { actions: "initializeState" },
        ADD_SINGLE_UPLOAD: { actions: "addSingleUpload" },
        REMOVE_SINGLE_UPLOAD: { actions: "removeSingleUpload" },
        ADD_MULTI_UPLOAD: { actions: "addMultiUpload" },
        REMOVE_MULTI_UPLOAD: { actions: "removeMultiUpload" },
        MARK_SAVED: { actions: "markSaved" },
      },
    },
  },
});
