# AI-Powered Support Ticket Assistant

This is a full-stack application that provides an intelligent, automated solution for managing technical support tickets. It uses an AI agent to analyze, prioritize, and assign new tickets to the most suitable support agent based on required skills.

---

## ✨ Features

- **User Authentication:** Secure JWT-based signup and login for users and agents/admins.
- **Role-Based Access Control:**
  - **Users:** Can create, view, and track their own support tickets.
  - **Admins/Agents:** Can view and manage all tickets in the system via a central dashboard.
- **AI-Powered Ticket Analysis:**
  - When a ticket is created, an automated background workflow is triggered using **Inngest**.
  - A **Gemini AI agent** analyzes the ticket to generate a summary, priority level, helpful technical notes, and a list of required skills.
- **Intelligent Agent Assignment:** The system automatically assigns tickets to an agent whose skills match the ticket's needs.
- **Email Notifications:** Agents receive an email notification (tested via Mailtrap) when a new ticket is assigned to them.
- **Ticket Management:** View ticket details, including AI analysis, and update ticket status.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, react-router-dom, react-toastify
- **Backend:** Node.js, Express.js, Mongoose
- **Database:** MongoDB
- **Authentication:** JWT, bcrypt
- **Background Workflows:** Inngest
- **AI:** Google Gemini (`@inngest/agent-kit`)
- **Email:** Nodemailer, Mailtrap (for development)

---

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- MongoDB Atlas account (or a local MongoDB instance)
- Mailtrap account (for email testing)
- Google AI Studio API Key (for Gemini)

### Backend Setup

1.  **Clone the repository and navigate to the `backend` directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the `backend` root and add the following variables:
    ```env
    # Server
    PORT=3000

    # MongoDB
    MONGO_URI=your_mongodb_connection_string

    # JWT
    JWT_SECRET=your_jwt_secret_key

    # Inngest (optional, for connecting to Inngest Cloud)
    INNGEST_EVENT_KEY=
    INNGEST_SIGNING_KEY=

    # Mailtrap
    MAIL_HOST=sandbox.smtp.mailtrap.io
    MAIL_PORT=2525
    MAIL_USERNAME=your_mailtrap_username
    MAIL_PASSWORD=your_mailtrap_password

    # Google Gemini
    GEMINI_API_KEY=your_gemini_api_key
    ```

### Frontend Setup

1.  **Navigate to the `frontend` directory:**
    ```bash
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the `frontend` root and add your backend server URL:
    ```env
    VITE_SERVER_URL=http://localhost:3000
    ```

---

## 🏃‍♂️ Running the Application

You need to run three processes simultaneously in separate terminals.

1.  **Start the Backend Server:**
    *(From the `backend` directory)*
    ```bash
    npm run dev
    ```

2.  **Start the Frontend Server:**
    *(From the `frontend` directory)*
    ```bash
    npm run dev
    ```

3.  **Start the Inngest Dev Server:**
    *(From the `backend` directory)*
    This command explicitly connects the dev server to your backend API.
    ```bash
    npx inngest-cli dev -u http://localhost:3000/api/inngest
    ```

-   Your application will be running at `http://localhost:5173` (or your
