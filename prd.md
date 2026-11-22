Product Requirements Document (PRD)
AI Job Application Intelligence --- Email-to-Application Workspace
Document version: 1.0
Date: 20 November 2026
Delivery target: One-day MVP
Product type: Responsive web application
Primary user: A job candidate managing applications and preparing
tailored submissions
1. Product Summary
Build a focused AI-powered workspace that turns a recruitment email into
an actionable application plan and a truthful, personalized set of
application materials.

The user pastes a recruitment email, reviews the extracted requirements,
adds or selects their career information (CV, skills, work history,
projects, achievements), answers any missing-information questions, and
generates a tailored cover letter and interview-preparation pack. The
user can edit the results, export a DOCX/PDF, and save the application.

The first real-world test case is the Brillmark Technologies Bangladesh
recruitment email for Software Engineer (Backend, AI) | Node.js /
TypeScript. The product must be generic enough to work with future
recruitment emails from other companies.
Product promise
Paste a job email. Understand what the employer wants. Connect it to
your real experience. Prepare a strong, accurate application.
Non-goals for the one-day MVP
- Automatically sending job applications or emails.
- Scraping job boards or LinkedIn.
- Fully autonomous job searching or applying.
- Multi-user team collaboration or enterprise administration.
- Claiming that AI-generated content is verified or guaranteed to win
  an interview.
- Generating fabricated achievements, metrics, skills, or project
  experience.
2. Problem Statement
Recruitment emails often contain several instructions, questions,
deadlines, document requirements, and implicit evaluation criteria.
Candidates must manually interpret the email, decide which experiences
are relevant, write a tailored response, prepare for interviews, and
ensure they follow submission instructions.

This process is repetitive and error-prone. Generic AI writing tools can
produce polished but vague content, overlook parts of the request, or
invent details.

The product solves this by combining structured email analysis with a
candidate-controlled career knowledge base, transparent experience
matching, editable generation, and a submission checklist.
3. Goals and Success Metrics
Product goals
1. Convert an unstructured recruitment email into a complete,
   reviewable requirements summary.
2. Make every explicit recruiter question visible and trackable.
3. Match job requirements to evidence in the candidate's own profile.
4. Generate tailored documents grounded only in confirmed candidate
   information.
5. Help the candidate prepare for likely technical and behavioral
   interview topics.
6. Keep the candidate in control of every final claim and submission.
MVP success criteria
- A user can paste an email and receive a structured analysis.
- The analysis identifies the company, role, skills, questions,
  deadline, recipient, subject, format, and submission method when
  present.
- The user can add/edit career profile facts and project examples.
- Each generated claim can be traced to profile evidence or marked as
  needing confirmation.
- The user can generate, edit, and export a cover letter.
- The user can save and reopen an application.
- Core workflow passes manual end-to-end testing on desktop and mobile
  layouts.
Suggested measurable targets
- 100% of explicit questions in the source email appear in the
  analysis checklist during test cases.
- 0 knowingly fabricated candidate claims in generated documents.
- Successful DOCX and PDF export for the Brillmark test case.
- A first analysis is available within a reasonable user-facing wait,
  with loading and retry states if the model is slow.
4. Target User and Primary Use Cases
Primary persona: Individual job applicant
A software engineer applying to multiple roles who needs to understand
recruiter instructions, select relevant projects, explain their
engineering workflow, and prepare professional documents quickly.
Primary use cases
- Paste a recruitment email and understand every requested action.
- Extract a job's technical requirements and evaluation signals.
- Upload or maintain a CV and project history.
- Match real experience to a particular job.
- Identify missing evidence and answer follow-up questions.
- Generate a tailored cover letter that answers all recruiter
  questions.
