# QUAiL - A Qualitative Data Analysis Application

[![Website](https://img.shields.io/badge/Website-quail.edarts.online-blue)](https://quail.edarts.online)

## Iterative Model Overview

- No need to define a complete SRS (Software Requirements Specification) upfront  
- Implementation of a **subset of requirements** during each iteration  
- Iterative enhancement continues until all requirements are met

<img width="3444" height="596" alt="SDLC (1)" src="https://github.com/user-attachments/assets/e190f929-db18-4247-89f3-28bb4dad53d5" />

---

## Architecture Diagram

<img width="2048" height="1380" alt="Architecture (2)" src="https://github.com/user-attachments/assets/53d445d3-44fe-4abe-ab6d-cb60a46722df" />

---

## **Iteration Plan**

| Iteration No. | Iteration Plan | Limitations of the Iteration |
|:-------------:|:---------------|:-----------------------------|
| #1 | • GitHub repository for version control <br> • Setting up MongoDB, Express.js, React, Node.js (MERN) infrastructure <br> • Login, Signup and Reset password functionality <br> • Docker Containerization | • Lacks Business Logic <br> • Very primitive development |
| #2 | • Home Page (Create, Open, Update, Delete Projects) <br> • Data Importation (Limit to textual data) <br> • Document Viewer (view-only) | • Core Coding functionality missing <br> • No document manipulation possible <br> • Majorly a view-only interface |
| #3 | • Code System (Manual Coding) <br> • Left Panel (Imported Files, Code Definitions, Code Segments) <br> • Document Viewer Toolbar (Coder, Highlighter, Eraser, Search bar) | • No memos, Export Functionalities or visualizations <br> • Lacks Audio file support |
| #4 | • Memos (Create, Edit, Delete) <br> • Export Code Segments/Memos <br> • UI Updates | • No visualizations <br> • Lacks Audio file support |
| #5 | • Major Refactoring of code for Maintainability and Separation of Concerns (SOC) <br> • Coded Segments Overview Table <br> • Visualizations <br> • Theme Toggle <br> • Automated Frontend and Backend Testing | • Lacks Audio file support <br> • No statistical tests for quantitative validation <br> • No advanced codebook management <br> • No Landing page |
| #6 | • Audio Support <br> • Sentence-wise/Turn-wise Splitting <br> • Integrated statistical tests <br> • Dynamic codebook <br> • Attractive Landing page | • Lacks an interactive Code Matrix <br> • No feature to pin/rename/export document viewer files <br> • Lacks find and replace functionality in the edit mode |
| #7 | • Export Code Matrix <br> • Pin, rename, and export files from document viewer <br> • Find and Replace functionality in edit mode <br> | • Poor audio file edit mode (Integrity Issues) <br> • No feature to make Copy of Project <br> • Lacks an Admin Dashboard <br> |
| #8 | • Enhanced Edit Mode <br> • Copy of project feature <br> • SOC, Code reorganization <br> | • Prop Drilling in ProjectView.jsx <br> • Poor SOC of project hooks due to singular Hooks.jsx <br> |

<br> 

## **Deployed Versions**

| Version No. | Deployment Date | <div align="center">Comments</div> | Status |
| :---: | :---: | :--- | :---: |
| **QUAiL Beta v1.0.0** | 17-Sep-25 | - Initial Release | $\color{red}\text{Inactive}$  |
| **QUAiL Beta v1.0.1** | *Intermediate Build* | - Added **Show/Hide password icon** for improved UX <br> - Implemented **Email Verification** for Sign Up security <br> - Home Page updated with **Contact Us info** and **Site Stats** | N/A |
| **QUAiL Beta v1.1.0** | 07-Dec-25 | - Added **Download Project (as .quail file)** feature <br> - Updated Import Modal to support **.pdf** documents <br> - Fixed the **"Shallow Copy"/"Broken Reference"** issue for project duplication | $\color{red}\text{Inactive}$ |
| **[QUAiL Beta v1.1.1](https://quail.edarts.online/)** | 07-Dec-25 | - Added Manual SMTP Configuration | $\color{green}\text{Active}$ |

---

<br> 

# Screenshots

## Landing page

https://github.com/user-attachments/assets/9f23100a-66cd-41a0-ac45-2774db130d15

<img width="960" height="549" alt="Screenshot 2025-12-05 154002" src="https://github.com/user-attachments/assets/4e8e1195-25cc-4cae-8b22-75234b07a94d" />

<img width="960" height="600" alt="Screenshot 2025-12-05 154009" src="https://github.com/user-attachments/assets/baeff84b-9323-4e53-9536-7cb09a681763" />


## Projects
<img width="1920" height="1200" alt="Projects" src="https://github.com/user-attachments/assets/289dea64-1386-4ed0-81f0-aed0ed47fe01" />

## Workspace
<img width="1920" height="1200" alt="Workspace" src="https://github.com/user-attachments/assets/b2663e29-5e05-4a0a-87d3-96e0e7dd38b1" />

## Merge Codes
<img width="1920" height="1200" alt="Merge Codes" src="https://github.com/user-attachments/assets/60e4d1d3-da76-46a8-8f34-a474b0ba7c5d" />

## Split Codes
<img width="1920" height="1200" alt="Split Codes" src="https://github.com/user-attachments/assets/abe58b3a-24ba-403e-a4fd-48d9bbbb22ef" />

## Visualizations
<img width="1920" height="1200" alt="Visualizations" src="https://github.com/user-attachments/assets/ae40f7b7-5cc3-4444-b3d8-37263fb39521" />

## Statistical Analysis
<img width="1920" height="1200" alt="Statistical Analysis" src="https://github.com/user-attachments/assets/87271f70-384f-497a-abc0-a6b9b483ec49" />

## Statistical Analysis Test Results
<img width="1920" height="1200" alt="Statistical Analysis Test Results 1" src="https://github.com/user-attachments/assets/26fd37fc-c9e0-42bd-902b-2a1f0616e2ce" />
<img width="1920" height="1200" alt="Statistical Analysis Test Results 2" src="https://github.com/user-attachments/assets/160dc528-1c5e-418d-8b20-d984440666f6" />
<img width="1920" height="1200" alt="Statistical Analysis Test Results 3" src="https://github.com/user-attachments/assets/fc956c1b-fba7-4f13-969a-3e3488be49d0" />
<img width="1920" height="1200" alt="Statistical Analysis Test Results 4" src="https://github.com/user-attachments/assets/f84c7495-4cd8-45a9-b5e2-ffe496080194" />






