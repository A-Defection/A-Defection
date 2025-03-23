# Data Models

## Entity Relationship Diagram

The following diagram illustrates the relationships between the key entities in the A Defection platform:

```
┌──────────────┐     owns     ┌──────────────┐    participates in    ┌──────────────┐
│              │──────────────▶              │────────────────────────▶              │
│     User     │              │   Character  │                       │   Narrative  │
│              │◀──────────────              │◀────────────────────────              │
└──────────────┘              └──────────────┘                       └──────────────┘
       │                             │                                     │
       │                             │                                     │
       │                             │                                     │
       │                             │                                     │
       │                             │                                     │
       │                             │                                     │
       │                             │                                     │
       │                             │                                     │
       │                           makes                                   │
       │                             │                                     │
       ▼                             ▼                                     ▼
┌──────────────┐     logs     ┌──────────────┐    affects       ┌──────────────┐
│              │◀──────────────              │────────────────────▶              │
│   Activity   │              │   Decision   │                  │    Scene     │
│              │──────────────▶              │◀────────────────────              │
└──────────────┘              └──────────────┘                  └──────────────┘
       ▲                             │                                
       │                             │                                
       │                             │                                
       │                           makes                              
       │                             │                                
       │                             ▼                                
       │                      ┌──────────────┐                        
       │                      │              │                        
       └──────────────────────│  Prediction  │                        
                              │              │                        
                              └──────────────┘                        
```

## Core Data Models

### User Model

```javascript
{
  username: String,          // Unique username
  email: String,             // Unique email address
  password: String,          // Hashed password
  avatar: String,            // URL to avatar image
  bio: String,               // User biography
  role: String,              // user, moderator, admin
  isVerified: Boolean,       // Email verification status
  createdAt: Date,           // Account creation timestamp
  lastLogin: Date,           // Last login timestamp
  refreshToken: [String],    // Array of valid refresh tokens
  verificationToken: String, // Email verification token
  resetPasswordToken: String,// Password reset token
  authProvider: String,      // local, google, twitter, facebook
  notificationPreferences: {
    email: {
      narrativeUpdates: Boolean,
      decisionReminders: Boolean,
      predictionsResolved: Boolean,
    },
    push: {/* ... */},
    inApp: {/* ... */}
  },
  metrics: {
    characterCount: Number,
    decisionsCount: Number,
    predictionsCount: Number,
    predictionsCorrect: Number,
    narrativesCreated: Number,
    lastActive: Date
  },
  walletAddress: String,     // Ethereum wallet address
  dftBalance: Number         // Token balance
}
```

### Character Model

```javascript
{
  user: ObjectId,            // Reference to owner User
  name: String,              // Character name
  type: String,              // Character type/class
  biography: String,         // Character background story
  avatar: String,            // Character avatar URL
  isPublic: Boolean,         // Visibility setting
  abilities: [{
    name: String,
    description: String,
    cooldown: Number,
    lastUsed: Date
  }],
  traits: [{
    name: String,
    value: Number,
    description: String
  }],
  status: String,            // active, inactive, deleted
  activeNarratives: [{       // Currently participating narratives
    narrative: ObjectId,
    joinedAt: Date,
    role: String
  }],
  pastNarratives: [{         // Previous narratives
    narrative: ObjectId,
    joinedAt: Date,
    leftAt: Date,
    role: String
  }],
  decisions: [ObjectId],     // References to decisions made
  predictions: [ObjectId],   // References to predictions made
  nftData: {                 // If character is minted as NFT
    tokenId: String,
    contractAddress: String,
    mintedAt: Date,
    chain: String
  }
}
```

### Narrative Model

```javascript
{
  title: String,             // Narrative title
  summary: String,           // Brief summary
  description: String,       // Detailed description
  category: String,          // politics, economics, technology, etc.
  tags: [String],            // Related tags
  status: String,            // draft, active, completed, archived
  visibility: String,        // public, private, unlisted
  newsReferences: [{         // Real news sources
    title: String,
    url: String,
    source: String,
    publishedAt: Date,
    relevance: Number
  }],
  timeline: {
    startDate: Date,         // Narrative start date
    endDate: Date,           // Narrative end date
    realWorldStartDate: Date,// Real event start date
    realWorldEndDate: Date   // Real event end date
  },
  locations: [{              // Locations in the narrative
    name: String,
    description: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }],
  characters: [{             // Participating characters
    character: ObjectId,
    role: String,            // protagonist, antagonist, neutral
    isActive: Boolean,
    joinedAt: Date
  }],
  scenes: [{                 // Narrative scenes
    title: String,
    description: String,
    status: String,          // pending, active, completed
    startTime: Date,
    endTime: Date,
    location: String,
    requiredCharacters: [ObjectId],
    decisions: [ObjectId]
  }],
  outcomes: [{               // Possible narrative outcomes
    title: String,
    description: String,
    triggerConditions: String,
    isRevealed: Boolean,
    achievedAt: Date
  }],
  generatedBy: {             // AI generation metadata
    aiModel: String,
    version: String,
    timestamp: Date
  },
  parentNarrative: ObjectId, // Parent narrative reference
  childNarratives: [ObjectId],// Child narratives references
  mediaAssets: [{            // Media associated with narrative
    type: String,            // image, video, audio, document
    url: String,
    caption: String,
    order: Number
  }],
  predictions: [ObjectId]    // Related predictions
}
```