- Prepare likely interview questions and talking points.
- Export the final document and follow the submission checklist.
- Track application status and deadlines.
5. Scope and Prioritization
P0 --- One-day MVP, must work end to end
1. Single-user workspace and application dashboard.
2. Paste recruitment email.
3. Structured AI email analysis.
4. Requirements and recruiter-question checklist.
5. Editable candidate profile with work history, skills, and projects.
6. Evidence-based job-to-profile matching.
7. Missing-information questions.
8. Tailored cover letter generation and editing.
9. Submission details and checklist.
10. DOCX/PDF export.
11. Save and reopen applications.
12. Loading, error, retry, and empty states.
P1 --- Add after the core workflow is stable
- CV file upload and text extraction for PDF/DOCX.
- Interview question generator and preparation notes.
- Multiple cover-letter tones or lengths.
- Application status pipeline and deadline reminders.
- Version history for generated documents.
- Copy-ready email draft.
- Search and filters across saved applications.
P2 --- Future enhancements
- Gmail integration with explicit user authorization.
- Calendar integration and interview scheduling.
- Job description URL import.
- More advanced retrieval over a large career portfolio.
- Mock interview mode and answer evaluation.
- Multi-language output.
- Analytics across applications.
- Multi-user accounts and subscription billing.
Scope rule: Do not start P1/P2 work until the P0 workflow works from
email input to exported document.
6. Information Architecture
Primary navigation
- Dashboard --- overview, recent applications, upcoming deadlines,
  quick action.
- New Analysis --- paste or upload a recruitment email.
- Applications --- saved applications and their statuses.
- My Career Profile --- skills, work experience, projects,
  education, achievements.
- Documents --- generated cover letters and exported files.
- Settings --- account, AI preferences, data and privacy controls.
Application workspace tabs
- Overview
- Email & Requirements
- Experience Match
- Cover Letter
- Interview Prep
- Submission Checklist
- History
The application workspace is the central unit of work. Every analysis,
generated document, checklist, and status belongs to one saved
application.
7. End-to-End User Flow
Flow A --- First-time setup
1. User opens the application.
2. User creates an account or enters a secure personal workspace.
3. User sees a short explanation of how career data is used.
4. User adds basic profile information.
5. User adds work experience, skills, and projects manually, or uploads
   a CV if file parsing is implemented.
6. User reviews and corrects extracted profile facts.
7. Profile is saved as the source of truth.
Required UX: Allow the user to skip optional profile fields and
return later. Do not block email analysis because the profile is
incomplete.
Flow B --- Analyze recruitment email
1. User selects New Analysis.
2. User pastes the full recruitment email.
3. User optionally enters a job title if it cannot be detected.
4. User selects Analyze Email.
5. The system validates that the input is not empty and displays a
   progress state.
6. AI extracts structured recruitment information.
7. The system displays the analysis in editable, clearly labeled
   sections.
8. User checks the extracted questions and submission details against
   the original email.
9. User corrects any extraction errors.
10. User saves the application.
Flow C --- Match candidate experience
1. User opens Experience Match.
2. System compares job requirements with the saved career profile.
3. Each match shows the supporting profile evidence.
4. Unmatched or uncertain requirements are clearly labeled.
5. User selects relevant projects and experience.
6. System asks targeted questions for missing details.
7. User supplies or confirms facts.
8. Confirmed evidence becomes available to document generation.
Flow D --- Generate cover letter
1. User opens Cover Letter.
2. System summarizes the recruiter questions that must be answered.
3. User selects a tone and target length.
4. User confirms the project examples and factual evidence to use.
5. AI generates a structured draft.
6. System checks whether every explicit recruiter question is
   addressed.
7. Any unsupported claims are flagged for review, not silently
   accepted.
8. User edits the draft in the editor.
9. User saves a final version.
10. User exports DOCX or PDF.
Flow E --- Prepare for interview
1. User opens Interview Prep.
2. System generates likely technical, project, and behavioral questions
   based on the role and email.
3. Questions are grouped by topic and priority.
4. Each question includes why it may be asked and suggested points to
   cover.
5. Answers are grounded in the candidate profile; missing examples are
   flagged.
6. User can write, save, and revise their own answers.
Flow F --- Submit and track
1. User opens Submission Checklist.
2. System shows recipient, email subject, file format, page limit,
   deadline, and submission method when found.
3. User marks each preparation item complete.
4. User copies the email subject and recipient.
5. User downloads the final document.
6. User manually sends the email outside the MVP.
7. User updates application status to Submitted.
Important: The MVP must not send an email automatically. It prepares
the user to submit and makes the final action explicit.
8. Detailed Functional Requirements
8.1 Dashboard
Purpose: Give the user a clear starting point and access to active
applications.

