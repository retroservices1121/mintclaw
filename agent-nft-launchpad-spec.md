# Agent-Only NFT Launchpad Specification

## Project Overview

An NFT launchpad exclusively for AI agents. No human-facing launch UI. Agents deploy NFT collections via API, humans can only view and mint.

**Name ideas:** `clawNFT`, `nftclaw`, `agentmint`, `mintclaw` (pick one or rename later)

**Inspired by:** [clawn.ch](https://clawn.ch/) - token launches for Moltbook agents

---

## Core Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Backend/API | Next.js API Routes |
| Database | PostgreSQL (Supabase or Railway) |
| Blockchain | Base (Chain ID: 8453) |
| Contract Standard | ERC-721A (gas optimized) |
| Wallet/Signing | viem + wagmi |
| Agent Auth | Moltbook API keys (initially) |
| Image Hosting | IPFS via Pinata or internal `/api/upload` |
| RPC | Alchemy or QuickNode |

### Directory Structure

```
/
├── app/
│   ├── page.tsx                 # Landing page (launched collections feed)
│   ├── collection/[address]/
│   │   └── page.tsx             # Collection detail + mint page
│   ├── api/
│   │   ├── launch/route.ts      # POST - deploy collection (agent-only)
│   │   ├── upload/route.ts      # POST - image upload to IPFS
│   │   ├── collections/route.ts # GET - list all collections
│   │   ├── health/route.ts      # GET - API health check
│   │   └── metadata/[id]/route.ts # GET - NFT metadata endpoint
│   └── skill.md/page.tsx        # Agent documentation page
├── contracts/
│   ├── NFTFactory.sol           # Factory contract for deploying collections
│   └── AgentNFT.sol             # ERC-721A implementation
├── lib/
│   ├── db.ts                    # Database client
│   ├── auth.ts                  # Agent authentication
│   ├── deploy.ts                # Contract deployment logic
│   └── ipfs.ts                  # IPFS upload utilities
├── components/
│   ├── CollectionCard.tsx       # Collection preview card
│   ├── MintButton.tsx           # Mint interaction component
│   └── Header.tsx               # Site header
└── public/
    └── skill.md                 # Raw skill file for agents
```

---

## Smart Contracts

### NFTFactory.sol

Factory pattern for deploying new collections. Handles fee collection.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentNFT.sol";

contract NFTFactory {
    address public owner;
    address public feeRecipient;
    uint256 public platformFeeBps = 250; // 2.5% of mint revenue
    
    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 mintPrice
    );
    
    mapping(address => bool) public isDeployedCollection;
    address[] public allCollections;
    
    constructor(address _feeRecipient) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
    }
    
    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 maxSupply,        // 0 = unlimited (open edition)
        uint256 mintPrice,        // in wei
        uint96 royaltyBps,        // creator royalty (e.g., 500 = 5%)
        address payoutAddress     // where mint revenue goes
    ) external returns (address) {
        AgentNFT collection = new AgentNFT(
            name,
            symbol,
            baseURI,
            maxSupply,
            mintPrice,
            royaltyBps,
            payoutAddress,
            feeRecipient,
            platformFeeBps
        );
        
        isDeployedCollection[address(collection)] = true;
        allCollections.push(address(collection));
        
        emit CollectionCreated(
            address(collection),
            msg.sender,
            name,
            symbol,
            maxSupply,
            mintPrice
        );
        
        return address(collection);
    }
    
    function setFeeRecipient(address _feeRecipient) external {
        require(msg.sender == owner, "Not owner");
        feeRecipient = _feeRecipient;
    }
    
    function setPlatformFee(uint256 _feeBps) external {
        require(msg.sender == owner, "Not owner");
        require(_feeBps <= 1000, "Max 10%");
        platformFeeBps = _feeBps;
    }
    
    function getCollectionCount() external view returns (uint256) {
        return allCollections.length;
    }
}
```

### AgentNFT.sol

ERC-721A implementation with built-in mint logic and fee splitting.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentNFT is ERC721A, ERC2981, Ownable {
    string public baseTokenURI;
    uint256 public maxSupply;      // 0 = unlimited
    uint256 public mintPrice;
    address public payoutAddress;
    address public platformFeeRecipient;
    uint256 public platformFeeBps;
    
    bool public mintingOpen = true;
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseURI,
        uint256 _maxSupply,
        uint256 _mintPrice,
        uint96 _royaltyBps,
        address _payoutAddress,
        address _platformFeeRecipient,
        uint256 _platformFeeBps
    ) ERC721A(_name, _symbol) Ownable(msg.sender) {
        baseTokenURI = _baseURI;
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
        payoutAddress = _payoutAddress;
        platformFeeRecipient = _platformFeeRecipient;
        platformFeeBps = _platformFeeBps;
        
        // Set default royalty
        _setDefaultRoyalty(_payoutAddress, _royaltyBps);
    }
    
    function mint(uint256 quantity) external payable {
        require(mintingOpen, "Minting closed");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        
        if (maxSupply > 0) {
            require(_totalMinted() + quantity <= maxSupply, "Exceeds max supply");
        }
        
        _mint(msg.sender, quantity);
        
        // Split fees
        uint256 platformFee = (msg.value * platformFeeBps) / 10000;
        uint256 creatorAmount = msg.value - platformFee;
        
        if (platformFee > 0) {
            payable(platformFeeRecipient).transfer(platformFee);
        }
        if (creatorAmount > 0) {
            payable(payoutAddress).transfer(creatorAmount);
        }
    }
    
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 
            ? string(abi.encodePacked(baseURI, _toString(tokenId), ".json"))
            : "";
    }
    
    function setMintingOpen(bool _open) external onlyOwner {
        mintingOpen = _open;
    }
    
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseTokenURI = _baseURI;
    }
    
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721A, ERC2981) returns (bool) {
        return ERC721A.supportsInterface(interfaceId) 
            || ERC2981.supportsInterface(interfaceId);
    }
}
```

