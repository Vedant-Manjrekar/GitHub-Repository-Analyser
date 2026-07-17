# Git Repository Analyser 📊🔍

An advanced, interactive developer dashboard designed to analyze Git repositories. This tool provides deep insights into code complexity, developer contribution patterns, refactoring hotspots, technical debt, and AI-powered codebase analysis.

---

## 🚀 Key Features

*   **📈 Hero Dashboard:** A high-level overview of the repository showing total commits, additions, deletions, primary languages, commit trends, and recent activity.
*   **👥 Contributor Intelligence:** Detailed contributor profiling, commit distribution, core vs. tail developer metrics, and knowledge distribution charts.
*   **⚠️ Risk Map (Hotspots):** Visualization of files matching high code churn (frequent changes) with high cyclomatic complexity, pointing out prime refactoring candidates.
*   **🧹 Tech Debt Visualizer:** Estimates technical debt in hours/cost using cyclomatic complexity (via `lizard`), file sizes, code duplication, and architectural code smells.
*   **📂 VSCode-Style File Explorer:** An interactive directory explorer allowing users to inspect the codebase tree structure decorated with file-level metrics (churn, complexity, LOC).
*   **🤖 AI Codebase Insights:** Generates context-aware, structured AI insights (using OpenAI) on repository architecture, quality, code smells, and actionable recommendations.
*   **🔒 Secure Authentication:** Multi-tenant support with JWT-based role-based access control (Admin/Developer roles).

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React 19, TypeScript)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/) for animations
- **Charts:** [Recharts](https://recharts.org/) for data visualizations
- **Icons:** [Phosphor Icons](https://phosphoricons.com/) & [Lucide React](https://lucide.dev/)

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database:** [PostgreSQL](https://www.postgresql.org/) with [SQLAlchemy](https://www.sqlalchemy.org/) ORM
- **Task Queue:** [Celery](https://docs.celeryq.dev/) with [Redis](https://redis.io/) broker for asynchronous background repository cloning and parsing
- **Analyzers:** [GitPython](https://gitpython.readthedocs.io/) (git parsing) and [Lizard](https://github.com/terryyin/lizard) (cyclomatic complexity)
- **AI Engine:** [OpenAI API](https://openai.com/) (optional)

---

## ⚙️ Architecture Overview

The system uses an asynchronous pipeline to ingest and analyze repositories without blocking API request threads:

```mermaid
graph TD
    User([User]) -->|Submit Repo URL| Frontend[Next.js Frontend]
    Frontend -->|POST /repositories| API[FastAPI Backend]
    API -->|1. Create Pending Entry| DB[(PostgreSQL)]
    API -->|2. Trigger Task| Queue[(Redis Broker)]
    Queue -->|3. Consume Task| Worker[Celery Worker]
    Worker -->|4. Git Clone| Git[Remote Git Repo]
    Worker -->|5. Run Analyzers| Lizard[Complexity & Churn Analysis]
    Worker -->|6. Optional AI Analysis| OpenAI[OpenAI API]
    Worker -->|7. Save Results| DB
    Worker -->|8. Set Status 'completed'| DB
    Frontend -->|Poll / Get Repo Details| API
    API -->|Read Analyzed Data| DB
```

---

## 🏃 Running the Application

The easiest way to get the entire stack up and running is via **Docker Compose**.

### Option 1: Running with Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/git-repo-analytics.git
    cd git-repo-analytics
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the root directory (or set it in your system env):
    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    ```

3.  **Start the services:**
    ```bash
    docker-compose up --build
    ```
    This launches:
    - PostgreSQL (`localhost:5432`)
    - Redis (`localhost:6379`)
    - FastAPI Backend API (`localhost:8000`)
    - Celery Worker (runs task pipeline)
    - Next.js Frontend (`localhost:3000`)

---

### Option 2: Running Locally for Development

#### Backend Setup

1.  **Navigate to backend and create virtual environment:**
    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Set up environment variables (`backend/.env`):**
    ```env
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/git_analytics
    REDIS_URL=redis://localhost:6379/0
    USE_CELERY=true
    OPENAI_API_KEY=your_openai_api_key_here
    ```
    *(Note: If you set `USE_CELERY=false`, the background analysis will run synchronously inside FastAPI using background threads, which doesn't require Redis/Celery).*

4.  **Run the development server:**
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```

5.  **Run Celery worker (if using Celery):**
    ```bash
    celery -A app.workers.tasks.celery_app worker --loglevel=info
    ```

#### Frontend Setup

1.  **Navigate to frontend and install dependencies:**
    ```bash
    cd frontend
    npm install
    ```

2.  **Set up environment variables (`frontend/.env` or `.env.local`):**
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000
    ```

3.  **Run the Next.js development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

To run backend test suites (FastAPI endpoints, authentication, and analysis flow):
```bash
cd backend
pytest
```