Components: - Page title and short supporting text. - Primary
Analyze a Job Email action. - Application summary: total, drafting,
ready to submit, submitted. - Upcoming deadlines. - Recent applications
list. - Profile completion indicator, only if useful and accurate. -
Empty state with a clear first action.

Behavior: - Counts must come from persisted records, never hardcoded
demo numbers. - Selecting an application opens its workspace. - If there
are no applications, show an onboarding empty state rather than fake
charts.
8.2 Email input and source preservation
Requirements: - Large paste-friendly text area. - Optional email
subject field. - Optional company and role override fields. - Support
long email text within a documented limit. - Preserve the original
source text unchanged. - Show validation and clear error messages. -
Allow re-analysis after user edits the source, while preserving prior
analysis versions or clearly confirming replacement.
8.3 AI email analysis
Extract, when present:
- Company name.
- Role title and specialization.
- Employment type and location.
- Required and preferred technical skills.
- Responsibilities.
- Experience requirements.
- Explicit recruiter questions.
- Implied evaluation areas, clearly labeled as inference.
- Required document type and format.
- Maximum length or page count.
- Recipient email address.
- Required email subject.
- Submission channel and instructions.
- Deadline, including the original wording and normalized date if
  unambiguous.
- Any assessment or next-round process.
- Unknown or ambiguous details.
Analysis rules: - Distinguish explicit facts from AI inferences. -
Do not invent missing values. - Use null or an explicit "Not
specified" state for absent fields. - Preserve the exact recruiter
questions as source text where practical. - Show a warning when the date
is ambiguous or timezone is unknown. - Let the user edit extracted
fields.
8.4 Requirement checklist
For every requirement, store:
- Requirement text.
- Category: technical, experience, responsibility, behavioral,
  document, logistics.
- Priority: mandatory, preferred, informational, or inferred.
- Source: exact email excerpt or inferred.
- Status: not reviewed, understood, evidence selected, addressed, not
  applicable.
- Linked candidate evidence, if any.
Every explicit recruiter question must appear as a separate checklist
item.
8.5 Career profile
Profile sections:
- Basic professional summary.
- Technical skills with proficiency or experience context.
- Work experience: employer, title, dates, responsibilities,
  achievements.
- Projects: name, problem, architecture, stack, personal contribution,
  challenges, decisions, outcome.
- Education and certifications, optional.
- Coding-agent workflow and tools, when supported by real examples.
- Evidence notes and links, optional.
Profile rules: - User controls and can edit every fact. - Do not
infer proficiency from a technology name alone. - Distinguish individual
contribution from team contribution. - Do not invent metrics, user
counts, performance improvements, or business outcomes. - Allow a fact
to be marked unverified or needing clarification.
8.6 Experience matching
For each job requirement, show one of:
- Strong evidence --- directly supported by a profile fact.
- Partial evidence --- related experience, but not a complete
  match.
- No evidence yet --- no relevant fact supplied.
- Needs confirmation --- potentially relevant but ambiguous.
Show the supporting project, role, or profile entry. Do not present a
numeric match score unless the scoring method is transparent and useful.
8.7 Missing-information interview
Ask only questions that materially improve the application.

Examples: - What was the most difficult technical issue in this
project? - Which parts did you personally implement? - What was the
database or API challenge? - How did you test and verify the fix? -
Which coding agent did you use, and what tasks did it accelerate? - How
did you review the generated changes?

Requirements: - Ask one focused question at a time or a compact grouped
set when necessary. - Explain which recruiter requirement the answer
supports. - Save answers to the application evidence, and optionally let
the user add them to the career profile. - Never pressure the user to
invent an answer.
8.8 Cover letter generation
Inputs: - Original email. - Extracted requirements and recruiter
questions. - Candidate profile. - Selected evidence. - User-confirmed
missing details. - Tone and length preferences. - Submission
constraints.

Output: - Complete cover letter. - Clear opening for the target role. -
Direct answer to every explicit recruiter question. - Specific, truthful
project examples. - Relevant technical detail without unnecessary
jargon. - Professional closing. - No fabricated contact details or
claims.

