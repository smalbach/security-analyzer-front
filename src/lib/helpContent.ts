export interface HelpStep {
  step: number;
  title: string;
  body: string;
  tip?: string;
}

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  intro: string;
  steps: HelpStep[];
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    intro: 'Welcome! Here\'s how to get up and running in three easy steps.',
    steps: [
      {
        step: 1,
        title: 'Create a project',
        body: 'A project represents one of your APIs. Give it a name and the base URL where your API lives (for example, https://api.myapp.com). You can always change these later in Settings.',
        tip: 'If you\'re just exploring, you can use a public test API like https://jsonplaceholder.typicode.com',
      },
      {
        step: 2,
        title: 'Add your endpoints',
        body: 'Endpoints are the individual URLs your API exposes, such as GET /users or POST /login. You can add them one by one or import them automatically from an OpenAPI (Swagger) file.',
      },
      {
        step: 3,
        title: 'Run your first security test',
        body: 'Go to the Test Runs tab and click "New Test Run". The scanner will automatically check your API for common security issues and show you a detailed report when it\'s done.',
        tip: 'The whole scan usually takes under two minutes for small APIs.',
      },
    ],
  },
  {
    id: 'endpoints',
    title: 'Endpoints',
    icon: '🔗',
    intro: 'Endpoints are the building blocks of your project. Each one represents a URL path your API responds to.',
    steps: [
      {
        step: 1,
        title: 'What is an endpoint?',
        body: 'An endpoint is a specific URL + HTTP method combination. For example, "GET /users" retrieves a list of users, while "POST /users" creates a new one. Your API can have dozens or hundreds of endpoints.',
      },
      {
        step: 2,
        title: 'Adding endpoints manually',
        body: 'Click "Add Endpoint" and fill in the method (GET, POST, etc.), the path (/users, /products/:id, etc.), and an optional description. You can also mark which roles are allowed to call each endpoint.',
      },
      {
        step: 3,
        title: 'Importing from OpenAPI / Swagger',
        body: 'If you have a Swagger or OpenAPI spec file, you can import all your endpoints at once. Click "Import" and paste your spec URL or upload the JSON/YAML file.',
        tip: 'Most modern API frameworks can auto-generate an OpenAPI spec. Ask your developer for the /openapi.json URL.',
      },
      {
        step: 4,
        title: 'Editing an endpoint',
        body: 'Click any endpoint to open the editor. You can update its method, path, description, expected response, and which roles can access it.',
      },
    ],
  },
  {
    id: 'roles',
    title: 'Roles',
    icon: '👥',
    intro: 'Roles let you define who is allowed to do what in your API. This is critical for finding authorization vulnerabilities.',
    steps: [
      {
        step: 1,
        title: 'What is a role?',
        body: 'A role represents a type of user in your system — for example, "Admin", "Customer", or "Guest". Different roles should have access to different parts of your API.',
      },
      {
        step: 2,
        title: 'Creating a role',
        body: 'Click "Add Role" and give it a name and description. Then assign which endpoints that role is allowed to call.',
        tip: 'Try to match your real application\'s roles as closely as possible for the most accurate security tests.',
      },
      {
        step: 3,
        title: 'Why roles matter for security',
        body: 'Once you have roles defined, the security scanner can test whether a low-privilege user (like a "Guest") can accidentally access admin-only endpoints. This is called a Broken Access Control vulnerability and it\'s one of the most common security issues.',
      },
    ],
  },
  {
    id: 'test-runs',
    title: 'Test Runs',
    icon: '🛡️',
    intro: 'A Test Run automatically scans your API for security vulnerabilities and produces a detailed report.',
    steps: [
      {
        step: 1,
        title: 'Starting a test',
        body: 'Click "New Test Run" and optionally provide test credentials (username/password for your API). The scanner will log in using those credentials to test authenticated endpoints.',
        tip: 'Use a dedicated test account, not your real admin credentials.',
      },
      {
        step: 2,
        title: 'What security rules do',
        body: 'Each rule checks for a specific vulnerability — for example, whether the API leaks sensitive data, allows SQL injection, or has missing authentication. All rules are enabled by default for full coverage.',
      },
      {
        step: 3,
        title: 'Reading the results',
        body: 'After the scan finishes, you\'ll see a score from 0–100 and a list of findings grouped by severity: Critical, High, Medium, Low, and Info. Click any finding to see exactly what was found and how to fix it.',
      },
      {
        step: 4,
        title: 'Severity levels explained',
        body: 'Critical and High findings need immediate attention — they represent vulnerabilities an attacker could exploit right now. Medium findings are important but less urgent. Low and Info are best practices and informational notes.',
        tip: 'Even a single Critical finding means your API has a serious security hole. Fix these first.',
      },
    ],
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: '⚡',
    intro: 'Performance testing simulates many users hitting your API at once to see how it holds up under load.',
    steps: [
      {
        step: 1,
        title: 'Create a performance plan',
        body: 'Click "New Plan" and give it a name. A plan defines which endpoints to test, how many simulated users to use, and for how long.',
      },
      {
        step: 2,
        title: 'Add scenarios',
        body: 'A scenario is a sequence of API calls that a simulated user performs. For example: GET /products → POST /cart → POST /checkout. Add steps by selecting endpoints from your project.',
      },
      {
        step: 3,
        title: 'Choose a load strategy',
        body: 'Constant: keeps a fixed number of users throughout. Ramp-up: gradually increases users over time (good for finding the breaking point). Spike: sends all users at once (simulates a flash sale or viral event).',
        tip: 'Start with Constant and 10–20 virtual users to get a baseline before testing heavier loads.',
      },
      {
        step: 4,
        title: 'Set thresholds',
        body: 'Thresholds automatically mark your test as passed or failed. For example: "fail if 95% of requests take longer than 500ms" or "fail if the error rate exceeds 1%".',
      },
      {
        step: 5,
        title: 'Reading the results',
        body: 'After the test, you\'ll see response time percentiles (P50, P95, P99), requests per second, error rate, and whether each threshold passed or failed. The live chart updates in real time while the test is running.',
        tip: 'P95 = 95% of your users experienced this response time or better. It\'s the most practical number to optimize for.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: '⚙️',
    intro: 'Project settings let you configure how the scanner connects to and authenticates with your API.',
    steps: [
      {
        step: 1,
        title: 'Base URL',
        body: 'This is the root address of your API — for example https://api.myapp.com or http://localhost:3000. All endpoint paths are appended to this URL when running tests.',
        tip: 'Make sure the URL doesn\'t end with a slash.',
      },
      {
        step: 2,
        title: 'Authentication',
        body: 'If your API requires a login before testing, configure this here. You can use JWT Bearer tokens, API keys in headers, or a username/password login flow.',
      },
      {
        step: 3,
        title: 'JWT Bearer',
        body: 'If your API uses JWT tokens, enter the login endpoint URL and the JSON body it expects. The scanner will call this endpoint to get a token and then use it for all subsequent requests.',
      },
      {
        step: 4,
        title: 'API Key',
        body: 'If your API uses a static API key, enter the header name (e.g. X-API-Key) and the key value. The scanner will include this header on every request.',
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reading Reports',
    icon: '📋',
    intro: 'Security reports show you exactly what was found and how to fix it.',
    steps: [
      {
        step: 1,
        title: 'The security score',
        body: 'The score from 0–100 reflects the overall security health of your API. 90+ is excellent. 70–89 is good but needs attention. Below 70 means there are significant issues to address.',
      },
      {
        step: 2,
        title: 'Findings list',
        body: 'Each finding shows: the endpoint affected, the severity level, a plain-language description of the vulnerability, and evidence from the actual HTTP response that triggered it.',
      },
      {
        step: 3,
        title: 'Remediation advice',
        body: 'Every finding includes a "How to fix" section written for developers. Share the report link directly with your engineering team — no translation needed.',
        tip: 'Use the "Export PDF" button to save the report for compliance documentation or sharing with stakeholders.',
      },
    ],
  },
  {
    id: 'flow-testing',
    title: 'Flow Testing',
    icon: '🔀',
    intro: 'Flow Testing lets you build visual E2E API test chains — like n8n or Postman Flows — with drag-and-drop nodes, assertions, scripts, and real-time execution.',
    steps: [
      {
        step: 1,
        title: 'Create a flow',
        body: 'Go to the Flow Testing tab in your project and click "+ New Flow". Give it a descriptive name like "User Registration E2E" or "Checkout Flow". You\'ll be taken to the visual canvas editor.',
        tip: 'Flows are saved per project, so you can have multiple flows testing different scenarios for the same API.',
      },
      {
        step: 2,
        title: 'Add nodes from the palette',
        body: 'The left sidebar shows all available node types: Auth (login and extract tokens), Request (make HTTP calls), Condition (IF/ELSE branching), Loop (iterate over arrays), Merge (combine parallel branches), Delay (wait between calls), and Script (custom JavaScript logic). Drag them onto the canvas or click to add.',
      },
      {
        step: 3,
        title: 'Connect nodes',
        body: 'Drag from a node\'s output handle (right side) to another node\'s input handle (left side) to create a connection. Data flows left-to-right through these connections. Condition nodes have two outputs: TRUE (right, green) and FALSE (bottom, red).',
        tip: 'You can create parallel branches by connecting one node\'s output to multiple downstream nodes. Use a Merge node to rejoin them.',
      },
      {
        step: 4,
        title: 'Configure nodes',
        body: 'Click any node to open its configuration panel on the right. Each node type has different settings. Request nodes let you pick from your existing endpoints, set headers, body, query params, and JSON Schema validation. Auth nodes handle login and token extraction.',
      },
      {
        step: 5,
        title: 'Use template variables',
        body: 'Reference values from upstream nodes using {{nodeId.extractorName}} syntax. For environment variables use {{env.key}}. For example: {{auth.token}} gets the token from an auth node, and {{env.baseUrl}} gets the base URL from your selected environment.',
        tip: 'You can select an environment from the toolbar dropdown before running the flow.',
      },
      {
        step: 6,
        title: 'Add assertions and scripts',
        body: 'Request nodes have tabs for Scripts (pre/post-request JavaScript with flow.test() and flow.expect()), Assertions (visual builder for status, header, JSONPath, and timing checks), and Extractors (capture response values for downstream use). Scripts use a Postman-like API with the "flow" object.',
      },
      {
        step: 7,
        title: 'Run and monitor',
        body: 'Click "Run Flow" in the toolbar (or Ctrl+Enter). The flow executes in topological order with parallel branches running simultaneously. Watch nodes light up in real time — green for success, red for error, yellow for warnings, orange for retrying. The timeline panel at the bottom shows detailed results.',
        tip: 'Press Ctrl+S to save your flow at any time. Unsaved changes are indicated by an "Unsaved" badge.',
      },
    ],
  },
];
