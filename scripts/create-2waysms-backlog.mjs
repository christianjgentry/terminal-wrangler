#!/usr/bin/env node
/**
 * Script to create the 2waySMS Jira backlog
 *
 * Usage:
 *   Set environment variables:
 *     JIRA_CLOUD_URL=https://your-domain.atlassian.net
 *     JIRA_EMAIL=your-email@example.com
 *     JIRA_API_TOKEN=your-api-token
 *
 *   Then run:
 *     node scripts/create-2waysms-backlog.mjs
 *
 * Or pass credentials as arguments:
 *     node scripts/create-2waysms-backlog.mjs --url https://your-domain.atlassian.net --email your-email --token your-token
 */

import https from 'https'

// ─── Configuration ───────────────────────────────────────────────────────────

const PROJECT_KEY = 'TWO'

// ─── Backlog Data ────────────────────────────────────────────────────────────

const EPICS = [
  {
    name: 'Epic 1: Project Scaffolding + Core Infrastructure',
    summary: 'Project Scaffolding + Core Infrastructure',
    description: 'Goal: Running app with basic structure, auth gate, and environment config.',
    tasks: [
      { key: 'TWO-1', summary: 'Initialize Vite project with TypeScript template', description: 'Set up a new Vite project using the TypeScript template. This establishes the foundation for the 2waySMS application build system.' },
      { key: 'TWO-2', summary: 'Install project dependencies (vite, typescript)', description: 'Install core dependencies including Vite 6, TypeScript, and any required dev dependencies for the build toolchain.' },
      { key: 'TWO-3', summary: 'Configure vite.config.ts with environment variables', description: 'Set up Vite configuration to properly handle environment variables, define build options, and configure development server settings.' },
      { key: 'TWO-4', summary: 'Create TypeScript types (Message, ConversationState, ResponseCategory)', description: 'Define TypeScript interfaces and types for core data structures: Message (content, sender, timestamp), ConversationState (current workflow state), and ResponseCategory (yes, no, call later, etc.).' },
      { key: 'TWO-5', summary: 'Set up .env and .env.example for API keys', description: 'Create environment configuration files with placeholders for OpenAI API key and any other required secrets. Include .env.example for documentation.' },
      { key: 'TWO-6', summary: 'Create main.ts with password gate authentication', description: 'Implement the entry point with a password gate (password: "2waySMS") that must be passed before accessing the main application.' },
      { key: 'TWO-7', summary: 'Build base CSS with dark theme and variables', description: 'Create the foundational CSS with CSS custom properties (variables) for colors, spacing, and typography. Implement dark theme as the default.' },
      { key: 'TWO-8', summary: 'Create app.ts with initApp() entry point', description: 'Build the main application initialization function that sets up the DOM, initializes state, and starts the conversation flow.' },
    ]
  },
  {
    name: 'Epic 2: Phone UI + Messaging Components',
    summary: 'Phone UI + Messaging Components',
    description: 'Goal: Complete phone mockup with message rendering and input handling.',
    tasks: [
      { key: 'TWO-9', summary: 'Build phone container with status bar (time, signal, battery)', description: 'Create the phone mockup container with a realistic status bar showing current time, signal strength icon, and battery indicator.' },
      { key: 'TWO-10', summary: 'Create chat header with contact info and refresh button', description: 'Build the chat header component displaying contact name/number and a refresh button to reset the conversation.' },
      { key: 'TWO-11', summary: 'Implement message bubble components (sent/received styles)', description: 'Create reusable message bubble components with distinct styling for sent (user) and received (bot) messages.' },
      { key: 'TWO-12', summary: 'Build messages container with auto-scroll', description: 'Implement the scrollable messages container that automatically scrolls to the latest message when new messages are added.' },
      { key: 'TWO-13', summary: 'Create options button rendering for bot responses', description: 'Build the system for rendering clickable option buttons below bot messages to guide user responses.' },
      { key: 'TWO-14', summary: 'Implement text input area with send button', description: 'Create the text input field and send button at the bottom of the phone UI for free-form message entry.' },
      { key: 'TWO-15', summary: 'Add ADT intro message on conversation start', description: 'Display the initial ADT introduction message when a conversation begins, including AI disclosure and legal notices.' },
      { key: 'TWO-16', summary: 'Create tab switcher (Chat / Dialogue Editor)', description: 'Implement a tab interface to switch between the Chat view and Dialogue Editor view.' },
    ]
  },
  {
    name: 'Epic 3: Webform Workflow + Call Simulation',
    summary: 'Webform Workflow + Call Simulation',
    description: 'Goal: Complete webform lead follow-up workflow with call simulation.',
    tasks: [
      { key: 'TWO-17', summary: 'Implement conversation state machine for webform flow', description: 'Build the state machine that manages the webform lead follow-up conversation flow, handling transitions between states based on user responses.' },
      { key: 'TWO-18', summary: 'Build calling notification overlay (incoming call UI)', description: 'Create the incoming call overlay that appears when the system initiates a phone call to the user.' },
      { key: 'TWO-19', summary: 'Create call accept/decline handlers', description: 'Implement the logic for handling user acceptance or decline of incoming calls, with appropriate follow-up actions.' },
      { key: 'TWO-20', summary: 'Build active call screen with duration timer', description: 'Create the active call UI showing caller info and a running duration timer.' },
      { key: 'TWO-21', summary: 'Implement call control buttons (mute, speaker, keypad, contacts)', description: 'Add call control buttons: mute toggle, speaker toggle, keypad access, and contacts access.' },
      { key: 'TWO-22', summary: 'Create keypad modal with DTMF input', description: 'Build a modal keypad for DTMF tone input during active calls.' },
      { key: 'TWO-23', summary: 'Build contacts modal UI', description: 'Create a contacts modal that displays during active calls.' },
      { key: 'TWO-24', summary: 'Implement end call handler with post-call SMS flow', description: 'Handle call termination and trigger the appropriate post-call SMS follow-up flow.' },
      { key: 'TWO-25', summary: 'Create pattern matching response categorization', description: 'Implement regex-based pattern matching to categorize user text responses into predefined categories (yes, no, schedule, etc.).' },
      { key: 'TWO-26', summary: 'Build date/time picker modal for scheduling', description: 'Create a date/time selection modal for users who want to schedule callbacks at specific times.' },
      { key: 'TWO-27', summary: 'Implement "call at different time" scheduling flow', description: 'Build the complete flow for handling users who request callbacks at different times, including time selection and confirmation.' },
      { key: 'TWO-28', summary: 'Handle Yes/No/Unknown response branches', description: 'Implement branching logic for the three main response categories: affirmative, negative, and unclear responses.' },
      { key: 'TWO-29', summary: 'Implement 24-hour follow-up with time passing animation', description: 'Create the 24-hour no-response follow-up flow with a visual animation showing time passing.' },
    ]
  },
  {
    name: 'Epic 4: AI Integration + Response Categorization',
    summary: 'AI Integration + Response Categorization',
    description: 'Goal: OpenAI-powered intelligent response categorization with fallback.',
    tasks: [
      { key: 'TWO-30', summary: 'Create categorizeUserResponse async function', description: 'Build the main async function that categorizes user responses, coordinating between AI and pattern matching approaches.' },
      { key: 'TWO-31', summary: 'Implement OpenAI API integration (gpt-3.5-turbo)', description: 'Set up the OpenAI API client and implement the API call to GPT-3.5-turbo for response categorization.' },
      { key: 'TWO-32', summary: 'Build system prompt for 6-category classification', description: 'Create the system prompt that instructs the AI to classify responses into: Yes, Call at different time, No, 24 hours later, Do not contact, Unknown message.' },
      { key: 'TWO-33', summary: 'Create category normalization and mapping', description: 'Implement functions to normalize AI responses and map them to the standard category enum values.' },
      { key: 'TWO-34', summary: 'Implement pattern matching fallback (categorizeUserResponsePatternMatching)', description: 'Create the fallback pattern matching function used when AI is disabled or unavailable.' },
      { key: 'TWO-35', summary: 'Add AI enable/disable toggle in UI', description: 'Add a toggle control in the UI to enable or disable AI-powered categorization.' },
      { key: 'TWO-36', summary: 'Handle API errors and rate limiting gracefully', description: 'Implement error handling for API failures, rate limits, and network issues with appropriate fallbacks.' },
      { key: 'TWO-37', summary: 'Add console logging for AI debugging', description: 'Add detailed console logging for AI requests and responses to aid in debugging and monitoring.' },
    ]
  },
  {
    name: 'Epic 5: Additional Workflows',
    summary: 'Additional Workflows',
    description: 'Goal: Confirm Visit and Product Question workflows with switcher.',
    tasks: [
      { key: 'TWO-38', summary: 'Build workflow selector buttons UI', description: 'Create the UI component with buttons to switch between different workflow types (Webform, Confirm Visit, Product Question).' },
      { key: 'TWO-39', summary: 'Create workflow state persistence on switch', description: 'Implement state persistence so workflow progress is saved when switching between different workflows.' },
      { key: 'TWO-40', summary: 'Implement Confirm Visit conversation state machine', description: 'Build the state machine for the appointment confirmation workflow.' },
      { key: 'TWO-41', summary: 'Build Confirm Visit initial message with appointment details', description: 'Create the opening message for Confirm Visit that includes appointment date, time, and technician information.' },
      { key: 'TWO-42', summary: 'Handle Confirm Visit responses (Yes/No/Cancel/Reschedule/DNC)', description: 'Implement response handling for all Confirm Visit response categories.' },
      { key: 'TWO-43', summary: 'Implement confirm visit reschedule time selection', description: 'Build the rescheduling flow for the Confirm Visit workflow.' },
      { key: 'TWO-44', summary: 'Create Product Question workflow state machine', description: 'Build the state machine for the product question/inquiry workflow.' },
      { key: 'TWO-45', summary: 'Build Product Question conversation flow', description: 'Implement the complete conversation flow for product-related inquiries.' },
      { key: 'TWO-46', summary: 'Implement cross-workflow intent detection (switch to Confirm Visit)', description: "Detect when a user's response indicates they want to discuss a different topic and offer to switch workflows." },
      { key: 'TWO-47', summary: 'Add Version A/B toggle for workflow variations', description: 'Add UI toggle to switch between Version A and Version B of workflows.' },
      { key: 'TWO-48', summary: 'Implement Version B variations (skip certain messages)', description: 'Implement the Version B workflow variations that skip or modify certain messages.' },
    ]
  },
  {
    name: 'Epic 6: Dataflow Visualization + Legal Compliance',
    summary: 'Dataflow Visualization + Legal Compliance',
    description: 'Goal: Interactive SVG flowcharts and legal requirements documentation.',
    tasks: [
      { key: 'TWO-49', summary: 'Create SVG dataflow diagram container', description: 'Build the container component for rendering interactive SVG dataflow diagrams.' },
      { key: 'TWO-50', summary: 'Build webform workflow flowchart with state boxes', description: 'Create the SVG flowchart for the webform workflow showing all states and transitions.' },
      { key: 'TWO-51', summary: 'Implement state highlighting based on currentState', description: "Highlight the current state in the flowchart based on the conversation's current position." },
      { key: 'TWO-52', summary: 'Add zoom controls (+/-/reset) for diagram', description: 'Implement zoom in, zoom out, and reset zoom controls for the dataflow diagrams.' },
      { key: 'TWO-53', summary: 'Create click handlers for state box navigation', description: 'Allow users to click on state boxes in the diagram to navigate directly to that state.' },
      { key: 'TWO-54', summary: 'Build Confirm Visit dataflow diagram', description: 'Create the SVG flowchart for the Confirm Visit workflow.' },
      { key: 'TWO-55', summary: 'Build Product Question dataflow diagram', description: 'Create the SVG flowchart for the Product Question workflow.' },
      { key: 'TWO-56', summary: 'Create Legal Requirements workflow view', description: 'Build a dedicated view for displaying legal and compliance requirements.' },
      { key: 'TWO-57', summary: 'Build legal requirements checklist (TCPA, DNC, disclosures)', description: 'Create a checklist component showing TCPA compliance, DNC requirements, AI disclosures, and other legal requirements.' },
      { key: 'TWO-58', summary: 'Add webform image tab in legal view', description: 'Add a tab showing the webform design/screenshot in the legal requirements view.' },
      { key: 'TWO-59', summary: 'Implement show/hide phone+dataflow for Legal Requirements mode', description: 'Toggle visibility of phone mockup and dataflow when viewing legal requirements.' },
    ]
  },
  {
    name: 'Epic 7: Polish + Edge Cases',
    summary: 'Polish + Edge Cases',
    description: 'Goal: Final polish, edge case handling, and production readiness.',
    tasks: [
      { key: 'TWO-60', summary: 'Implement STOP keyword handling with user opt-out', description: 'Handle the STOP keyword to immediately opt the user out and stop all messaging.' },
      { key: 'TWO-61', summary: 'Add DNC (Do Not Contact) pattern recognition and handling', description: 'Recognize variations of do-not-contact requests and handle them appropriately.' },
      { key: 'TWO-62', summary: 'Create conversation reset functionality', description: 'Implement the ability to fully reset a conversation to its initial state.' },
      { key: 'TWO-63', summary: 'Build Dialogue Editor view for message editing', description: 'Create the Dialogue Editor interface for editing message templates and workflows.' },
      { key: 'TWO-64', summary: 'Add real-time phone time display', description: 'Update the phone status bar time to show the actual current time.' },
      { key: 'TWO-65', summary: 'Implement proper message timestamp formatting', description: 'Format message timestamps appropriately (e.g., "2:30 PM", "Yesterday", etc.).' },
      { key: 'TWO-66', summary: 'Add empty state handling for edge cases', description: 'Handle edge cases like empty conversations, missing data, and error states gracefully.' },
      { key: 'TWO-67', summary: 'Style red-active states for future/unavailable workflows', description: 'Add visual styling to indicate workflows that are planned but not yet implemented.' },
      { key: 'TWO-68', summary: 'Add responsive design for different screen sizes', description: 'Implement responsive CSS to support various screen sizes and devices.' },
      { key: 'TWO-69', summary: 'Implement keyboard shortcuts for common actions', description: 'Add keyboard shortcuts for send message (Enter), reset conversation, switch workflows, etc.' },
      { key: 'TWO-70', summary: 'Final CSS polish and animation refinements', description: 'Final pass on CSS styling, transitions, and animations for a polished user experience.' },
    ]
  }
]