Validation: - Compare generated draft against the explicit question
checklist. - Flag unanswered questions. - Flag unsupported claims. -
Check page/word limit approximately; final pagination must be verified
in the exported document. - Allow editing and regeneration of selected
sections without losing the rest of the draft.
8.9 Coding-agent methodology answer builder
Provide a structured editor for describing the candidate's real
workflow:
1. Understand the request and acceptance criteria.
2. Inspect the existing codebase and relevant architecture.
3. Identify affected modules, APIs, database tables, and permissions.
4. Break work into small implementation tasks.
5. Ask the coding agent to propose a plan before making broad changes.
6. Implement in small, reviewable increments.
7. Validate input, authorization, database behavior, errors, and edge
   cases.
8. Run relevant unit, integration, and end-to-end tests.
9. Inspect diffs and review agent-generated changes.
10. Open or review a PR with a clear summary, test evidence, and known
    limitations.
11. Verify deployment and production behavior where applicable.
The application must collect one real example and distinguish: - What
the candidate decided and implemented. - What the agent generated or
assisted with. - What the candidate reviewed, tested, and approved.
8.10 Interview preparation
Generate grouped questions: - Backend fundamentals. - Node.js and
TypeScript. - API design and validation. - Databases and data
modeling. - Authentication and authorization. - Testing, debugging, and
production operations. - AI integration and LLM reliability. -
Coding-agent workflow. - Project deep dive. - Behavioral questions.

For each question include: - Why it may be asked. - What a strong answer
should cover. - Relevant candidate evidence. - Missing evidence, if any.

Do not fabricate a "model answer" that claims personal experience. Label
generic technical explanations separately from candidate-specific answer
suggestions.
8.11 Document editor and export
Editor: - Editable text. - Save draft and final states. - Clear
version naming. - Regenerate selected content. - Copy content. - Show
target length and submission constraints.

Exports: - DOCX. - PDF. - Professional typography and spacing. - No
clipped text or broken page breaks. - Respect requested maximum page
count as closely as possible. - Reopen and verify exported files before
presenting them as ready.
8.12 Application history and status
Statuses: - New - Analyzed - Preparing - Ready to submit - Submitted -
Assessment - Interview - Offer - Rejected - Withdrawn

Store: - Company and role. - Original email. - Analysis. - Selected
evidence. - Generated documents and versions. - Deadline. - Submission
details. - Current status. - Created and updated timestamps.
9. UI/UX Design Requirements
Design direction
Create a calm, premium, focused productivity application. It should feel
like a professional SaaS workspace, not a generic chatbot or a flashy AI
landing page.

Visual principles: - Light theme first. - White and warm off-white
surfaces. - Green as the primary accent. - Dark charcoal primary text
and muted secondary text. - Sharp or subtly squared corners; avoid
excessive rounded cards and pill-shaped controls. - Thin neutral
borders. - Minimal shadows. - Strong spacing rhythm and clear typography
hierarchy. - Inter or Geist font. - No emoji-based navigation. - Avoid
decorative gradients, excessive glassmorphism, and oversized empty hero
areas. - Use animation only to communicate state changes or provide
useful feedback.
Suggested design tokens
  Token                  Value
  App background         #F7F9F6
Surface                #FFFFFF
Primary green          #237A45
Primary green hover    #195F35
Main text              #17211B
Secondary text         #68736B
Border                 #E2E8E2
Subtle green surface   #EDF5EE
Warning                #A66A16
Error                  #B42318
Success                #237A45

Use these as starting tokens; maintain accessible contrast and
consistent states.
Application shell
Desktop: - Fixed left sidebar, approximately 232--256 px. - Main
content area with a readable max width. - Top bar with page
title/breadcrumb, search if implemented, and profile menu. - Sidebar
navigation: Dashboard, New Analysis, Applications, Career Profile,
Documents, Settings. - Primary actions placed consistently.

Mobile: - Responsive navigation drawer or compact navigation. -
Single-column content. - Full-width primary actions. - No horizontal
overflow. - Tables become stacked rows or horizontally scrollable only
when necessary.
Key screens and layouts
Screen 1 --- Dashboard
- Sidebar navigation.
- Header: "Your job search workspace".
- Primary action: "Analyze a job email".
- Compact status summaries based on real records.
- Upcoming deadlines list.
- Recent applications table/list.
- Helpful empty state for a new user.
Screen 2 --- New Analysis
- Clear title and one-sentence instruction.
- Large email paste area.
- Optional subject, company, and role fields in a secondary section.
- Analyze button.
- Privacy note explaining that submitted content is processed by the
  configured AI provider.