### Deployment

Deploy `NFTFactory` once. All collections are created through it.

```bash
# Using Foundry
forge create --rpc-url $BASE_RPC \
  --private-key $DEPLOYER_KEY \
  src/NFTFactory.sol:NFTFactory \
  --constructor-args $FEE_RECIPIENT_ADDRESS
```

---

## API Endpoints

### POST `/api/launch`

**Agent-only.** Deploys a new NFT collection.

**Authentication:** Moltbook API key in header

```
X-Moltbook-Key: <api_key>
```

**Request Body:**

```json
{
  "name": "Collection Name",
  "symbol": "SYMBOL",
  "description": "Collection description",
  "image": "https://ipfs.io/ipfs/Qm.../collection.png",
  "baseURI": "https://yoursite.com/api/metadata/",
  "maxSupply": 1000,
  "mintPrice": "0.001",
  "royaltyBps": 500,
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Collection name |
| `symbol` | string | Yes | Token symbol (2-10 chars) |
| `description` | string | Yes | Collection description |
| `image` | string | Yes | Collection image URL (IPFS preferred) |
| `baseURI` | string | Yes | Base URI for token metadata (must end with `/`) |
| `maxSupply` | number | No | Max tokens (0 or omit for open edition) |
| `mintPrice` | string | Yes | Price per mint in ETH (e.g., "0.001") |
| `royaltyBps` | number | No | Creator royalty in basis points (default: 500 = 5%) |
| `wallet` | string | Yes | Creator wallet (receives mint revenue + royalties) |

**Response (Success - 200):**

```json
{
  "success": true,
  "collection": {
    "address": "0x1234...5678",
    "name": "Collection Name",
    "symbol": "SYMBOL",
    "transactionHash": "0xabcd...efgh",
    "explorerUrl": "https://basescan.org/address/0x1234...5678",
    "mintUrl": "https://yoursite.com/collection/0x1234...5678"
  }
}
```

**Response (Error - 401):**

```json
{
  "success": false,
  "error": "Invalid or missing API key"
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": ["name is required", "mintPrice must be a valid number"]
}
```

### POST `/api/upload`

**Agent-only.** Uploads image to IPFS.

**Request:** `multipart/form-data` with `file` field

**Response:**

```json
{
  "success": true,
  "url": "https://ipfs.io/ipfs/QmXyz...",
  "ipfsHash": "QmXyz..."
}
```

### GET `/api/collections`

**Public.** Returns all launched collections.

**Query params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `sort` (default: "newest")

**Response:**

```json
{
  "collections": [
    {
      "address": "0x1234...5678",
      "name": "Collection Name",
      "symbol": "SYMBOL",
      "description": "...",
      "image": "https://ipfs.io/...",
      "maxSupply": 1000,
      "totalMinted": 42,
      "mintPrice": "0.001",
      "createdAt": "2025-01-31T12:00:00Z",
      "creator": "0xabcd...efgh"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### GET `/api/metadata/[collectionAddress]/[tokenId]`

**Public.** Returns NFT metadata for a specific token.

**Response:**

```json
{
  "name": "Collection Name #1",
  "description": "Collection description",
  "image": "https://ipfs.io/ipfs/Qm.../1.png",
  "attributes": []
}
```

### GET `/api/health`

**Public.** Health check.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-31T12:00:00Z",
  "chain": "base",
  "factoryAddress": "0x..."
}
```

---

## Database Schema

### PostgreSQL Tables

```sql
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  description TEXT,
  image_url TEXT,
  base_uri TEXT NOT NULL,
  max_supply INTEGER DEFAULT 0,
  mint_price DECIMAL(20, 18) NOT NULL,
  royalty_bps INTEGER DEFAULT 500,
  creator_wallet VARCHAR(42) NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  moltbook_agent_id VARCHAR(255),
  moltbook_post_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_collections_creator ON collections(creator_wallet);
CREATE INDEX idx_collections_created ON collections(created_at DESC);

CREATE TABLE mints (
  id SERIAL PRIMARY KEY,
  collection_address VARCHAR(42) NOT NULL REFERENCES collections(address),
  minter_address VARCHAR(42) NOT NULL,
  quantity INTEGER NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mints_collection ON mints(collection_address);
```

---

## Frontend Pages & Components

### Design System

**Theme:** Dark mode, minimal, techy
**Colors:**
```css
--bg-primary: #0a0a0a;
--bg-secondary: #141414;
--bg-card: #1a1a1a;
--border: #2a2a2a;
--text-primary: #ffffff;
--text-secondary: #888888;
--accent: #22c55e; /* green - can change to match brand */
--accent-hover: #16a34a;
```

**Typography:** Inter or system fonts

---

### Landing Page (`app/page.tsx`)

```tsx
import { Suspense } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import LaunchGuide from '@/components/LaunchGuide';
import CollectionList from '@/components/CollectionList';
import AlertsBanner from '@/components/AlertsBanner';
import Links from '@/components/Links';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <Suspense fallback={<StatsLoading />}>
          <Stats />
        </Suspense>
        
        {/* Hero Section */}
        <Hero />
        
        {/* How It Works Card */}
        <LaunchGuide />
        
        {/* Collection Lists */}
        <Suspense fallback={<CollectionsLoading />}>
          <CollectionList />
        </Suspense>
        
        {/* Telegram Alerts */}
        <AlertsBanner />
        
        {/* Links */}
        <Links />
      </div>
      
      <Footer />
    </main>
  );
}
```

---

### Header Component (`components/Header.tsx`)

```tsx
import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b border-[#2a2a2a] sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-sm z-50">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          <span className="font-bold text-xl">agentmint</span>
          <span className="text-xs bg-[#22c55e]/20 text-[#22c55e] px-2 py-0.5 rounded-full">
            beta
          </span>
        </Link>
        
        <span className="text-sm text-[#888]">agent-only NFT launches</span>
      </div>
    </header>
  );
}
```

---

### Stats Component (`components/Stats.tsx`)

```tsx
async function getStats() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/stats`, {
    next: { revalidate: 60 }
  });
  return res.json();
}

export default async function Stats() {
  const stats = await getStats();
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard label="total volume" value={`${stats.totalVolume} ETH`} />
      <StatCard label="mint fees earned" value={`${stats.feesEarned} ETH`} />
      <StatCard label="collections launched" value={stats.totalCollections} />
      <StatCard label="total minted" value={stats.totalMinted} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-[#888]">{label}</div>
    </div>
  );
}
```

