Navigator App
A modern full-stack React application with integrated backend, built with TypeScript and Vite. This project provides a minimal frontend setup with Hot Module Replacement (HMR), robust ESLint rules, and a lightweight backend server for API handling, enabling seamless full-stack development.
Features

⚡️ Vite-Powered Frontend: Ultra-fast development with Hot Module Replacement (HMR) for instant feedback.
🛠️ TypeScript Everywhere: Strongly-typed codebase for both frontend and backend, improving developer experience and reducing errors.
✅ ESLint with Type-Aware Rules: Configured for type-checked linting across the entire project.
🔄 Integrated Backend: Node.js/Express server with API routes, ready for database integration and server-side logic.
🌟 React-Specific Linting: Optional support for eslint-plugin-react-x and eslint-plugin-react-dom to enforce React best practices.
📦 Minimal Full-Stack Setup: Ready-to-go template for quick scaffolding of production-ready full-stack applications.

Getting Started
Prerequisites

Node.js (>= 18.x)
npm, Yarn, pnpm, or Bun (package manager of your choice)

Installation

Clone the repository:
git clone https://github.com/mu534/navigator-app.git
cd navigator-app


Install dependencies:
npm install
# or
yarn install
# or
pnpm install



Running the Application
Development Mode (Full-Stack)

Start the backend server:
npm run server
# or
yarn server
# or
pnpm server

The backend typically runs on http://localhost:3000 (or as configured).

In a new terminal, start the frontend development server:
npm run dev
# or
yarn dev
# or
pnpm dev


Open your browser at http://localhost:5173 to see the frontend in action. The frontend will proxy API requests to the backend.


Production Build

Build the frontend:
npm run build
# or
yarn build
# or
pnpm build


Start the production backend (serves built frontend):
npm run start
# or
yarn start
# or
pnpm start


Configuration
ESLint Setup
The project includes a unified ESLint configuration with type-aware linting for both TypeScript frontend and backend code. Update eslint.config.js for enhanced rules:
import tseslint from 'typescript-eslint'
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Additional config for backend files if needed
  {
    files: ['server/**/*.{ts}'],
    extends: [tseslint.configs.recommendedTypeChecked],
  }
)

To install React-specific linting plugins:
npm install eslint-plugin-react-x eslint-plugin-react-dom --save-dev

Backend Configuration
The backend uses Node.js with TypeScript. Key configurations:

API Routes: Defined in server/routes/ and mounted in server/index.ts.
Environment Variables: Use .env file for database URLs, ports, etc. (load with dotenv).
Database Integration: Ready for MongoDB/PostgreSQL/etc. – configure in server/models/.

Example backend startup in server/index.ts:
import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

Vite Configuration
Customize vite.config.ts for frontend proxying to backend:
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})

Available Scripts



Script
Description



npm run dev
Starts the frontend development server with HMR.


npm run server
Starts the backend development server.


npm run start
Starts the production backend (with built frontend).


npm run build
Builds the frontend for production (output in dist/).


npm run lint
Runs ESLint to check for code issues across frontend and backend.


npm run preview
Previews the production build locally.


Contributing
Contributions are welcome! Please follow these steps:

Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit your changes (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a Pull Request.

License
This project is licensed under the MIT License. See the LICENSE file for details.
Acknowledgments

Frontend: Built with Vite for lightning-fast development.
Powered by React and TypeScript.
Backend: Express.js for robust API handling.
Linting with ESLint and typescript-eslint.


Happy full-stack coding! 🚀