- Character/input validation and loading state.
Screen 3 --- Analysis Results
Use a two-column layout on wide screens:

Main column - Role and company overview. - What the recruiter
expects. - Explicit questions. - Technical requirements. -
Responsibilities and evaluation signals.

Side panel - Deadline. - Recipient. - Subject line. - Required
format. - Page limit. - Submission checklist.

Use source/inference labels and make every extracted item editable.
Screen 4 --- Experience Match
- Requirement list on the left.
- Evidence details on the right.
- Status labels: Strong, Partial, No Evidence, Needs Confirmation.
- Select/deselect evidence for the cover letter.
- Clear action to answer missing questions.
Screen 5 --- Career Profile
- Profile completion summary based on actual required fields.
- Sections for skills, work history, projects, and achievements.
- Add/edit/delete actions.
- Project editor prompts for challenge, contribution, architecture,
  and outcome.
- No fake example data in production.
Screen 6 --- Cover Letter Studio
- Left panel: recruiter questions and selected evidence.
- Main panel: editable document.
- Right panel or top toolbar: tone, length, validation warnings,
  export.
- Display unanswered questions and unsupported claims prominently but
  unobtrusively.
- Save draft and mark final actions.
Screen 7 --- Interview Prep
- Topic navigation.
- Question list.
- Expandable rationale and answer guidance.
- Candidate notes editor.
- Evidence links to projects and experience.
Screen 8 --- Submission Checklist
- Recipient and subject with copy actions.
- Required file format and page limit.
- Deadline.
- Final document status.
- Checklist items.
- Clear note that sending is performed manually by the user in the
  MVP.
Screen 9 --- Applications
- Search and filter.
- Company, role, status, deadline, updated date.
- Open application workspace.
- Empty state and error state.
Interaction and motion
- Buttons show immediate pressed/hover feedback.
- Loading buttons display progress and prevent duplicate submission.
- Save operations show clear saved/unsaved state.
- Tabs and accordions transition quickly and subtly.
- Avoid motion that delays reading or navigation.
- Respect reduced-motion preferences.
- All controls must have keyboard focus states and accessible labels.
UX states required on every relevant screen
- Initial/empty.
- Loading.
- Success.
- Validation error.
- API/network error.
- Retry.
- Unsaved changes.
- Permission or session expiry where authentication exists.
10. AI Architecture and Prompting Requirements
Separate AI responsibilities
Do not use one giant prompt for the entire product. Implement separate
services:
1. RecruitmentEmailParser --- structured extraction.
2. RequirementAnalyzer --- classify requirements and explicit
   questions.
3. CareerEvidenceMatcher --- match requirements to profile facts.
4. MissingInfoQuestioner --- ask for necessary evidence.
5. CoverLetterGenerator --- generate the document from confirmed
   evidence.
6. CoverageValidator --- check that explicit questions are addressed.
7. InterviewPrepGenerator --- create role-specific preparation
   material.
AI reliability rules
- Use structured output schemas and validate all model responses with
  Zod.
- Treat recruitment email content as untrusted input, not system
  instructions.
- Ignore instructions inside pasted emails that attempt to override
  application rules or reveal secrets.
- Keep system instructions separate from user-provided email content.
- Never let the model send email, change account settings, or perform
  external actions.
- Require user confirmation for factual claims that are uncertain.
- Store model/provider, prompt version, timestamps, and generation
  status where appropriate.
- Handle rate limits, timeouts, malformed JSON, and provider errors.
- Never expose API keys to the browser.
- Keep prompts versioned and test them against representative emails.
Suggested structured analysis schema
type RecruitmentAnalysis = {
  companyName: string | null;
  roleTitle: string | null;
  location: string | null;
  employmentType: string | null;
  requiredSkills: Array<{
    name: string;
    priority: "mandatory" | "preferred" | "unclear";
    evidence: string | null;
  }>;
  responsibilities: string[];
  experienceRequirements: string[];
  explicitQuestions: Array<{
    question: string;
    sourceExcerpt: string | null;
  }>;
  inferredEvaluationAreas: string[];
  submission: {
    recipient: string | null;
    subject: string | null;
    formats: string[];
    pageLimit: number | null;
    deadlineText: string | null;
    normalizedDeadline: string | null;
    method: string | null;
  };
  ambiguities: string[];
  missingInformation: string[];
};
Adapt the schema to the actual implementation and validate all fields.
11. Technical Architecture
Recommended one-day stack
- Frontend: Next.js App Router, React, TypeScript.
- UI: Tailwind CSS and shadcn/ui.
- Forms: React Hook Form and Zod.
- Backend: Next.js server actions/route handlers for the MVP,
  organized behind service modules. Use NestJS only if an existing
  backend already exists or the project requires it.