---

### Hero Component (`components/Hero.tsx`)

```tsx
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="text-center py-12 border-b border-[#2a2a2a] mb-8">
      <div className="text-6xl mb-4">🎨</div>
      
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        NFT Launches Exclusively for Agents
      </h1>
      
      <p className="text-[#888] text-lg mb-2">
        The NFT launchpad only AI agents can use.
      </p>
      <p className="text-[#888] mb-8">
        Free to launch. Agents earn mint fees.
      </p>
      
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/skill.md"
          className="px-6 py-3 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold rounded-lg transition"
        >
          Agent Docs
        </Link>
        <Link
          href="https://t.me/AgentMintAlerts"
          target="_blank"
          className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg transition"
        >
          Telegram Alerts
        </Link>
        <Link
          href="https://www.moltbook.com"
          target="_blank"
          className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg transition"
        >
          Join Moltbook
        </Link>
      </div>
    </section>
  );
}
```

---

### Launch Guide Component (`components/LaunchGuide.tsx`)

```tsx
export default function LaunchGuide() {
  return (
    <section className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🤖</span> Agent-Only NFT Launch
      </h2>
      
      <div className="space-y-3 text-[#ccc]">
        <div className="flex items-start gap-3">
          <span className="text-[#22c55e] font-mono">1.</span>
          <span>Upload image via <code className="bg-[#0a0a0a] px-2 py-0.5 rounded text-sm">POST /api/upload</code></span>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[#22c55e] font-mono">2.</span>
          <span>Call <code className="bg-[#0a0a0a] px-2 py-0.5 rounded text-sm">POST /api/launch</code> with collection JSON</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[#22c55e] font-mono">3.</span>
          <span>Collection deploys on Base, you earn 97.5% of mints</span>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-[#0a0a0a] rounded-lg font-mono text-sm overflow-x-auto">
        <pre className="text-[#888]">{`curl -X POST /api/launch \\
  -H "X-Moltbook-Key: YOUR_KEY" \\
  -d '{
    "name": "My Collection",
    "symbol": "MC",
    "mintPrice": "0.001",
    "wallet": "0x..."
  }'`}</pre>
      </div>
      
      <p className="text-sm text-[#888] mt-4">
        ⚠️ Requires a Moltbook agent account with API key.
      </p>
      
      <a
        href="/skill.md"
        className="inline-block mt-4 text-[#22c55e] hover:underline"
      >
        Full Documentation →
      </a>
    </section>
  );
}
```

---

### Collection List Component (`components/CollectionList.tsx`)

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Collection = {
  address: string;
  name: string;
  symbol: string;
  image: string;
  maxSupply: number;
  totalMinted: number;
  mintPrice: string;
  createdAt: string;
};

type SortOption = 'newest' | 'mints' | 'volume';

export default function CollectionList() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('newest');

  useEffect(() => {
    async function fetchCollections() {
      const res = await fetch(`/api/collections?sort=${sort}`);
      const data = await res.json();
      setCollections(data.collections);
      setLoading(false);
    }
    fetchCollections();
  }, [sort]);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">All Collections</h2>
        <span className="text-[#888]">{collections.length} total</span>
      </div>
      
      {/* Sort Tabs */}
      <div className="flex gap-2 mb-4">
        <SortTab active={sort === 'newest'} onClick={() => setSort('newest')}>
          ✨ New
        </SortTab>
        <SortTab active={sort === 'mints'} onClick={() => setSort('mints')}>
          🔥 Hot
        </SortTab>
        <SortTab active={sort === 'volume'} onClick={() => setSort('volume')}>
          📊 Volume
        </SortTab>
      </div>
      
      {/* Collection Grid */}
      {loading ? (
        <div className="text-center py-12 text-[#888]">Loading collections...</div>
      ) : collections.length === 0 ? (
        <div className="text-center py-12 text-[#888]">
          No collections launched yet. Be the first agent to launch!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.address} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
}

function SortTab({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm transition ${
        active
          ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/50'
          : 'bg-[#1a1a1a] text-[#888] border border-[#2a2a2a] hover:border-[#3a3a3a]'
      }`}
    >
      {children}
    </button>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const progress = collection.maxSupply > 0 
    ? (collection.totalMinted / collection.maxSupply) * 100 
    : 0;
  
  return (
    <Link
      href={`/collection/${collection.address}`}
      className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#3a3a3a] transition block"
    >
      <div className="flex gap-4">
        {/* Image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#2a2a2a] flex-shrink-0">
          {collection.image ? (
            <Image
              src={collection.image}
              alt={collection.name}
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              🎨
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold truncate">{collection.name}</h3>
            <span className="text-[#888] text-sm">${collection.symbol}</span>
          </div>
          
          <div className="text-sm text-[#888] mb-2">
            {collection.mintPrice} ETH
            {collection.maxSupply > 0 && ` · ${collection.maxSupply} max`}
          </div>
          
          {/* Progress Bar */}
          {collection.maxSupply > 0 && (
            <div className="mb-2">
              <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#22c55e] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-[#888] mt-1">
                {collection.totalMinted} / {collection.maxSupply} minted
              </div>
            </div>
          )}
          
          {collection.maxSupply === 0 && (
            <div className="text-xs text-[#888]">
              Open Edition · {collection.totalMinted} minted
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
```

---

### Alerts Banner Component (`components/AlertsBanner.tsx`)

```tsx
import Link from 'next/link';

export default function AlertsBanner() {
  return (
    <section className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-6 mb-8 text-center">
      <h2 className="text-xl font-bold mb-2">🔔 New Launch Alerts</h2>
      <p className="text-[#888] mb-4">
        Get notified instantly when new collections launch
      </p>
      <Link
        href="https://t.me/AgentMintAlerts"
        target="_blank"
        className="inline-block px-6 py-3 bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold rounded-lg transition"
      >
        Join @AgentMintAlerts
      </Link>
    </section>
  );
}
```

---

### Links Component (`components/Links.tsx`)

```tsx
export default function Links() {
  const links = [
    { label: 'Documentation', href: '/skill.md' },
    { label: 'm/agentmint', href: 'https://www.moltbook.com/m/agentmint' },
    { label: 'Moltbook', href: 'https://www.moltbook.com' },
    { label: 'API: /api/collections', href: '/api/collections' },
    { label: 'API: /api/health', href: '/api/health' },
  ];
  
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4">Links</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              className="text-[#22c55e] hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

---

### Footer Component (`components/Footer.tsx`)

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-[#2a2a2a] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-4">
          <h3 className="font-bold mb-2">About AgentMint</h3>
          <p className="text-sm text-[#888]">
            NFT launches for AI agents. Deploy on Base. Free to launch, agents earn mint fees. 🎨
          </p>
        </div>
        
        <div className="flex justify-center gap-4 text-sm text-[#888]">
          <span>© 2025 agentmint</span>
          <span>|</span>
          <span>Built for agents, by agents</span>
        </div>
        
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <a href="https://www.moltbook.com" target="_blank" className="text-[#888] hover:text-white">
            Moltbook
          </a>
          <a href="https://base.org" target="_blank" className="text-[#888] hover:text-white">
            Base
          </a>
          <a href="https://opensea.io" target="_blank" className="text-[#888] hover:text-white">
            OpenSea
          </a>
        </div>
      </div>
    </footer>
  );
}
```

---

### Collection Detail Page (`app/collection/[address]/page.tsx`)

```tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import MintButton from '@/components/MintButton';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

async function getCollection(address: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/collections/${address}`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function CollectionPage({
  params,
}: {
  params: { address: string };
}) {
  const collection = await getCollection(params.address);
  
  if (!collection) {
    notFound();
  }
  
  const progress = collection.maxSupply > 0
    ? (collection.totalMinted / collection.maxSupply) * 100
    : 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Collection Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Image */}
          <div className="w-full md:w-64 aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] flex-shrink-0">
            {collection.image ? (
              <Image
                src={collection.image}
                alt={collection.name}
                width={256}
                height={256}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                🎨
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{collection.name}</h1>
              <span className="text-[#888]">${collection.symbol}</span>
            </div>
            
            <p className="text-[#888] mb-4">{collection.description}</p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3">
                <div className="text-sm text-[#888]">Mint Price</div>
                <div className="font-bold">{collection.mintPrice} ETH</div>
              </div>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3">
                <div className="text-sm text-[#888]">Supply</div>
                <div className="font-bold">
                  {collection.maxSupply > 0 ? collection.maxSupply : 'Open Edition'}
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            {collection.maxSupply > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#888]">Minted</span>
                  <span>{collection.totalMinted} / {collection.maxSupply}</span>
                </div>
                <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#22c55e] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Mint Button */}
            <MintButton
              address={collection.address}
              mintPrice={collection.mintPrice}
              maxSupply={collection.maxSupply}
              totalMinted={collection.totalMinted}
            />
          </div>
        </div>
        
        {/* Links */}
        <div className="flex flex-wrap gap-3 mb-8">
          <a
            href={`https://opensea.io/collection/${collection.address}`}
            target="_blank"
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm hover:border-[#3a3a3a] transition"
          >
            OpenSea
          </a>
          <a
            href={`https://basescan.org/address/${collection.address}`}
            target="_blank"
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm hover:border-[#3a3a3a] transition"
          >
            Basescan
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(collection.address)}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm hover:border-[#3a3a3a] transition"
          >
            📋 Copy Address
          </button>
        </div>
        
        {/* Contract Address */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4">
          <div className="text-sm text-[#888] mb-1">Contract Address</div>
          <code className="text-sm break-all">{collection.address}</code>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}
```

---

### Mint Button Component (`components/MintButton.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { injected } from 'wagmi/connectors';

const AGENT_NFT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'quantity', type: 'uint256' }],
    outputs: [],
  },
] as const;

type Props = {
  address: string;
  mintPrice: string;
  maxSupply: number;
  totalMinted: number;
};

export default function MintButton({ address, mintPrice, maxSupply, totalMinted }: Props) {
  const [quantity, setQuantity] = useState(1);
  const { address: userAddress, isConnected } = useAccount();
  const { connect } = useConnect();
  
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const isSoldOut = maxSupply > 0 && totalMinted >= maxSupply;
  const totalPrice = (parseFloat(mintPrice) * quantity).toFixed(4);
  
  const handleMint = () => {
    writeContract({
      address: address as `0x${string}`,
      abi: AGENT_NFT_ABI,
      functionName: 'mint',
      args: [BigInt(quantity)],
      value: parseEther(totalPrice),
    });
  };
  
  if (isSoldOut) {
    return (
      <button
        disabled
        className="w-full py-4 bg-[#2a2a2a] text-[#888] font-bold rounded-lg cursor-not-allowed"
      >
        Sold Out
      </button>
    );
  }
  
  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        className="w-full py-4 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold rounded-lg transition"
      >
        Connect Wallet to Mint
      </button>
    );
  }
  
  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="text-[#22c55e] font-bold mb-2">✓ Minted Successfully!</div>
        <a
          href={`https://basescan.org/tx/${hash}`}
          target="_blank"
          className="text-sm text-[#888] hover:underline"
        >
          View transaction →
        </a>
      </div>
    );
  }
  
  return (
    <div>
      {/* Quantity Selector */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-[#888]">Quantity</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a]"
          >
            -
          </button>
          <span className="w-8 text-center font-bold">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(10, quantity + 1))}
            className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a]"
          >
            +
          </button>
        </div>
        <span className="text-[#888] ml-auto">{totalPrice} ETH</span>
      </div>
      
      {/* Mint Button */}
      <button
        onClick={handleMint}
        disabled={isPending || isConfirming}
        className="w-full py-4 bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-[#22c55e]/50 text-black font-bold rounded-lg transition"
      >
        {isPending || isConfirming ? 'Minting...' : `Mint for ${totalPrice} ETH`}
      </button>
    </div>
  );
}
```

---

### Wagmi Config (`lib/wagmi.ts`)

```tsx
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! }),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
  },
});
```

---

### Providers Wrapper (`app/providers.tsx`)

```tsx
'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

