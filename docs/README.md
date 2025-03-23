# A Defection Documentation

This directory contains comprehensive documentation for the A Defection platform.

## Directory Structure

```
docs/
├── architecture/            # System architecture documentation
│   ├── index.md             # Architecture overview
│   ├── system_architecture.md # High-level system architecture
│   ├── data_models.md       # Database schema and relationships
│   ├── api_flow.md          # API architecture and flows
│   ├── ai_integration.md    # AI services and integration
│   └── blockchain_integration.md # Blockchain features
│
├── api/                     # API documentation
│   ├── index.md             # API overview
│   ├── auth.md              # Authentication endpoints
│   ├── users.md             # User endpoints
│   ├── characters.md        # Character endpoints
│   ├── narratives.md        # Narrative endpoints
│   ├── decisions.md         # Decision endpoints
│   ├── predictions.md       # Prediction endpoints
│   └── activities.md        # Activity endpoints
│
├── development/             # Development guides
│   ├── setup.md             # Development environment setup
│   ├── coding_standards.md  # Coding standards and best practices
│   ├── testing.md           # Testing guidelines
│   └── debugging.md         # Debugging tips
│
├── deployment/              # Deployment documentation
│   ├── index.md             # Deployment overview
│   ├── local.md             # Local deployment
│   ├── staging.md           # Staging deployment
│   └── production.md        # Production deployment
│
└── README.md                # This file
```

## Documentation Formats

- All documentation is written in Markdown format
- Diagrams are included as ASCII art or embedded images
- Code examples use syntax highlighting where appropriate

## Contributing to Documentation

Please follow these guidelines when contributing to the documentation:

1. Use clear, concise language
2. Include examples where applicable
3. Keep technical documentation up-to-date with code changes
4. Use proper Markdown formatting
5. Link related documents for easier navigation

## Building Documentation

The documentation can be built into a static site using [Docusaurus](https://docusaurus.io/) or [MkDocs](https://www.mkdocs.org/). To build:

```bash
# If using Docusaurus
cd docs-site
npm install
npm run build

# If using MkDocs
mkdocs build
```

## Viewing Documentation

The documentation can be viewed locally by running:

```bash
# If using Docusaurus
cd docs-site
npm start

# If using MkDocs
mkdocs serve
```

Then open your browser to `http://localhost:3000` or `http://localhost:8000` respectively. 