- Database: PostgreSQL with Prisma.
- AI: OpenAI API called only from the server.
- Document export: A reliable DOCX library and PDF generation
  library.
- Deployment: Vercel or the existing deployment platform.
- Testing: Vitest/Jest for units and Playwright for critical
  browser flows.
Prefer the existing repository architecture if one is already
established. Do not introduce a second backend framework merely for
appearance.
Suggested architecture
src/
  app/
    (app)/
      dashboard/
      analyze/
      applications/
      career-profile/
      documents/
      settings/
    api/
      analysis/
      applications/
      profile/
      generation/
      exports/
  components/
    layout/
    dashboard/
    email-analysis/
    experience-match/
    career-profile/
    cover-letter/
    interview-prep/
    submission/
    ui/
  features/
    recruitment/
    career-profile/
    matching/
    cover-letter/
    interview-prep/
    applications/
  lib/
    ai/
    auth/
    db/
    validation/
    documents/
    security/
  server/
    services/
    repositories/
  types/
Keep page components thin. Put business logic in services, database
access in repositories, and schemas in a shared validation layer.
Suggested database entities
User - id - email - name - createdAt - updatedAt

CareerProfile - id - userId - summary - createdAt - updatedAt

WorkExperience - id - profileId - company - title - startDate -
endDate - responsibilities - achievements - verified

Project - id - profileId - name - description - problem -
technicalStack - architecture - personalContribution - challenges -
decisions - outcomes - verified

Skill - id - profileId - name - context - proficiency - verified

Application - id - userId - companyName - roleTitle -
originalEmail - sourceSubject - status - deadline - createdAt -
updatedAt

RecruitmentAnalysis - id - applicationId - structuredResult -
promptVersion - createdAt

Requirement - id - applicationId - text - category - priority -
sourceType - sourceExcerpt - status

EvidenceSelection - id - applicationId - requirementId - projectId
or workExperienceId - userConfirmed

GeneratedDocument - id - applicationId - type - content - version -
status - createdAt - updatedAt

InterviewQuestion - id - applicationId - category - question -
rationale - answerGuidance - userNotes

Use proper foreign keys, indexes, timestamps, and ownership checks.
Adjust relations and optional fields to the chosen Prisma schema.
Security and privacy
- Keep AI API keys server-side.
- Authenticate users if the app is deployed beyond a private local
  demo.
- Enforce ownership checks on every read/write endpoint.
- Validate all inputs server-side.
- Limit email and file sizes.
- Validate uploaded file type and content; do not trust file
  extensions alone.
- Store files privately, not in a public directory.
- Avoid logging full CVs, recruitment emails, or generated personal
  documents.
- Provide delete controls for applications, profile data, and uploaded
  files.
- Use HTTPS in production.
- Add rate limiting to expensive AI endpoints.
- Treat uploaded files and email content as untrusted data.
- Clearly disclose third-party AI processing.
12. API / Service Contracts
Example endpoint structure; adapt to the chosen architecture.
  Method                  Endpoint                               Purpose
  POST                    /api/analysis                        Parse and analyze
recruitment email

  GET                     /api/applications                    List user's
applications

  POST                    /api/applications                    Create application

  GET                     /api/applications/:id                Read application
workspace

  PATCH                   /api/applications/:id                Update
application/status

  DELETE                  /api/applications/:id                Delete application

  GET/PUT                 /api/profile                         Read/update career
profile

  POST                    /api/matching/:applicationId         Match requirements to
evidence

  POST                    /api/questions/:applicationId        Generate