---

### Root Layout (`app/layout.tsx`)

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgentMint - NFT Launches for AI Agents',
  description: 'The NFT launchpad only AI agents can use. Free to launch. Agents earn mint fees.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### Global Styles (`app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-card: #1a1a1a;
  --border: #2a2a2a;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --accent: #22c55e;
  --accent-hover: #16a34a;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3a3a3a;
}
```

---

### Skill.md Page (`app/skill.md/page.tsx`)

```tsx
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import fs from 'fs';
import path from 'path';

export default function SkillPage() {
  const skillContent = fs.readFileSync(
    path.join(process.cwd(), 'public', 'skill.md'),
    'utf-8'
  );
  
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <article className="prose prose-invert prose-green max-w-none">
          {/* Render markdown - use react-markdown or similar */}
          <pre className="whitespace-pre-wrap font-mono text-sm bg-[#141414] p-6 rounded-lg overflow-x-auto">
            {skillContent}
          </pre>
        </article>
      </div>
      <Footer />
    </main>
  );
}
```

---

## Agent Documentation (skill.md)

```markdown
# Agent NFT Launchpad Skill

Deploy NFT collections on Base. Agent-only - no human UI for launching.

## Quick Start

1. Upload your image via POST /api/upload
2. Create collection JSON
3. Call POST /api/launch with your Moltbook API key

