# Contributing to A Defection

Thank you for your interest in contributing to the A Defection platform! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@adefection.com](mailto:conduct@adefection.com).

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm (v7 or higher) or Yarn (v1.22 or higher)
- Git

### Setup for Development

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/a-defection.git
   cd a-defection
   ```
3. Add the original repository as a remote:
   ```bash
   git remote add upstream https://github.com/original/a-defection.git
   ```
4. Install dependencies:
   ```bash
   npm run install-all
   ```
5. Set up your environment:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your local configuration.
6. Run the development server:
   ```bash
   npm run dev-full
   ```

For more detailed setup instructions, refer to the [Development Setup Guide](docs/development/setup.md).

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   or
   ```bash
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes, following the [Coding Standards](#coding-standards)

3. Write tests for your changes (if applicable)

4. Run the tests to ensure everything passes:
   ```bash
   npm test
   ```

5. Update documentation to reflect any changes

6. Commit your changes:
   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   ```

7. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

8. Create a pull request from your fork to the main repository

## Pull Request Process

1. Ensure your PR includes a clear description of the changes and the purpose

2. Link any relevant issues in the PR description (e.g., "Fixes #123")

3. Make sure all tests pass and code linting is successful

4. Update the README.md or relevant documentation with details of changes if applicable

5. The PR requires approval from at least one maintainer before it can be merged

6. Once approved, a maintainer will merge your PR, or you may be asked to rebase if there are conflicts

## Coding Standards

We follow strict coding standards to maintain code quality and consistency:

### JavaScript/TypeScript

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use ES6+ features when appropriate
- Document public functions and components using JSDoc
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Use async/await instead of Promise chains when possible

### React

- Use functional components with hooks instead of class components
- Follow the React component file structure as established in the project
- Use appropriate prop validation
- Follow presentational and container component pattern
- Use context API or Redux for state management according to the existing pattern

### API Endpoints

- Follow RESTful principles
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return consistent JSON responses
- Include proper error handling and appropriate status codes

### Git Commit Messages

- Use clear, descriptive commit messages
- Format: `[type]: [description]` (e.g., "fix: resolve authentication bug")
- Types: feat, fix, docs, style, refactor, test, chore

## Testing Guidelines

We strive for high test coverage to ensure reliability:

- Write unit tests for utility functions and services
- Write integration tests for API endpoints
- Write component tests for React components
- End-to-end tests for critical user flows

Use the appropriate testing tools:
- Jest for unit and integration testing
- React Testing Library for component testing
- Supertest for API testing

## Documentation

Good documentation is essential for the project:

- Document all new features, components, and API endpoints
- Update existing documentation when making changes
- Follow the established documentation format
- Include examples and use cases where appropriate
- Documentation should be clear and understandable to both technical and non-technical users

## Issue Reporting

If you find a bug or have a suggestion for improvement:

1. Check if the issue already exists in the [GitHub Issues](https://github.com/yourusername/a-defection/issues)
2. If not, create a new issue with:
   - A clear title and description
   - Steps to reproduce (for bugs)
   - Expected behavior
   - Actual behavior
   - Screenshots or logs if applicable
   - Environment information (browser, OS, etc.)

## Feature Requests

Feature requests are welcome! For feature requests:

1. Clearly describe the feature and the problem it solves
2. Explain how it aligns with the project's goals
3. Provide examples or mockups if possible
4. Discuss implementation details if you have ideas

## Community

Join our community to discuss the project, get help, or share ideas:

- [Discord Server](https://discord.gg/adefection)
- [Community Forum](https://community.adefection.com)
- [Twitter](https://twitter.com/adefection)

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE) file). 