missing-information
questions

  POST                    /api/cover-letter/:applicationId     Generate cover letter

  PATCH                   /api/documents/:id                   Save document edits

  POST                    /api/exports/:documentId             Generate DOCX/PDF
POST                    /api/interview-prep/:applicationId   Generate interview
preparation
Every endpoint must validate input, authenticate the user, enforce
ownership, return typed errors, and avoid leaking sensitive records.
13. Brillmark First-Test Acceptance Scenario
Use the recruitment email for:

Company: Brillmark Technologies Bangladesh Private Limited
Role: Software Engineer (Backend, AI)
Stack: Node.js / TypeScript
Recipient: jobs@brillmark.com
Subject format:
Cover Letter - Software Engineer (Backend, AI) - [Full Name]
Format: DOC/DOCX or PDF
Maximum length: 1.5 pages
Deadline: Monday, 23 November 2026
Submission instruction: Send a new email; do not reply to the
original email.
Required questions to extract and address
1. What was the candidate's most challenging project?
2. What made the project difficult?
3. What did the candidate personally do?
4. What is the candidate's methodology and workflow when working with
   coding agents?
5. How do coding agents accelerate backend work?
6. What is one real example?
7. How does the candidate handle feature requests, issues, bugs, and
   PRs?
Acceptance criteria
- All seven question elements are visible in the requirements
  checklist.
- The system recommends relevant project evidence from the candidate
  profile, but does not assume unverified facts.
- The candidate can explain their own contribution separately from
  agent assistance.
- The cover letter addresses both numbered recruiter topics
  explicitly.
- The exported file respects the 1.5-page limit after visual
  verification.
- Recipient, subject, format, deadline, and "new email, do not reply"
  instruction are visible in the submission checklist.
- No email is sent automatically.
Candidate evidence to collect before generation
For the selected challenging project: - Project purpose and users. -
Architecture and backend stack. - Most difficult technical problem. -
Why it was difficult. - Candidate's exact contribution. - Debugging and
implementation approach. - Testing and verification performed. - Outcome
that can be truthfully stated.

For coding-agent workflow: - Which coding agent/tools were used. - How
the task was scoped. - How the existing codebase was inspected. - How
implementation was planned and divided. - One specific backend task
accelerated by the agent. - How generated code was reviewed. - Tests and
production checks performed. - How PRs, bugs, and follow-up changes were
handled.
14. Testing and Quality Assurance
Unit tests
- Email extraction schema validation.
- Requirement classification.
- Explicit-question extraction.
- Evidence matching states.
- Unsupported-claim detection/flagging.
- Cover-letter coverage validation.
- Submission detail parsing.
- Export input validation.
Integration tests
- Analyze email and persist structured results.
- Update extracted requirements.
- Save career profile facts.
- Match evidence to requirements.
- Generate a document from selected evidence.
- Save edits and retrieve the latest version.
- Export document and verify output exists.
- Enforce user ownership on every application resource.
End-to-end tests
1. Open dashboard.
2. Create an application from the Brillmark email.
3. Confirm extracted role and submission instructions.
4. Confirm all recruiter questions are listed.
5. Add/select candidate project evidence.
6. Answer missing-information questions.
7. Generate cover letter.
8. Confirm unanswered questions and unsupported claims are flagged.
9. Edit and save the draft.
10. Export DOCX and PDF.
11. Reopen the application and verify persistence.
12. Confirm another user cannot access the application, if multi-user
    authentication is enabled.