// ─── Jira API Functions ──────────────────────────────────────────────────────

function buildAuth(creds) {
  return `Basic ${Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64')}`
}

function parseCloudUrl(cloudUrl) {
  let url = cloudUrl.trim()
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    url = `https://${url}`
  }
  const parsed = new URL(url)
  return {
    hostname: parsed.hostname,
    basePath: parsed.pathname.replace(/\/$/, '')
  }
}

function jiraRequest(creds, method, path, body) {
  return new Promise((resolve) => {
    const { hostname, basePath } = parseCloudUrl(creds.cloudUrl)
    const fullPath = `${basePath}${path}`

    const options = {
      hostname,
      path: fullPath,
      method,
      headers: {
        Authorization: buildAuth(creds),
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30_000
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk.toString()
      })
      res.on('end', () => {
        const status = res.statusCode ?? 0
        if (status === 401) {
          resolve({ data: null, error: 'Authentication failed — check email and API token' })
          return
        }
        if (status === 403) {
          resolve({ data: null, error: 'Access forbidden (403)' })
          return
        }
        if (status >= 400) {
          let msg = `Jira API error (${status})`
          try {
            const parsed = JSON.parse(data)
            if (parsed?.errorMessages?.length) msg = parsed.errorMessages[0]
            else if (parsed?.errors) msg = JSON.stringify(parsed.errors)
            else if (parsed?.message) msg = parsed.message
          } catch {
            /* use default */
          }
          resolve({ data: null, error: msg })
          return
        }
        try {
          resolve({ data: data ? JSON.parse(data) : null, error: null })
        } catch {
          resolve({ data: null, error: 'Failed to parse Jira response' })
        }
      })
    })

    req.on('error', (err) => {
      resolve({ data: null, error: `Network error: ${err.message}` })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ data: null, error: 'Request timed out' })
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

// ─── Issue Creation Functions ────────────────────────────────────────────────

async function createEpic(creds, summary, description) {
  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: description }]
          }
        ]
      },
      issuetype: { name: 'Epic' }
    }
  }

  return jiraRequest(creds, 'POST', '/rest/api/3/issue', body)
}

