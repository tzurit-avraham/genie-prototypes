/* data.js - Scenario data for the David @ MightyTech demo */

window.APP_DATA = {
  // Account-level inferred context
  buyer: {
    name: 'David Cohen',
    role: 'L&D Director',
    company: 'MightyTech',
    email: 'david.c@mightytech.io',
    intent: 'Building an enterprise training hub'
  },

  genie: {
    // Proactive greeting: sound + red dot on the launcher after the visitor lands,
    // the message itself appears in the chat when the widget is opened
    greeting: {
      delay: 1000, // ms after page load
      text: "Hi David, welcome to Kaltura! I can help you find the right video training setup for MightyTech. Where would you like to start?",
      suggestions: [
        "What do you offer for a training hub?",
        "How do tech companies train with video?",
        "Does it work with our LMS?"
      ]
    },

    modes: [
      { value: 'fast',     label: 'Fast answer', selected: true },
      { value: 'detailed', label: 'Detailed answer' }
    ]
  },

  // Scripted scenario turns
  scenario: [
    {
      turn: 1,
      // Prompt copied to clipboard when input is focused on Turn 1
      userPrompt: "We're looking to build an employee training hub at MightyTech. What does Kaltura offer for this?",

      // Agent response
      agentResponse: {
        type: 'standard',
        text: "Kaltura provides an enterprise-grade Video Training Hub designed for global L&D teams. For MightyTech, it brings together personalized learning journeys, interactive video quizzing, automated indexing, and deep LMS/HRIS integrations—allowing employees to discover, consume, and track training seamlessly.",
        highlightsTitle: "Key capabilities for MightyTech:",
        highlights: [
          "Personalized training channels & micro-learning paths",
          "In-video interactive quizzes and engagement verification",
          "AI-powered transcription, search, and automatic chaptering",
          "Seamless integration with LMS, Slack, and Microsoft Teams"
        ],
        recommendedMedia: {
          title: "MightyTech Training Hub: Architecture & L&D Walkthrough",
          duration: "00:41",
          eyebrow: "Recommended video",
          description: "A short walkthrough of how the training hub is set up for an engineering org: channels, interactive quizzes and LMS sync.",
          sourceTag: "Video · 41 sec",
          // Live thumbnail of Kaltura entry 1_qxskuo8y (partner 811441)
          thumbnail: "https://cdnapisec.kaltura.com/p/811441/thumbnail/entry_id/1_qxskuo8y/width/1280"
        },
        sourcesCount: 4,
        nextStepsTitle: "Next steps",
        nextSuggestions: [
          "Show me tech case studies",
          "How does this fit our onboarding at scale?",
          "Book a walkthrough"
        ]
      }
    },
    {
      turn: 2,
      // Prompt copied to clipboard when input is focused on Turn 2
      userPrompt: "How does this fit our onboarding at scale?",

      // Agent response in GenUI format
      agentResponse: {
        type: 'genui',
        intro: "Here is an overview of the solution tailored specifically to MightyTech's engineering onboarding and organization scale needs:",
        card: {
          title: "MightyTech Engineering Training & Knowledge Hub",
          sections: [
            {
              eyebrow: "1 · Strategic onboarding",
              title: "Accelerated Dev Ramp-Up",
              text: "Role-based technical onboarding channels with automatic video indexing by codebase, repo, and sprint topic—reducing time-to-first-commit across engineering teams.",
              sourceTag: "Dev Blueprint (PDF)",
              media: {
                thumbnail: "assets/source-1.png",
                title: "Dev Onboarding Blueprint (PDF)",
                meta: "12 pages"
              },
              // PDF content shown in the side canvas
              doc: {
                title: "Developer Onboarding Blueprint",
                subtitle: "Role-based video training architecture for engineering teams",
                audience: "Engineering & L&D",
                summary: "This blueprint outlines the automated video ingestion, repo-based chaptering and LMS sync framework for MightyTech engineering pods. New hires reach their first commit within 5 business days through synchronized technical walkthroughs and interactive checkpoints.",
                steps: [
                  { title: "Git / IDE Sync", text: "Automatic indexing by repo & branch" },
                  { title: "Kaltura Hub", text: "AI transcription & searchable tech talks" },
                  { title: "HRIS / LMS", text: "Verified skill checkpoints & tracking" }
                ],
                sections: [
                  { h: "2. Technical onboarding tracks", p: "Curated micro-learning paths map directly to MightyTech's production architecture. Video modules are indexed by codebase, repo and sprint topic, so developers can search for a code snippet and jump straight to the relevant architecture discussion." },
                  { h: "3. Week-one ramp-up plan", p: "Day 1 covers environment setup and team rituals. Days 2–3 walk through core services with recorded design reviews. Days 4–5 pair new hires with a buddy on a starter ticket, backed by short how-to clips from senior engineers." },
                  { h: "4. Verified milestones", p: "In-video coding exercises and knowledge gates trigger automatic milestone completions in Workday and Slack, cutting manual onboarding coordination by 68%." },
                  { h: "5. Rollout across engineering pods", p: "Start with two pilot pods for 30 days, measure time-to-first-commit and content engagement, then scale the channel templates to all 40+ engineering teams." }
                ]
              }
            },
            {
              eyebrow: "2 · Architecture repository",
              title: "Living Architecture Knowledge Base",
              text: "Recorded tech talks, RFC walkthroughs, and system design sessions transcribed and searchable by spoken word and code snippet across the entire organization.",
              sourceTag: "Search Spec (PDF)",
              media: {
                thumbnail: "assets/source-2.png",
                title: "TechTalks Indexing & Search Spec (PDF)",
                meta: "8 pages"
              },
              doc: {
                title: "TechTalks Indexing & Search Spec",
                subtitle: "Making every tech talk, RFC review and design session searchable",
                audience: "Platform Engineering",
                summary: "MightyTech records hundreds of hours of engineering knowledge every quarter. This spec describes how Kaltura captures those sessions, enriches them with AI, and makes every spoken word, slide and code snippet instantly findable.",
                steps: [
                  { title: "Capture", text: "Zoom, Teams & Kaltura Rooms recordings" },
                  { title: "Enrich", text: "AI transcripts, chapters & code OCR" },
                  { title: "Discover", text: "Search by spoken word, slide or snippet" }
                ],
                sections: [
                  { h: "2. Ingestion sources", p: "Recordings flow in automatically from Zoom, Microsoft Teams and Kaltura Rooms. Uploaded RFC walkthroughs and Loom-style screen captures are tagged by team, service and quarter on arrival." },
                  { h: "3. AI enrichment pipeline", p: "Every video is transcribed in 30+ languages, split into chapters, and scanned for on-screen code. Speakers, services and acronyms are detected and linked to MightyTech's internal glossary." },
                  { h: "4. Search experience", p: "Engineers search from the hub, Slack or the IDE plugin. Results land on the exact second a topic is discussed, with the matching transcript line and slide preview." },
                  { h: "5. Access & governance", p: "SSO groups control who sees which channels. Sensitive sessions can be restricted to specific teams, and retention policies archive outdated content automatically." }
                ]
              }
            },
            {
              eyebrow: "3 · Competency validation",
              title: "Verified Skill Proficiency",
              text: "In-video interactive checkpoints and coding scenario quizzes integrated with your HRIS to automatically track compliance and technical ramp-up milestones.",
              sourceTag: "LMS Guide (PDF)",
              media: {
                thumbnail: "assets/source-3.png",
                title: "Skill Verification & LMS Integration Guide (PDF)",
                meta: "15 pages"
              },
              doc: {
                title: "Skill Verification & LMS Integration Guide",
                subtitle: "Interactive checkpoints connected to your HRIS and LMS",
                audience: "L&D & People Ops",
                summary: "This guide shows how MightyTech can prove skills, not just track views. Interactive checkpoints inside training videos verify understanding, and results sync automatically to Workday, your LMS and Slack.",
                steps: [
                  { title: "Watch", text: "Interactive video learning paths" },
                  { title: "Verify", text: "In-video quizzes & coding scenarios" },
                  { title: "Sync", text: "Completions to Workday, LMS & Slack" }
                ],
                sections: [
                  { h: "2. Interactive checkpoint types", p: "Multiple choice, reflection prompts, hotspots and short coding scenarios can be placed at any point in a video. Learners can't skip ahead until a checkpoint is passed." },
                  { h: "3. Scoring & proficiency thresholds", p: "Each learning path sets a pass mark per skill. Managers see proficiency by team and can assign refresher clips automatically when a score drops below the threshold." },
                  { h: "4. HRIS / LMS integration", p: "Native connectors for Workday, Cornerstone and Docebo push completions and scores in real time. xAPI and SCORM exports are available for any other LMS." },
                  { h: "5. Compliance reporting", p: "Audit-ready reports show who completed which training, when and with what score — ready for SOC 2 and security-awareness reviews." }
                ]
              }
            }
          ]
        },
        sourcesCount: 6,
        nextStepsTitle: "Suggested next step",
        nextSuggestions: [
          "Let's meet to review this plan"
        ]
      }
    },
    {
      turn: 3,
      // Prompt copied to clipboard when input is focused on Turn 3
      userPrompt: "Let's meet to review this plan",

      // Agent response is the wizard
      agentResponse: {
        type: 'wizard',
        intro: "Great! Let's schedule a dedicated walkthrough with a Kaltura Enterprise Learning specialist to review this plan for MightyTech.",
        wizard: {
          step1: {
            title: "Confirm your details",
            subtitle: "Step 1 of 2",
            fields: [
              { id: "wiz-name", label: "Full Name", value: "David Cohen" },
              { id: "wiz-role", label: "Role", value: "L&D Director" },
              { id: "wiz-company", label: "Company", value: "MightyTech" },
              { id: "wiz-email", label: "Work Email", value: "david.c@mightytech.io" }
            ],
            buttonLabel: "Next: Choose a time"
          },
          step2: {
            title: "Select date & time",
            subtitle: "Step 2 of 2",
            dates: [
              { label: "Tomorrow", date: "Thu, Oct 22", selected: true },
              { label: "Friday", date: "Fri, Oct 23" },
              { label: "Monday", date: "Mon, Oct 26" }
            ],
            // Grouped by time of day in the UI (chronological within each group)
            slots: [
              { time: "9:00 AM", period: "Morning" },
              { time: "10:00 AM", period: "Morning", selected: true },
              { time: "11:30 AM", period: "Morning" },
              { time: "1:30 PM", period: "Afternoon" },
              { time: "3:00 PM", period: "Afternoon" },
              { time: "4:30 PM", period: "Afternoon" }
            ],
            buttonLabel: "Confirm Meeting"
          },
          confirmed: {
            title: "Meeting Confirmed!",
            subtitle: "Calendar invitation sent to david.c@mightytech.io",
            details: [
              { icon: "calendar", label: "Tomorrow (Thu, Oct 22) at 10:00 AM EDT" },
              { icon: "video", label: "30-min Zoom Walkthrough" },
              { icon: "user", label: "Hosted by Sarah Jenkins (Kaltura Enterprise L&D Specialist)" }
            ]
          }
        },

        // Proactive follow-up the agent sends after the meeting is booked
        followUp: {
          delay: 1500, // ms after the booking is confirmed
          text: "You're all set for tomorrow, David! Want to make the 30 minutes count? Answer 4 quick questions and Sarah will come prepared with examples that fit MightyTech.",
          nextStepsTitle: "Suggested next step",
          suggestion: "Sure, let's prep"
        }
      }
    },
    {
      turn: 4,
      // Prompt copied to clipboard when input is focused on Turn 4 (same text as the follow-up suggestion)
      userPrompt: "Sure, let's prep",

      // Agent response: one qualification question at a time, varied input types
      agentResponse: {
        type: 'qualify',
        intro: "Great! Your answers go straight to Sarah so she can tailor the walkthrough. It takes less than a minute.",
        title: "Prep for your walkthrough", // card header, same on every question
        questions: [
          {
            id: 'learners',
            type: 'range',
            title: "How many employees will use the training hub?",
            min: 100, max: 10000, step: 100, value: 1500,
            unit: "employees",
            summaryIcon: "group",
            summary: "{value} employees on the hub"
          },
          {
            id: 'systems',
            type: 'checkbox',
            title: "Which systems should it connect to?",
            options: [
              { label: "Workday", checked: true },
              { label: "Slack", checked: true },
              { label: "Microsoft Teams" },
              { label: "SAP SuccessFactors" },
              { label: "Cornerstone LMS" },
              { label: "Okta SSO" }
            ],
            summaryIcon: "integrations",
            summary: "Connects to {value}",
            emptySummary: "No integrations yet"
          },
          {
            id: 'timeline',
            type: 'pills', // same pill style as the date picker in the scheduler
            title: "When do you plan to launch?",
            options: [
              { label: "This quarter", sub: "By Dec 2026" },
              { label: "Next quarter", sub: "Jan - Mar 2027" },
              { label: "Later", sub: "Apr 2027+" }
            ],
            value: "Next quarter",
            summaryIcon: "timeline",
            summary: "Launching: {value}"
          },
          {
            id: 'stakeholders',
            type: 'text',
            title: "Who else should join the walkthrough?",
            placeholder: "e.g. Head of IT, VP People",
            summaryIcon: "executives",
            summary: "Joining: {value}",
            emptySummary: "Just David for now"
          }
        ],
        nextLabel: "Next",
        finishLabel: "Send to Sarah",
        done: {
          title: "Sarah is all set!",
          subtitle: "Your answers were shared with Sarah Jenkins ahead of tomorrow's walkthrough.",
          editLabel: "Edit answers"
        }
      }
    }
  ]
};
