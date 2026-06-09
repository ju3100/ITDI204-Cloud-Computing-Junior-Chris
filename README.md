Vanuatu Smart Transport
Cloud Computing Project | ITDI204

A full-stack, cloud-native transportation management platform designed to streamline transit scheduling, booking, and real-time coordination in Vanuatu.

Project Details
Name: Junior Chris Kavick

Deployment Platform: Render

Repository: https://github.com/ju3100/ITDI204-Cloud-Computing-Junior-Chris.git

Architecture Overview
The application utilizes a decoupled cloud architecture for high availability and scalability.

Frontend: React.js (Static Site deployed on Render)

Backend: Node.js/Express.js (Web Service with persistent connection pooling)

Database: Managed PostgreSQL (with SSL enabled)

CI/CD Pipeline: Automated workflows via GitHub Actions


Source:
Cloud Deployment & CI/CD
This project features an automated deployment pipeline to minimize manual intervention.

Automated Workflow
Branches: main (Production) and Staging (Testing/Integration).

CI/CD Pipeline: Every push to main or Staging triggers a GitHub Action that:

Installs dependencies (npm install).

Runs compilation and integrity tests.

Triggers Render webhooks for automated zero-downtime hot-reloads.

Environment & Security
Environment Variables: Managed via Render dashboards for dynamic configuration (DATABASE_URL, PORT, NODE_ENV).

Secrets: Sensitive credentials (e.g., RENDER_API_KEY, JWT_SECRET) are stored in GitHub Repository Secrets to ensure no sensitive data is exposed in the codebase.

API & Database
The backend implements a RESTful API to manage transit operations.

Key API Routes
Method	Endpoint	Purpose
POST	/signup	User registration (Bcrypt hashing, role-based validation).
POST	/login	Authentication and JWT issuance.
GET	/trips	Fetch all available transit routes.
POST	/bookings	Seat reservation with capacity verification.
GET	/admin/data	Secure aggregate system diagnostic collection.
Data Model
Installation & Setup
Clone the repo: git clone <url>

Setup Backend:

Bash
cd backend
npm install
# Create .env with DATABASE_URL, PORT, and JWT_SECRET
node server.js
Setup Frontend:

Bash
cd frontend
npm install
npm start
Problem Solving & Future Roadmap
Problem Solving: Challenges regarding PostgreSQL network connectivity and Render cross-origin blocking were resolved by implementing sslmode=require and refining CORS policy middleware.

Future Improvements:

Integration of real-time GPS map visualizations (Leaflet.js).

Comprehensive E2E testing using Playwright.

Mobile-first responsive UX refinement.

Conclusion
Vanuatu Smart Transport successfully demonstrates modern cloud practices—specifically the transition from local development to production through automated CI/CD pipelines, secure secrets management, and robust database abstraction.