async function createTask(creds, summary, description, epicKey) {
  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: description }]
          }
        ]
      },
      issuetype: { name: 'Task' },
      parent: { key: epicKey }
    }
  }

  return jiraRequest(creds, 'POST', '/rest/api/3/issue', body)
}

// ─── Main Execution ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)

  // Check environment variables first
  const envUrl = process.env.JIRA_CLOUD_URL
  const envEmail = process.env.JIRA_EMAIL
  const envToken = process.env.JIRA_API_TOKEN

  if (envUrl && envEmail && envToken) {
    return { cloudUrl: envUrl, email: envEmail, apiToken: envToken }
  }

  // Parse command line arguments
  let cloudUrl = ''
  let email = ''
  let apiToken = ''

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      cloudUrl = args[++i]
    } else if (args[i] === '--email' && args[i + 1]) {
      email = args[++i]
    } else if (args[i] === '--token' && args[i + 1]) {
      apiToken = args[++i]
    }
  }

  if (cloudUrl && email && apiToken) {
    return { cloudUrl, email, apiToken }
  }

  return null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║           2waySMS Jira Backlog Creator                       ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log()

  const creds = parseArgs()

  if (!creds) {
    console.error('Error: Missing Jira credentials')
    console.log()
    console.log('Usage:')
    console.log('  Set environment variables:')
    console.log('    export JIRA_CLOUD_URL=https://your-domain.atlassian.net')
    console.log('    export JIRA_EMAIL=your-email@example.com')
    console.log('    export JIRA_API_TOKEN=your-api-token')
    console.log()
    console.log('  Or pass as arguments:')
    console.log('    node scripts/create-2waysms-backlog.mjs \\')
    console.log('      --url https://your-domain.atlassian.net \\')
    console.log('      --email your-email@example.com \\')
    console.log('      --token your-api-token')
    process.exit(1)
  }

  console.log(`Jira URL: ${creds.cloudUrl}`)
  console.log(`Email: ${creds.email}`)
  console.log(`Project: ${PROJECT_KEY}`)
  console.log()

  // Test connection
  console.log('Testing Jira connection...')
  const testResult = await jiraRequest(creds, 'GET', '/rest/api/3/myself')

  if (testResult.error) {
    console.error(`Connection failed: ${testResult.error}`)
    process.exit(1)
  }

  console.log(`Connected as: ${testResult.data?.displayName}`)
  console.log()

  // Create epics and tasks
  let totalTasks = 0
  let createdTasks = 0
  let failedTasks = 0

  for (const epic of EPICS) {
    totalTasks += epic.tasks.length
  }

  console.log(`Creating ${EPICS.length} epics with ${totalTasks} total tasks...`)
  console.log()

  for (const epic of EPICS) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Creating Epic: ${epic.summary}`)

    const epicResult = await createEpic(creds, epic.summary, epic.description)

    if (epicResult.error || !epicResult.data) {
      console.error(`  ✗ Failed to create epic: ${epicResult.error}`)
      failedTasks += epic.tasks.length
      continue
    }

    const epicKey = epicResult.data.key
    console.log(`  ✓ Created epic: ${epicKey}`)

    // Create tasks for this epic
    for (const task of epic.tasks) {
      // Add small delay to avoid rate limiting
      await sleep(200)

      const taskResult = await createTask(
        creds,
        task.summary,
        task.description || task.summary,
        epicKey
      )

      if (taskResult.error || !taskResult.data) {
        console.error(`    ✗ ${task.key}: ${taskResult.error}`)
        failedTasks++
      } else {
        console.log(`    ✓ ${taskResult.data.key}: ${task.summary}`)
        createdTasks++
      }
    }

    console.log()
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('                         Summary')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Epics created: ${EPICS.length}`)
  console.log(`  Tasks created: ${createdTasks}/${totalTasks}`)
  if (failedTasks > 0) {
    console.log(`  Tasks failed: ${failedTasks}`)
  }
  console.log()
  console.log('Done!')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
