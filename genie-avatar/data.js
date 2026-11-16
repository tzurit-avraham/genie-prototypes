/* data.js - fake content for the Genie Avatar prototype */

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

  // Viewers shown on every channel card
  viewers: ['assets/user-1.png', 'assets/user-2.png', 'assets/user-3.png']
};
