# 🚀 WebCraft – AI Powered Website Generator

WebCraft is an AI-powered platform that transforms natural language prompts into complete web applications. Instead of manually designing pages, configuring authentication, and managing project structures, users can simply describe what they want and let WebCraft generate the application automatically.

The platform combines AI-assisted development, real-time preview, project management, and GitHub integration into a single workflow, making web development faster and more accessible for both beginners and developers.

---

## ✨ Features

### 🤖 AI-Powered Website Generation

Generate websites and web applications using simple natural language prompts.

### 💬 Conversational Development

Iteratively modify and improve applications through follow-up prompts.

### ⚡ Real-Time Preview

Visualize generated applications instantly and see changes in real time.

### 📂 Workspace Management

Create, manage, and revisit projects with persistent chat history and application state.

### 🔐 Secure Authentication

Supports secure authentication using JWT and OAuth.

### 🗄️ Database Integration

Generate database schemas and connect applications with backend services.

### 🐙 GitHub Integration

Export projects directly to GitHub repositories with OAuth authentication.

### 📦 Code Export

Download complete project source code and run it locally.

---

## 🏗️ System Architecture

```text
┌───────────────────────┐
│   Presentation Layer  │
│ React / Next.js UI    │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│  Application Layer    │
│ Node.js + Express     │
│ AI Processing Engine  │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│      Data Layer       │
│ Supabase PostgreSQL   │
│ Redis Cache           │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ External Services     │
│ GitHub API • AI APIs  │
│ SMTP Services         │
└───────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Tailwind CSS
* TypeScript

### Backend

* Node.js
* Express.js

### Database & Authentication

* Supabase
* PostgreSQL
* JWT
* OAuth

### Integrations

* GitHub API
* AI APIs
* SMTP Email Services

---

## 🔄 Workflow

1. User signs in.
2. User describes the desired website in natural language.
3. AI interprets the prompt and generates the application structure.
4. AppState is created and stored.
5. A real-time preview is rendered.
6. User modifies the application through conversational prompts.
7. Project can be exported or pushed directly to GitHub.
8. Generated application can be deployed and published.

---

## 📌 Core Functionalities

* User Registration & Authentication
* Workspace Dashboard
* AI-Based Website Generation
* Persistent Chat History
* Versioned Application State
* Dynamic Preview Rendering
* Database Schema Generation
* GitHub Publishing
* ZIP Export Support
* Project Persistence

---

## 🎯 Project Objectives

* Simplify modern web development.
* Reduce technical barriers for beginners.
* Retain full developer control over generated code.
* Automate repetitive development tasks.
* Enable rapid prototyping and deployment.
* Bridge the gap between no-code tools and traditional development.

---

## 🚧 Future Scope

* Multi-framework Support
* Advanced AI-Assisted Editing
* One-Click Deployment
* Team Collaboration Features
* Plugin Ecosystem
* Enhanced Backend Code Generation
* Multi-Database Support

---

## 👨‍💻 Team

* **Vedanshi Neema**
* **Vedant Kolhe**
* **Viplove Padmawar**

---

## 📜 License

This project was developed as a **B.Tech Minor Project** at **Medicaps University, Indore**.

---

> **Build websites by describing them. Let AI handle the boilerplate while you focus on ideas.**
