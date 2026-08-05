# HeatVision Development & Workflow Guidelines

Welcome to the HeatVision repository! To maintain clean code and seamless collaboration across all 5 team members, please adhere to the repository standards outlined below.

---

## 1. Directory Structure

HeatVision/
├── client/         # React + Vite frontend
├── server/         # Express.js + Node.js backend API
├── cv_service/     # Python / OpenCV computer vision service
├── data/           # Local sample video clips, blueprints, and POS CSVs
└── CONTRIBUTING.md # Project conventions and workflow guidelines

---

## 2. Git Branching Strategy

All team members must work on feature branches created off main. Direct commits to main are restricted.

### Branch Naming Convention
Use the following format for all branches:
`feature/issue-#<id>-<short-description>`

**Examples:**
* `feature/issue-5-directory-conventions`
* `feature/issue-6-mongodb-setup`
* `feature/issue-7-auth-schema`

---

## 3. Commit Message Standards

Use standard conventional commit messages following the structure:
`<type>(<scope>): <short description> (#<issue-number>)`

### Types:
* `feat`: A new feature
* `fix`: A bug fix
* `docs`: Documentation changes
* `chore`: Maintenance or environment setup updates
* `refactor`: Code restructuring without functional changes

**Examples:**
* `docs(repo): add CONTRIBUTING.md for team guidelines (#5)`
* `feat(server): setup MongoDB connection with Mongoose (#6)`

---

## 4. Pull Request Workflow

1. Keep local main up to date:
   git checkout main
   git pull origin main

2. Create your branch off updated main:
   git checkout -b feature/issue-#<id>-<desc>

3. Commit work and push:
   git push -u origin feature/issue-#<id>-<desc>

4. Open a PR on GitHub targeting main.
5. Link the corresponding issue in the description using `Closes #<id>`.
6. Merge once code passes verification.