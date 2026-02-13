export type QuestionConfig = {
  id: string;
  order: number;
  title: string;
  description: string;
  required: boolean;
  accept: string[];
  maxSizeMB: number;
};

export const FORM_QUESTIONS: QuestionConfig[] = [
  {
    id: "q1",
    order: 1,
    title: "Firm Registration Certificate",
    description: "Upload your firm's valid registration certificate issued by the relevant authority.",
    required: true,
    accept: [".pdf", ".jpg", ".png"],
    maxSizeMB: 10,
  },
  {
    id: "q2",
    order: 2,
    title: "Pre-Qualification Documents",
    description: "Submit pre-qualification documents including past project references and financial statements.",
    required: true,
    accept: [".pdf"],
    maxSizeMB: 25,
  },
  {
    id: "q3",
    order: 3,
    title: "Technical Proposal",
    description: "Detailed technical proposal addressing the scope of work, methodology, and timeline.",
    required: true,
    accept: [".pdf", ".docx"],
    maxSizeMB: 50,
  },
  {
    id: "q4",
    order: 4,
    title: "Supporting Portfolio",
    description: "Optional portfolio showcasing relevant completed projects and design capabilities.",
    required: false,
    accept: [".pdf", ".zip"],
    maxSizeMB: 100,
  },
  {
    id: "q5",
    order: 5,
    title: "Financial Bid",
    description: "Sealed financial bid document as per the prescribed format in the tender notice.",
    required: true,
    accept: [".pdf"],
    maxSizeMB: 10,
  },
];

export const REQUIRED_QUESTION_IDS = FORM_QUESTIONS.filter((question) => question.required).map((question) => question.id);