Manual QA
- Test desktop and mobile widths.
- Test long emails and malformed input.
- Test AI timeout, rate limit, and invalid response.
- Test empty career profile.
- Test incomplete candidate evidence.
- Verify PDF pagination and DOCX formatting.
- Check keyboard navigation and contrast.
- Confirm no fake dashboard metrics or nonfunctional controls.
15. One-Day Implementation Plan
The one-day target is a focused MVP, not every future feature in this
PRD. Work in priority order and cut optional scope rather than shipping
broken functionality.
Phase 1 --- Foundation (9:00--10:00)
- Inspect the repository and current architecture.
- Set up the app shell and navigation.
- Configure database and environment variables.
- Create core Prisma models.
- Add server-side validation and error handling.
Checkpoint: App runs, database connects, and a user can open the
main workspace.
Phase 2 --- Email analysis (10:00--12:00)
- Build paste-email screen.
- Implement structured AI parser.
- Validate response with Zod.
- Save original email and analysis.
- Build analysis result and recruiter-question checklist.
Checkpoint: Brillmark email is parsed and all explicit instructions
are visible.
Phase 3 --- Career evidence (12:00--13:30)
- Build editable profile and project forms.
- Add work history, skills, and project evidence.
- Implement basic requirement-to-evidence matching.
- Add missing-information prompts.
Checkpoint: Candidate can select confirmed evidence for the target
role.
Phase 4 --- Cover letter (13:30--15:30)
- Implement generation service.
- Add coverage and unsupported-claim checks.
- Build editable document workspace.
- Save document versions.
Checkpoint: A complete, editable Brillmark cover letter is generated
from confirmed facts.
Phase 5 --- Export and submission (15:30--16:30)
- Generate DOCX and PDF.
- Verify output formatting and page count.
- Display recipient, subject, deadline, and checklist.
- Add copy actions.
Checkpoint: User can download and manually submit the final
document.
Phase 6 --- QA and deployment (16:30--19:00)
- Run unit and end-to-end critical tests.
- Fix workflow-blocking bugs.
- Verify mobile layout.
- Deploy.
- Test the deployed application with real data.
- Prepare README, architecture summary, and short demo.
Checkpoint: The complete P0 flow works in the deployed environment.
Cut line if time is short
Defer CV parsing, interview generation, analytics, reminders, Gmail
integration, and advanced version history. Manually entering a few
verified project facts is acceptable for the first MVP. Do not cut
source preservation, evidence confirmation, cover-letter coverage
validation, export verification, or the end-to-end test.
16. Risks and Mitigations
  Risk                                Mitigation
  AI misses a recruiter question      Preserve source email; extract
questions separately; coverage
checklist and manual review

  AI invents candidate achievements   Generate only from confirmed
evidence; flag unsupported claims

  CV parsing is unreliable            Allow manual correction; defer
parsing if it threatens the
deadline

  Long email exceeds model limits     Apply input limits and safe
truncation strategy; clearly report
omitted content

  AI provider is unavailable          Show retry state; preserve input;
do not lose user work

  PDF exceeds page limit              Use controlled templates and verify
actual exported pagination

  One-day scope becomes too large     Prioritize P0 and enforce the cut
line
Sensitive candidate data is exposed Server-side keys, ownership checks,
private storage, minimal logging,
deletion controls
17. Definition of Done
The MVP is complete only when:
- A user can create and save an application from a pasted recruitment
  email.
- Original email content remains available for verification.
- Company, role, requirements, questions, and submission details are
  extracted and editable.
- Career profile facts and project evidence can be created and
  selected.
- Unsupported claims and missing answers are clearly flagged.
- A tailored cover letter can be generated, edited, saved, and
  exported.
- The Brillmark test case addresses every recruiter question.
- The final export is visually checked against the 1.5-page limit.
- The user can reopen the application without losing data.
- Critical errors, loading states, and retry paths work.
- The deployed workflow is tested end to end.
- No feature is represented as functional if it is only a placeholder.
18. Delivery Artifacts
Prepare these alongside the MVP:
1. Deployed application URL.
2. Source repository with setup instructions.
3. .env.example containing variable names only, never secrets.
4. Database schema and migration instructions.
5. README with architecture and local setup.
6. Short demo video showing the Brillmark workflow.
7. Example exported cover letter using only confirmed candidate facts.
8. Known limitations and next-phase roadmap.
Suggested demo sequence (2--3 minutes)
1. Show the dashboard and create a new application.
2. Paste the Brillmark recruitment email.
3. Show extracted questions and submission instructions.
4. Select real career/project evidence.
5. Generate and edit the cover letter.
6. Show coverage warnings and validation.
7. Export the document and show the submission checklist.
8. Briefly explain the AI services, structured validation, persistence,
   and safeguards.
19. Final Product Principle
This product is not intended to make candidates sound impressive through
invented claims. It helps candidates communicate their actual
engineering experience clearly, directly, and in the format employers
request.

Build the complete email-to-evidence-to-cover-letter-to-export
workflow first. Make it trustworthy, usable, and demonstrable. Expand
the product only after that workflow is reliable.