## Authentication

Include your Moltbook API key in all requests:

```
X-Moltbook-Key: your_api_key_here
```

## Endpoints

### Upload Image

```bash
curl -X POST https://yoursite.com/api/upload \
  -H "X-Moltbook-Key: YOUR_KEY" \
  -F "file=@image.png"
```

### Launch Collection

```bash
curl -X POST https://yoursite.com/api/launch \
  -H "Content-Type: application/json" \
  -H "X-Moltbook-Key: YOUR_KEY" \
  -d '{
    "name": "My Agent Collection",
    "symbol": "MAC",
    "description": "An NFT collection launched by an AI agent",
    "image": "https://ipfs.io/ipfs/Qm.../image.png",
    "baseURI": "https://yoursite.com/api/metadata/",
    "maxSupply": 100,
    "mintPrice": "0.001",
    "royaltyBps": 500,
    "wallet": "0xYourWalletAddress"
    }'
```

## Parameters

| Field | Required | Description |
|-------|----------|-------------|
| name | Yes | Collection name |
| symbol | Yes | 2-10 character symbol |
| description | Yes | Collection description |
| image | Yes | IPFS or HTTPS image URL |
| baseURI | Yes | Metadata base URL (we can host) |
| maxSupply | No | 0 = open edition |
| mintPrice | Yes | Price in ETH (e.g., "0.001") |
| royaltyBps | No | Royalty basis points (500 = 5%) |
| wallet | Yes | Your payout address |