### Decision Model

```javascript
{
  narrative: ObjectId,       // Associated narrative
  scene: ObjectId,           // Associated scene
  character: ObjectId,       // Character making the decision
  user: ObjectId,            // User who owns the character
  title: String,             // Decision title
  description: String,       // Decision description
  options: [{                // Available options
    title: String,
    description: String,
    consequences: String,    // Description of potential consequences
    probability: Number,     // Likelihood of this option being chosen
    votes: Number            // Number of votes for this option
  }],
  selectedOption: Number,    // Index of chosen option
  status: String,            // pending, active, resolved, expired
  deadline: Date,            // Time by which decision must be made
  createdAt: Date,           // When decision was created
  resolvedAt: Date,          // When decision was resolved
  visibility: String,        // public, private, narrative-only
  impact: {                  // Impact metrics
    narrativeImpact: Number, // How much it affects the narrative
    characterImpact: Number, // How much it affects the character
    realWorldImpact: Number  // Connection to real-world events
  },
  generatedBy: {             // If AI-generated
    aiModel: String,
    version: String,
    timestamp: Date
  }
}
```

### Prediction Model

```javascript
{
  title: String,             // Prediction title
  description: String,       // Detailed description
  narrative: ObjectId,       // Associated narrative
  character: ObjectId,       // Character making the prediction
  user: ObjectId,            // User who owns the character
  options: [{                // Possible outcomes
    title: String,
    description: String,
    probability: Number,     // Current probability
    initialProbability: Number, // Initial probability
    votes: Number,           // Number of votes
    voters: [{               // Users who voted
      user: ObjectId,
      confidence: Number,    // How confident user is (affects rewards)
      timestamp: Date
    }]
  }],
  correctOption: Number,     // Index of correct option (-1 if unresolved)
  status: String,            // active, resolved, cancelled
  category: String,          // politics, economics, sports, etc.
  tags: [String],            // Related tags
  visibility: String,        // public, private, narrative-only
  evidence: [{               // Supporting evidence
    title: String,
    url: String,
    description: String,
    addedBy: ObjectId,
    addedAt: Date
  }],
  deadline: Date,            // Prediction resolution deadline
  resolutionDate: Date,      // When prediction was resolved
  createdAt: Date,           // When prediction was created
  updatedAt: Date,           // Last update timestamp
  resolutionSource: {        // How prediction was resolved
    url: String,
    description: String,
    verifiedBy: ObjectId
  },
  totalStake: Number,        // Total tokens staked
  rewardDistributed: Boolean // Whether rewards were paid out
}
```

### Activity Model

```javascript
{
  type: String,              // login, character_created, narrative_joined, etc.
  user: ObjectId,            // User who performed the action
  character: ObjectId,       // Character involved (if applicable)
  narrative: ObjectId,       // Narrative involved (if applicable)
  decision: ObjectId,        // Decision involved (if applicable)
  prediction: ObjectId,      // Prediction involved (if applicable)
  data: Object,              // Additional activity-specific data
  importance: String,        // low, medium, high
  visibility: String,        // public, private, followers-only
  timestamp: Date,           // When activity occurred
  metadata: {                // Additional metadata
    ip: String,              // User IP address
    userAgent: String,       // User's browser/device
    location: String         // Approximate location
  }
}
```

## Database Indexing Strategy

To optimize performance, the following indexes are implemented:

### User Collection
- `username`: 1 (unique)
- `email`: 1 (unique)
- `createdAt`: -1
- `role`: 1
- `isVerified`: 1

### Character Collection
- `user`: 1
- `name`: 1
- `type`: 1
- `status`: 1
- `isPublic`: 1
- `activeNarratives.narrative`: 1

### Narrative Collection
- `status`: 1, `visibility`: 1
- `timeline.startDate`: 1, `timeline.endDate`: 1
- `category`: 1, `tags`: 1
- `characters.character`: 1

### Decision Collection
- `narrative`: 1
- `character`: 1
- `status`: 1
- `deadline`: 1

### Prediction Collection
- `narrative`: 1
- `status`: 1
- `deadline`: 1
- `category`: 1, `tags`: 1

### Activity Collection
- `user`: 1
- `type`: 1
- `timestamp`: -1
- `importance`: 1, `visibility`: 1
- `narrative`: 1

## Data Validation and Integrity

1. **Schema Validation**: Mongoose schemas enforce data structure and field types
2. **Pre-save Hooks**: Custom validation logic in pre-save hooks
3. **Cascading Deletes**: Handled through middleware to maintain referential integrity
4. **Transactions**: Used for operations that modify multiple collections

## Data Migration Strategy

1. **Version Control**: Schema versions are tracked in migrations
2. **Incremental Updates**: Migrations are applied incrementally
3. **Rollback Support**: Each migration supports rollback operations
4. **Data Validation**: Pre and post-migration validation steps 