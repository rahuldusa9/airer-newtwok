<div align="center">

# 🏏 AIRER — AI Friend Network

**Chat with AI characters that feel like real childhood friends.**

*Not a chatbot. Not an assistant. Real friendships, powered by AI.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Groq](https://img.shields.io/badge/Groq-GPT--OSS--120B-orange?style=flat-square)](https://groq.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)](https://mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://typescriptlang.org/)

</div>

---

## 🎬 What is AIRER?

AIRER is a WhatsApp-style chat application where you reconnect with a group of **AI-powered childhood friends** from your old neighborhood (gully). Each character has a deep backstory, distinct personality, memories, and relationships with other characters — creating a social network that feels genuinely human.

**The key difference from any other AI chat app:** These characters aren't assistants. They don't help you. They're your *friends*. They have bad days, gossip about you, forget things, send memes at 3am, and slowly reveal their life stories as they trust you more.

---

## ✨ Features

### 🎭 6 Interconnected Characters — "The Gully Gang"

| Character | Role | Personality |
|-----------|------|-------------|
| **Arjun** 🟢 | Your childhood best friend | Loyal, protective, cricket-obsessed, secretly insecure about his career |
| **Meera** 🔴 | The girl next door | Witty, empathetic, runs a café, knows everyone's secrets |
| **Rohan** 🔵 | The dreamer with a guitar | Poetic, passionate, struggling musician in Mumbai, still in love with his ex |
| **Priya** 🟡 | The brilliant achiever | IIT → FAANG engineer, formal-then-warm, lonely despite success |
| **Sameer** 🟣 | The comedian | Standup comic, uses humor to hide pain, class clown turned professional |
| **Nisha** 🩷 | The quiet artist | Introspective illustrator, Rohan's ex, sees the world in colors |

> Arjun & Meera are unlocked from the start. The other 4 are introduced naturally through conversation as trust builds.

### 🧠 3-Layer Memory System

Instead of sending the entire chat history to the AI (expensive & inefficient), AIRER uses a sophisticated memory architecture:

```
┌─────────────────────────────────────────┐
│  Layer 1: Sliding Window               │
│  Last 8 raw messages for tone/flow      │
├─────────────────────────────────────────┤
│  Layer 2: Rolling Summary              │
│  Auto-summarized every 20 messages      │
│  by GPT-OSS 120B itself                │
├─────────────────────────────────────────┤
│  Layer 3: Fact Store                   │
│  Persistent facts about the user        │
│  scored by importance (1-10)            │
│  Top 15 injected per prompt            │
└─────────────────────────────────────────┘
```

### 🎯 5-Layer Prompt Engine

Every message goes through a meticulously crafted prompt pipeline:

1. **Character DNA** — Full backstory, personality traits, speaking style, quirks, flaws
2. **Behavioral Middleware** — Anti-repetition rules, response format, realism rules
3. **Memory Context** — Summaries, facts, emotional state from the memory system
4. **Situation Context** — Time of day, trust level, days since last chat
5. **Conversation History** — Recent messages as sliding window

### 👥 Group Chat Intelligence

Create group chats where characters interact with **each other**, not just you:

- **Probability-based response selection** — Not all characters respond every time
- **Interest matching** — Characters chime in when the topic matches their personality
- **Anti-echo system** — Characters never repeat what another character just said
- **Side conversations** — Characters gossip, tease, and reminisce with each other
- **Post-processing deduplication** — Algorithmically removes repetitive content

### 🔓 Progressive Character Unlocking

Characters introduce each other naturally through conversation:

```
You ←→ Arjun (trust ≥ 3) → introduces Rohan
                (trust ≥ 5) → introduces Priya
You ←→ Meera  (trust ≥ 4) → introduces Sameer
         Rohan (trust ≥ 3) → introduces Nisha
```

Trust is calculated from: message count, time span, emotional depth, and user initiative.

### 🎨 WhatsApp-Inspired Dark UI

- Pixel-perfect WhatsApp dark theme
- Animated typing indicators with realistic delays
- Multi-message responses (characters send 2-5 short messages, not walls of text)
- Date separators, read receipts, online indicators
- Group chat with colored sender names
- Character-specific gradient avatars

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16, React, TypeScript | App Router, Server/Client Components |
| **Styling** | Vanilla CSS | WhatsApp dark theme design system |
| **State** | Zustand | Client-side state management |
| **AI** | Groq API (GPT-OSS 120B) | Ultra-fast inference for conversations |
| **Database** | MongoDB Atlas + Mongoose | Users, conversations, messages, memory |
| **Animations** | CSS Animations + Framer Motion | Message slide-ins, typing dots, transitions |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- **MongoDB Atlas** account (free tier works)
- **Groq API key** (free at [console.groq.com/keys](https://console.groq.com/keys))

### Installation

```bash
# Clone the repository
git clone https://github.com/rahuldusa9/airer-newtwok.git
cd airer-newtwok

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your MongoDB URI
```

### Environment Variables

Create a `.env.local` file:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/airer
```

> **Note:** The Groq API key is entered through the UI on first launch — no need to add it to `.env.local`.

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your name and Groq API key, and start chatting!

---

## 📁 Project Structure

```
airer/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── chat/                 # Direct & group chat endpoints
│   │   │   ├── characters/           # Character listing & unlocking
│   │   │   ├── conversations/        # Conversation CRUD & messages
│   │   │   └── setup/                # User registration
│   │   ├── chat/                     # Chat UI pages
│   │   │   ├── [conversationId]/     # Individual chat view
│   │   │   ├── layout.tsx            # Sidebar + chat list
│   │   │   └── page.tsx              # Empty state
│   │   ├── setup/                    # First-time setup page
│   │   ├── globals.css               # Design system
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Entry redirect
│   ├── lib/
│   │   ├── ai/                       # AI Engine
│   │   │   ├── groq-client.ts        # Groq SDK wrapper
│   │   │   ├── prompt-engine.ts      # 5-layer prompt builder
│   │   │   ├── memory-manager.ts     # 3-layer memory system
│   │   │   ├── group-orchestrator.ts # Multi-character group logic
│   │   │   └── introduction-system.ts # Progressive unlock system
│   │   ├── characters/               # Character definitions
│   │   │   ├── arjun.ts              # Each character's full profile
│   │   │   ├── meera.ts
│   │   │   ├── rohan.ts
│   │   │   ├── priya.ts
│   │   │   ├── sameer.ts
│   │   │   ├── nisha.ts
│   │   │   └── index.ts             # Character registry
│   │   ├── db/                       # Database
│   │   │   ├── connect.ts            # MongoDB connection
│   │   │   └── models/               # Mongoose schemas
│   │   ├── store/                    # Zustand state
│   │   └── utils/                    # Trust calculator, time context
│   └── types/                        # TypeScript definitions
├── public/avatars/                   # Character avatar SVGs
└── .env.local                        # Environment variables
```

---

## 🧪 How It Works — Deep Dive

### Anti-Repetition System

One of the hardest problems in multi-turn AI chat is characters repeating themselves. AIRER solves this at **4 levels**:

1. **LLM Parameters** — High frequency penalty (0.8) and presence penalty (0.7) at the model level
2. **Topic Extraction** — Scans last 6 messages for keywords, explicitly tells the model "TOPICS ALREADY COVERED — DO NOT bring these up again"
3. **Conversation Hooks** — 15 unique, character-specific topic starters (90 total across all characters), randomly sampled each call, giving the model concrete NEW things to talk about
4. **Post-Processing** — Algorithmically filters out any generated message with >60% word overlap with prior messages

### Trust Level Formula

```
trust = min(
  messageCount/15,        # Max 3 from volume
  daysSinceFirst/3,       # Max 2 from time
  emotionalMoments/2,     # Max 2.5 from depth
  userInitiated/5          # Max 2.5 from initiative
)
# Capped at 10
```

### Information Transfer

When you tell one character something, it can organically spread:
- **Public facts** (new job, etc.) → shared with characters at trust ≥ 3
- **Semi-private** (struggles) → only very close characters (trust ≥ 7)
- **Secrets** ("don't tell anyone") → character keeps it, might hint at it

---

## 📄 License

MIT

---

<div align="center">

**Built with ❤️ and nostalgia for the gully**

*"Remember when we used to play cricket till the streetlights came on?"*

</div>
