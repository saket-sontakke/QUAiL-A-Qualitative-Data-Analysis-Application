# ETQDA - A Qualitative Data Analysis Application

## Iterative Model Overview

- No need to define a complete SRS (Software Requirements Specification) upfront  
- Implementation of a **subset of requirements** during each iteration  
- Iterative enhancement continues until all requirements are met

<img width="3444" height="596" alt="SDLC (1)" src="https://github.com/user-attachments/assets/e190f929-db18-4247-89f3-28bb4dad53d5" />

---

### Iteration Plan  

| Iteration No. | Iteration Plan                                                                                                                                           | Limitations of the Iteration                                           |
|:-------------:|---------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| #1            | • GitHub repository for version control <br> • Setting up MongoDB, Express.js, React, Node.js (MERN) infrastructure <br> • Login, Signup and Reset password functionality <br> • Docker Containerization | • Lacks Business Logic <br> • Very primitive development              |
| #2            | • Home Page (Create, Open, Update, Delete Projects) <br> • Data Importation (Limit to textual data) <br> • Document Viewer (view-only)                   | • Core Coding functionality missing <br> • No document manipulation possible <br> • Majorly a view-only interface |
| #3            | • Code System (Manual Coding) <br> • Left Panel (Imported Files, Code Definitions, Code Segments) <br> • Document Viewer Toolbar (Coder, Highlighter, Eraser, Search bar) | • No memos, Export Functionalities or visualizations <br> • Lacks AI enabled features |
| #4            | • Memos (Create, Edit, Delete) <br> • Export Code Segments/Memos <br> • UI Updates                                 | • No visualizations <br> • Lacks AI enabled features                   |
| #5            | • Major Refactoring of code for Maintainability and Separation of Concerns (SOC) <br> • Coded Segments Overview Table <br> • Visualizations <br> • Theme Toggle <br> • Automated Frontend and Backend Testing | • Lacks Audio input support <br> • No AI Enabled Features <br> • Static Document Viewer |
| #6            | • Audio Support <br> • Sentence-wise/Turn-wise Splitting <br> • Editable Document Viewer                           | *To be updated*                                                        |
