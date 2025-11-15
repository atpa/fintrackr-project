# FinTrackr - A Modern Personal Finance Tracker

This project is a complete refactoring of a personal finance tracking application, rebuilt from the ground up with modern web technologies and best practices.

## Core Technologies

-   **Backend**: Node.js, Express.js
-   **Frontend**: Vanilla JavaScript (ESM), Single Page Application (SPA)
-   **Build Tool**: Vite
-   **Styling**: CSS Variables, Modern CSS
-   **Charting**: Chart.js

## Project Architecture

### Backend

The backend is built with Express.js and follows a layered architecture pattern to separate concerns:

-   `routes/`: Defines the API endpoints.
-   `controllers/`: Handles incoming requests, validates data, and calls the appropriate services.
-   `services/`: Contains the core business logic.
-   `repositories/`: Manages data access and interaction with the `data.json` file.

Authentication is handled using JWTs, which are stored in secure, HttpOnly cookies.

### Frontend

The frontend is a modern Single Page Application built with plain JavaScript modules.

-   `public/index.html`: The single entry point for the application.
-   `frontend/src/app.js`: The main application script that initializes the router.
-   `frontend/src/router/index.js`: A simple hash-based client-side router.
-   `frontend/src/services/`: Modules for interacting with the backend API (`api.js`, `auth.js`).
-   `frontend/src/pages/`: Each file represents a distinct page in the application (e.g., `LoginPage.js`, `DashboardPage.js`).
-   `frontend/src/components/`: Reusable UI components (e.g., `Button.js`, `Card.js`).
-   `frontend/src/layout/`: Contains the main application layout (`MainLayout.js`).
-   `public/css/`: Contains the design system (`design.css`) and component styles (`components.css`).

## Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   npm

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd fintrackr-project
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    This command starts both the backend server (on port 3000) and the Vite frontend server (on port 5173) concurrently.
    ```bash
    npm run dev
    ```

4.  **Open the application:**
    Navigate to `http://localhost:5173` in your browser.

## Testing

This project uses [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest) for backend API testing.

To run the tests, use the following command:

```bash
npm test
```

This will execute all test files located in the `backend/__tests__` directory. The tests cover key API endpoints, including user authentication and data retrieval, ensuring the backend logic works as expected.

## Available Scripts

-   `npm run dev`: Starts both backend and frontend development servers.
-   `npm run start:backend`: Starts only the backend server.
-   `npm run start:frontend`: Starts only the Vite development server.
-   `npm run build`: Builds the frontend for production.

## Deployment

### Frontend

The frontend is a static site that can be deployed to any static hosting service.

1.  Run `npm run build`.
2.  Deploy the contents of the `dist/` directory.

**Popular Services:**
-   [Netlify](https://www.netlify.com/)
-   [Vercel](https://vercel.com/)
-   [GitHub Pages](https://pages.github.com/)

### Backend

The backend is a Node.js application. It can be deployed to any service that supports Node.js.

**Popular Services:**
-   [Heroku](https://www.heroku.com/)
-   [Render](https://render.com/)
-   [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)

**Important:** You will need to configure environment variables on your hosting service, such as `JWT_SECRET` and `PORT`.