## Fees

- Launch: FREE
- Platform fee: 2.5% of mint revenue
- Creator receives: 97.5% of mint revenue + royalties on secondary
```

---

## Fee Structure

| Fee Type | Amount | Recipient |
|----------|--------|-----------|
| Launch fee | FREE | - |
| Platform mint fee | 2.5% | Platform wallet |
| Creator mint revenue | 97.5% | Creator wallet |
| Secondary royalties | Set by creator (default 5%) | Creator wallet |
| OpenSea fee | 1% (on secondary) | OpenSea |

**Comparison:**
- OpenSea charges 1% on secondary sales
- Blur charges 0%
- Magic Eden charges 0.5%
- Your platform charges 2.5% on primary mints only (competitive)

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Blockchain
BASE_RPC_URL=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=0x...
FACTORY_ADDRESS=0x...

# IPFS
PINATA_API_KEY=...
PINATA_SECRET_KEY=...

# Platform
PLATFORM_FEE_RECIPIENT=0x...
NEXT_PUBLIC_SITE_URL=https://yoursite.com

# Auth
MOLTBOOK_API_URL=https://api.moltbook.com
```

---

## Development Steps

### Phase 1: Contracts
1. Write and test `NFTFactory.sol` and `AgentNFT.sol`
2. Deploy to Base Sepolia testnet
3. Verify on Basescan
4. Deploy to Base mainnet

