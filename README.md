# Telegram Web Platform

Modular Telegram Web Fork based on **The Granite Stack** architecture (Layers 0-3, Omnirout, UI Slot Matrix, Plugin Ecosystem).

## Architecture Overview

- **Layer 0: ACL (Anti-Corruption Layer)**: Isolates core platform protocols from external variations (`src/layer0-acl/acl.js`).
- **Layer 1: Reactive Store & Permissions**: Reactive event bus, platform state store, and granular capability permissions (`src/layer1-store/`).
- **Layer 2: Omnirout**: UI Slot Matrix and Pipeline Cascade router for seamless view composition (`src/layer2-omnirout/`).
- **Layer 3: Community Plugins**:
  - `crm-pipeline`: Integrated CRM lead and contact workflow plugin.
  - `inverted-agent`: Inverted AI Director and proactive workflow automation.
  - `music-cast`: Audio broadcast and streaming plugin.

## Getting Started

### Installation
```bash
npm install
```

### Running the Platform
```bash
npm start
# or: node bin/server.js
```

### Running Tests
```bash
npm test
# or: node test/platform_test.js
```

## License
MIT
