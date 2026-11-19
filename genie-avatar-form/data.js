/* data.js - fake content for the Genie Avatar + form prototype */

window.APP_DATA = {
  // Suggestion pills under the composer on the start screen
  suggestions: [
    'What is Genie and how does it work?',
    'What are the three investment areas for Q4?',
    'What is the agents framework and its primary focus?'
  ],

  modes: [
    { value: 'fast', label: 'Fast answer', selected: true },
    { value: 'detailed', label: 'Detailed answer' }
  ],

  // Scripted answers, matched by the exact suggestion text; anything else gets `fallback`
  answers: {
    'What is Genie and how does it work?': {
      text: 'Genie is your AI assistant for everything in this video portal. It searches across every video, transcript, slide and document you have access to, and answers in plain language with links to the exact moments it used.',
      highlightsTitle: 'How it works:',
      highlights: [
        'Indexes transcripts, captions, slides and metadata of every entry',
        'Finds the most relevant moments and writes a short answer',
        'Cites its sources so you can jump straight to the clip',
        'Can talk with you face to face through your AI avatar'
      ],
      sources: [
        { title: 'Meet Genie: AI search for your videos', time: '02:14', image: 'assets/channel-1.png' },
        { title: 'Genie admin walkthrough', time: '11:40', image: 'assets/channel-3.png' }
      ],
      followUps: ['Which content can Genie search?', 'Can Genie make flashcards for me?']
    },
    'What are the three investment areas for Q4?': {
      text: 'In the Q4 all-hands, leadership named three investment areas for the quarter.',
      highlightsTitle: 'Q4 investment areas:',
      highlights: [
        'AI agents: ship agent-led experiences across the product line',
        'Enterprise readiness: security, compliance and admin controls',
        'Customer growth: expand in existing accounts through self-serve onboarding'
      ],
      sources: [
        { title: 'Q4 all-hands: strategy and priorities', time: '38:05', image: 'assets/channel-3.png' }
      ],
      followUps: ['Who owns the AI agents investment?', 'Summarize the all-hands in 5 bullets']
    },
    'What is the agents framework and its primary focus?': {
      text: 'The agents framework is the shared toolkit teams use to build AI agents on top of the video platform. Its primary focus is letting agents take real actions, not just answer questions, while keeping every action safe and auditable.',
      highlightsTitle: 'What it covers:',
      highlights: [
        'Tools: a common way for agents to call platform APIs',
        'Memory: context from past sessions and the content library',
        'Guardrails: permissions, approvals and full activity logs'
      ],
      sources: [
        { title: 'Generative AI for product leaders, lesson 4', time: '07:22', image: 'assets/channel-1.png' },
        { title: 'Security training: AI guardrails', time: '05:10', image: 'assets/channel-2.png' }
      ],
      followUps: ['Show me an example agent', 'How are agent actions approved?']
    }
  },

  fallback: {
    text: 'Here is what I found across your videos and documents. This prototype has scripted answers for the suggested questions; try one of them for a fuller answer.',
    highlights: [],
    flashcards: [
      'Genie answers from your own videos, slides and documents',
      'Every answer links to the moments it used',
      'You can ask by typing or by talking to the avatar'
    ],
    sources: [
      { title: 'Generative AI for product leaders', time: '24 lessons', image: 'assets/channel-1.png' }
    ],
    followUps: ['What is Genie and how does it work?', 'What are the three investment areas for Q4?']
  },

  // Answer shown when a preset (Flashcards / Text) is on
  presets: {
    flashcards: 'I turned that into flashcards. Flip through them to test yourself.',
    text: 'Here is a written summary you can copy into your notes.'
  },

  // Recommended channels (Figma 14402:24165)
  channels: [
    {
      title: 'Generative AI for product leader',
      description: 'Explore the cutting-edge intersection of Generative AI and product leadership...',
      lessons: '24 Lessons',
      match: '56% match',
      image: 'assets/channel-1.png'
    },
    {
      title: 'Security training',
      description: 'Empowering professionals with the knowledge and skills to safeguard digital...',
      lessons: '24 Lessons',
      match: '56% match',
      image: 'assets/channel-2.png'
    },
    {
      title: 'Strategy & Consulting',
      description: 'Empowering professionals with the knowledge and skills to safeguard digital...',
      lessons: '24 Lessons',
      match: '56% match',
      image: 'assets/channel-3.png'
    }
  ],

  // Main colors of each avatar image, used when the page can't read the pixels (file://).
  // Computed from the image the same way app.js does (dark / middle / light groups + most saturated).
  avatarPalettes: {
    'assets/avatar.png': { dark: '#5b5c3f', mid: '#9a9279', light: '#cbc7b5', accent: '#b9895f' }
  },

  // Audio devices in the avatar call mic menu (one checked per group)
  devices: [
    { group: 'mic', title: 'Choose microphone', items: [
      { label: 'MacBook Pro Microphone (Built-in)', checked: true },
      { label: 'USB audio CODEC (08bb:2912)' },
      { label: 'Logitech Webcam C930e (046d:085b)' },
      { label: 'Default - MacBook Pro Microphone (Built-in)' }
    ] },
    { group: 'speaker', title: 'Choose speaker', items: [
      { label: 'Default - MacBook Pro Speakers (Built-in)' },
      { label: 'USB audio CODEC (08bb:2912)' },
      { label: 'MacBook Pro Speakers (Built-in)', checked: true }
    ] }
  ],

  // Viewers shown on every channel card
  viewers: ['assets/user-1.png', 'assets/user-2.png', 'assets/user-3.png'],

  // "A Few Details About You" form (Figma 19562:22081).
  // Whatever the user writes in the chat, the agent answers with this form.
  form: {
    intro: 'Great. This will only take a moment and helps me show you the most relevant content.',
    title: 'A Few Details About You',
    subtitle: 'Tell me a bit about yourself so I can guide you with content that fits your needs.',
    // type: input | email | select. Only fields with required: true must be filled (email); Submit stays disabled until they are.
    fields: [
      { id: 'first-name', label: 'First name', value: 'Matthew', autocomplete: 'given-name' },
      { id: 'last-name', label: 'Last name', value: 'Barnett', autocomplete: 'family-name' },
      { id: 'email', label: 'Email', type: 'email', value: '', required: true, autocomplete: 'email' },
      { id: 'age', label: 'Age range', type: 'select', value: '35-45',
        options: ['18-24', '25-34', '35-45', '46-55', '56+'] },
      { id: 'job-title', label: 'Job Title', value: 'Business Executive', autocomplete: 'organization-title' },
      { id: 'company', label: 'Company Name', value: 'Kaltura', autocomplete: 'organization' },
      { id: 'country', label: 'Country', type: 'select', value: 'United States',
        options: ['United States', 'United Kingdom', 'Germany', 'France', 'Israel', 'Canada'] },
      { id: 'city', label: 'City', value: 'New York', autocomplete: 'address-level2' }
    ],
    skipLabel: 'Skip',
    submitLabel: 'Submit',

    // Step 2: done
    done: {
      title: 'Thanks, {first}!',
      subtitle: 'Now I can personalize everything for you.',
      editLabel: 'Edit details'
    },

    // Chat turns around the form
    userDone: 'Done, I added all my details.',
    agentDone: 'Perfect, thanks! Now I can personalize everything for you.',
    userSkip: 'Let\u2019s continue without it.',
    agentSkip: 'No problem. You can share your details anytime to get more personal recommendations.',
    nextSteps: ['What tools do I need to get started?', 'Recommend next topics to explore', 'Show me real-world use cases'],

    // Avatar call: what the avatar "says" (shown as captions)
    callIntro: 'Hey! I can help tailor this experience to you. Mind filling in a few quick details?',
    callDone: 'Perfect, thanks! Now I can personalize everything for you.',
    callSkip: 'No problem. Let\u2019s keep talking.'
  },

  // Prototype-only: screen widths for the Mobile view (portrait; the frame scales down to fit the window)
  phones: [
    { value: '375', label: '375', width: 375, height: 812 },
    { value: '600', label: '600', width: 600, height: 960 },
    { value: '960', label: '960', width: 960, height: 1280 }
  ]
};
