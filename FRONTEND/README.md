# 🎓 Full-Stack College Placement Management System

![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Tailwind](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC)
![Status](https://img.shields.io/badge/Status-Deployed-success)

A modern, secure, and fully responsive MERN stack application designed to streamline the college campus placement process. It bridges the gap between **Students**, **Recruiting Companies**, and **College Admins** through a seamless, glassmorphism-inspired UI and a robust, role-based backend architecture.

---

## ✨ Key Features

This application features dynamic role-based access control. The UI and available actions completely transform based on who is logged in.

### 👨‍🎓 For Students
* **Live Job Board:** Browse and search for available opportunities using a dynamic real-time search bar.
* **Cloud Resume Uploads:** Securely upload PDF resumes directly to Cloudinary when applying for roles.
* **Application Tracking:** Monitor the real-time status of applications (Applied, Reviewed, Shortlisted, Rejected, Hired).
* **Virtual Interview Portal:** Instantly view scheduled interview dates, times, and direct meeting links directly from the dashboard.

### 🏢 For Companies
* **Job Management:** Post new job listings with detailed requirements, locations, and salary packages.
* **Applicant Review System:** View all students who applied specifically to their postings and open their cloud-hosted resumes.
* **Status Pipeline:** Update candidate statuses with a single click.
* **Interview Scheduler:** Trigger a custom modal to schedule interviews and provide Google Meet/Zoom links to shortlisted candidates.

### 🛡️ For Admins (College Staff)
* **Secret Registration:** Admins can only register using a secure, hidden `.env` passcode to prevent unauthorized access.
* **Live Analytics Dashboard:** Interactive data visualization using **Recharts**.
    * 📊 **Bar Charts:** Tracking the volume of active jobs posted per company.
    * 🥧 **Pie Charts:** Visualizing the overall breakdown of application statuses across the entire college.
    * 📈 **Top-Level Metrics:** Quick-glance counters for Total Jobs, Total Applications, and Total Hired Students.

### 🔐 Global Security & UX Features
* **Real Email Password Reset:** Complete forgot-password pipeline utilizing **Brevo API** to send secure, time-sensitive JSON Web Token (JWT) recovery links via email.
* **Authentication:** Encrypted passwords (Bcrypt) and secure session handling (JWT).
* **Beautiful UI/UX:** Dark-mode glassmorphism design, conditional rendering, and animated toast notifications using **React-Hot-Toast**.

---
```bash

## 🔑 Demo Credentials

To instantly test the different role-based dashboards without registering, please use the following demo accounts:

**🛡️ Admin Role (Full Access & Analytics)**
* **Email:** admin@demo.com
* **Password:** admin123

**🏢 Company Role (Post Jobs & Schedule Interviews)**
* **Email:** company@demo.com
* **Password:** company123

**👨‍🎓 Student Role (Apply & Track Status)**
* **Email:** student@demo.com
* **Password:** student123
---
```bash

## 🛠️ Tech Stack

**Frontend:**
* React.js (Vite)
* Tailwind CSS (Styling & Glassmorphism UI)
* React Router DOM (Routing & Protection)
* Recharts (Data Visualization)
* React-Hot-Toast (Animated Notifications)
* Axios (API Communication)

**Backend:**
* Node.js & Express.js
* MongoDB & Mongoose (Database & ODM)
* JSON Web Tokens (JWT Authentication)
* Bcryptjs (Password Hashing)
* Cloudinary & Multer (PDF File Storage & Handling)
* Brevo API / Fetch (Email Delivery Pipeline)

---

## 🚀 Installation & Local Setup

Want to run this project locally? Follow these steps:

### 1. Clone the repository
```bash
git clone [https://github.com/das690/College-Placement-Management-System.git]
```

2. Backend Setup
```bash
cd backend
npm install
```

Create a .env file in the backend folder and add the following variables:
```

Code snippet
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
FRONTEND_URL=http://localhost:5173

# Cloudinary Setup
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Brevo Email Pipeline
EMAIL_USER=your_verified_brevo_email@example.com
BREVO_API_KEY=your_brevo_api_key

# Security
ADMIN_SECRET=your_custom_admin_passcode
```

1. Frontend Setup
Open a new terminal window:

```Bash
cd frontend
npm installl
```
Start the Vite development server:
```bash
npm run dev
```

💡 How to Use
Creating an Admin Account
To access the Analytics Dashboard, you must register as an Admin.

Go to the Register page.

Select the Admin radio button.

A hidden input field will appear. Enter the exact passcode you defined in your ADMIN_SECRET environment variable to successfully create the account.

Testing the Password Reset
Click "Forgot Password" on the login screen.

Enter a valid email address.

Check your inbox (or spam folder) for the secure recovery link.

Click the link to be redirected to the secure New Password form.

🌐 Live Demo
Frontend: [placementportalmanagesys.netlify.app]

Backend: [https://college-placement-management-system-30p4.onrender.com] (Note: Free tier Render instances spin down after inactivity, so the first API request may take up to 50 seconds to wake the server).

Admin Secret Passcode : GUVI-ADMIN (For registering as admin only)
