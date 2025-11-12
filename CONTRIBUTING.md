# 🤝 Contributing to Pixel Buddy

Thank you for your interest in contributing to Pixel Buddy! This guide will help you get started.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inspiring community for all.

### Our Standards
- ✅ Be respectful and inclusive
- ✅ Welcome newcomers and help them learn
- ✅ Focus on what is best for the community
- ✅ Show empathy towards others

### Not Acceptable
- ❌ Harassment, trolling, or derogatory comments
- ❌ Publishing others' private information
- ❌ Unethical or illegal behavior

---

## 🚀 Getting Started

### 1. Fork & Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/pixel-buddy.git
cd pixel-buddy

# Add upstream remote
git remote add upstream https://github.com/cjunker/pixel-buddy.git
```

### 2. Set Up Development Environment
```bash
# Start Docker environment
./dev up

# Verify everything works
curl http://localhost:3000/health
```

### 3. Create a Branch
```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

---

## 🎮 Development Workflow

### Daily Development
```bash
# Start services
./dev up

# View logs (in separate terminal)
./dev logs

# Make changes → auto-reloads!
# Edit server.js, public/index.html, etc.

# Test your changes
curl http://localhost:3000/api/pet/test-user
open http://localhost:3000

# Stop services
./dev down
```

### Before Committing
```bash
# Run tests
./dev test

# Check database changes
./dev db:psql

# Review your changes
git status
git diff
```

---

## 📝 Coding Standards

### JavaScript Style
- **ES6+**: Use modern JavaScript features
- **Async/Await**: Prefer over .then() chains
- **Const/Let**: No var
- **Arrow Functions**: Use for callbacks and short functions
- **Destructuring**: Use where appropriate

**Example:**
```javascript
// Good ✅
const getPet = async (userId) => {
  const { rows } = await pool.query(
    'SELECT * FROM pets WHERE user_id = $1',
    [userId]
  );
  return rows[0];
};

// Bad ❌
var getPet = function(userId) {
  return pool.query('SELECT * FROM pets WHERE user_id = $1', [userId])
    .then(function(result) {
      return result.rows[0];
    });
};
```

### Code Organization
- **Small Functions**: Keep functions under 50 lines
- **Single Responsibility**: One function = one purpose
- **Descriptive Names**: `getUserPet()` not `getData()`
- **Comments**: Explain "why", not "what"

### Database Queries
- **Parameterized Queries**: Always use `$1, $2` placeholders
- **No SQL Injection**: Never concatenate user input
- **Indexes**: Consider performance on large tables
- **Transactions**: Use for multi-step operations

**Example:**
```javascript
// Good ✅
await pool.query(
  'UPDATE pets SET hunger = $1 WHERE id = $2',
  [newHunger, petId]
);

// Bad ❌ - SQL injection risk!
await pool.query(
  `UPDATE pets SET hunger = ${newHunger} WHERE id = ${petId}`
);
```

### Error Handling
```javascript
// Always handle errors
try {
  const result = await riskyOperation();
  res.json(result);
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ error: 'Operation failed' });
}
```

---

## 🎯 Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style (formatting, no logic changes)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding/updating tests
- **chore**: Maintenance tasks

### Examples
```bash
# Feature
git commit -m "feat(multiplayer): add world discovery feed"

# Bug fix
git commit -m "fix(stats): prevent hunger from going negative"

# Documentation
git commit -m "docs(readme): update Docker setup instructions"

# Refactor
git commit -m "refactor(api): extract database logic to services"
```

### Detailed Commit
```
feat(ai): add personality archetypes for pets

Implements 4 personality types (cheerful, grumpy, shy, energetic)
that modify AI responses based on pet stats and history.

- Add personality column to pets table
- Update AI prompt generation with personality context
- Add migration for existing pets (default to 'cheerful')

Closes #15
```

