export type QuestionConfig = {
  id: string;
  order: number;
  title: string;
  heading: string;
  subheading: string;
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
    heading: "Firm Registration",
    subheading: "Company Identity & Legal Standing",
    description:
      "Upload your firm's valid registration certificate issued by the relevant authority. This must be a current, unrevoked certificate that establishes your legal identity as a registered entity eligible to participate in public tenders.",
    required: true,
    accept: [".pdf", ".jpg", ".png"],
    maxSizeMB: 100,
  },
  {
    id: "q2",
    order: 2,
    title: "Pre-Qualification Documents",
    heading: "Pre-Qualification Dossier",
    subheading: "Past Performance & Financial Health",
    description:
      "Submit pre-qualification documents including past project references, audited financial statements for the last three fiscal years, and evidence of similar-scale project completion (over 20,000 sq.m.).",
    required: true,
    accept: [".pdf"],
    maxSizeMB: 255,
  },
  {
    id: "q3",
    order: 3,
    title: "Technical Proposal",
    heading: "Technical Proposal",
    subheading: "Methodology, Scope & Timeline",
    description:
      "Detailed technical proposal addressing the full scope of work, proposed methodology, project timeline with milestones, resource allocation plan, and quality assurance framework for the Museum of Innovation, Startup & Technology project.",
    required: true,
    accept: [".pdf", ".docx"],
    maxSizeMB: 560,
  },
  {
    id: "q4",
    order: 4,
    title: "Supporting Portfolio",
    heading: "Supporting Portfolio",
    subheading: "Design Capabilities & References",
    description:
      "Optional portfolio showcasing relevant completed projects and design capabilities. Include architectural renderings, case studies, and client testimonials that demonstrate expertise in institutional or cultural projects of similar scale.",
    required: false,
    accept: [".pdf", ".zip"],
    maxSizeMB: 100,
  },
  {
    id: "q5",
    order: 5,
    title: "Financial Bid",
    heading: "Financial Bid",
    subheading: "Commercial Terms & Pricing",
    description:
      "Sealed financial bid document as per the prescribed format in the tender notice. Ensure all line items, taxes, and contingency provisions are clearly itemized and the bid is signed by an authorized signatory.",
    required: true,
    accept: [".pdf"],
    maxSizeMB: 10,
  },
];

export const REQUIRED_QUESTION_IDS = FORM_QUESTIONS.filter((question) => question.required).map((question) => question.id);