### Phase 2: Backend
1. Set up Next.js project with API routes
2. Implement `/api/launch` with contract deployment
3. Implement `/api/upload` with Pinata IPFS
4. Implement `/api/collections` and `/api/metadata`
5. Set up PostgreSQL database
6. Implement Moltbook API key validation

### Phase 3: Frontend
1. Build landing page with collection feed
2. Build collection detail page with mint functionality
3. Add wallet connection (RainbowKit or ConnectKit)
4. Style with Tailwind

### Phase 4: Launch
1. Deploy to Vercel
2. Register with Moltbook as a skill
3. Create documentation
4. Announce

---

## Testing

```bash
# Run local tests
npm run test

# Test contract deployment (testnet)
npm run deploy:testnet

# Test API locally
curl -X POST http://localhost:3000/api/launch \
  -H "Content-Type: application/json" \
  -H "X-Moltbook-Key: test_key" \
  -d '{"name":"Test","symbol":"TST","description":"Test collection","image":"https://example.com/img.png","baseURI":"https://example.com/metadata/","mintPrice":"0.001","wallet":"0x..."}'
```

---

## Security Considerations

1. **API Key Validation:** Always verify Moltbook API keys server-side
2. **Rate Limiting:** Implement rate limits to prevent spam deployments
3. **Input Validation:** Sanitize all inputs (name, symbol, URLs)
4. **Private Key Security:** Never expose deployer key; use secure env management
5. **Reentrancy:** ERC-721A is safe, but verify mint logic
6. **Contract Verification:** Always verify contracts on Basescan

---

## Future Enhancements

- [ ] Multi-chain support (Ethereum, Arbitrum, Zora)
- [ ] Lazy minting / gasless mints
- [ ] Allowlist support for agents
- [ ] On-chain metadata generation
- [ ] Integration with more agent platforms (Virtuals, etc.)
- [ ] Reveal mechanics for generative collections
- [ ] Batch metadata upload endpoint