### Commit Best Practices
- ✅ Atomic commits (one logical change per commit)
- ✅ Present tense ("add feature" not "added feature")
- ✅ Descriptive but concise (<72 characters for subject)
- ✅ Reference issue numbers (Closes #123, Relates to #45)

---

## 🔄 Pull Request Process

### 1. Before Creating PR
```bash
# Update your branch with latest main
git checkout main
git pull upstream main
git checkout your-feature-branch
git rebase main

# Run tests
./dev test

# Push your changes
git push origin your-feature-branch
```

### 2. Create Pull Request
- **Title**: Clear, descriptive (same format as commits)
- **Description**: Use the PR template
- **Link Issues**: "Closes #123" or "Relates to #45"
- **Screenshots**: For UI changes
- **Testing**: How you tested the changes

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Manual testing (describe steps)
- [ ] Automated tests added/updated
- [ ] Tested on Docker environment
- [ ] Tested database migrations

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [ ] Database migrations are included (if applicable)

## Screenshots (if applicable)
```

### 3. Code Review
- Address all review comments
- Push additional commits to the same branch
- Request re-review when ready
- Be patient and respectful

### 4. After Merge
```bash
# Update your main branch
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feature/your-feature
git push origin --delete feature/your-feature
```

---

## 🐛 Issue Guidelines

### Before Creating an Issue
1. **Search existing issues** - avoid duplicates
2. **Check discussions** - might be answered there
3. **Try latest version** - bug might be fixed

### Bug Reports
Use the Bug Report template and include:
- **Summary**: Brief description
- **Steps to Reproduce**: Numbered list
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, Docker version, etc.
- **Logs**: Relevant error messages
- **Screenshots**: If applicable

### Feature Requests
Use the Feature Request template and include:
- **Problem**: What problem does this solve?
- **Solution**: Proposed implementation
- **Alternatives**: Other approaches considered
- **Complexity**: Estimated difficulty (⚠️/⚠️⚠️/⚠️⚠️⚠️)

---

## 🧪 Testing

### Manual Testing
```bash
# Start environment
./dev up

# Test checklist:
- [ ] Pet creation works
- [ ] All 4 actions update stats correctly
- [ ] Stats decay over time
- [ ] Multiplayer world codes generate
- [ ] Visiting worlds works
- [ ] Database persists data
- [ ] Hot-reload triggers on file changes

# Database testing
./dev db:psql
SELECT * FROM pets;
SELECT * FROM memories;
```

### Automated Tests (Future)
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- api.test.js
```

### Testing Checklist for PRs
- [ ] Existing functionality still works
- [ ] New feature works as expected
- [ ] Edge cases handled
- [ ] Error messages are clear
- [ ] Database migrations work (up and down)
- [ ] No console errors in browser
- [ ] Mobile responsive (if UI changes)

---

## 📚 Documentation

### When to Update Docs
- Adding new features
- Changing APIs
- Updating dependencies
- Modifying configuration
- Adding environment variables

### Documentation Files
- **README.md**: Project overview, quick start
- **QUICKSTART.md**: 30-second getting started
- **DEVELOPMENT.md**: Detailed dev guide
- **CONTRIBUTING.md**: This file
- **Code Comments**: Explain complex logic

### Documentation Style
- Clear and concise
- Code examples for technical content
- Screenshots for UI/visual changes
- Keep it up-to-date

---

## 🎨 Design Decisions

### When to Use What

**Database Triggers vs Application Logic**
- Use triggers for: Timestamps, cascading updates
- Use app logic for: Business rules, complex validation

**Frontend State Management**
- Currently: Vanilla JS with direct DOM manipulation
- Future: Consider React if complexity increases

**AI Integration**
- Ollama for local development
- Fallback responses for production (unless external API added)

### Architecture Principles
1. **Keep it simple**: Avoid over-engineering
2. **Database first**: PostgreSQL is the source of truth
3. **API design**: RESTful, predictable endpoints
4. **Security**: Rate limiting, input validation, parameterized queries
5. **Documentation**: Code should be self-explanatory

---

## 🆘 Getting Help

### Resources
- **README**: Start here
- **QUICKSTART**: Fast setup
- **DEVELOPMENT**: Deep dive
- **Issues**: Search for similar problems
- **Discussions**: Ask questions

### Contact
- **GitHub Issues**: Technical problems
- **GitHub Discussions**: Questions, ideas
- **Pull Requests**: Code review requests

---

## 🎯 Good First Issues

New contributors should look for issues labeled:
- `good first issue` - Easy to implement
- `help wanted` - Community contributions welcome
- `documentation` - Improve docs
- `bug` - Fix existing issues

---

## 🚀 Release Process (Maintainers Only)

### Versioning
We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Checklist
1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create Git tag: `git tag v1.2.0`
4. Push tags: `git push --tags`
5. Create GitHub release with notes
6. Deploy to Railway (if applicable)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Thank You!

Every contribution, no matter how small, makes Pixel Buddy better. We appreciate:
- 🐛 Bug reports
- ✨ Feature ideas
- 📝 Documentation improvements
- 💻 Code contributions
- 🎨 Design suggestions
- 💬 Community support

**Happy Contributing!** 🐾
