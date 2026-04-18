# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClaudePizza is a full-stack pizzaria ordering system with a UI/UX design in `pizzaria.pen` and an implementation in `backend/` (.NET 9) and `frontend/` (Next.js 14). Dark mode only.

## Working with the Design File

- **All reads and writes** to `pizzaria.pen` must go through the `pencil` MCP tools — never use `Read`, `Grep`, or `Edit` directly.
- Start any design task with `get_editor_state`.
- Use `batch_get` to discover nodes and `batch_design` to make changes.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | ASP.NET Core 9 Web API (migrate to .NET 10 when SDK available) |
| ORM | Entity Framework Core 9 + Npgsql |
| Auth | ASP.NET Identity + JWT Bearer |
| Real-time | SignalR (`/hubs/orders`) |
| Geocoding | ViaCEP (CEP validation) + Nominatim/OSM (free, no API key) |
| Distance | Haversine formula (straight-line, configurable pizzaria lat/lng) |

## Running Locally

```bash
# Backend
cd backend && dotnet run   # → http://localhost:5000/swagger

# Frontend
cd frontend && npm run dev  # → http://localhost:3000
```

Backend requires PostgreSQL. For local dev, create a `.env` override or edit `appsettings.json` connection string. For cloud dev, use Neon free tier.

## Production Deploy (free tier)

| Service | Provider | Notes |
|---|---|---|
| Frontend | **Vercel** | Auto-deploy on push to main |
| Backend .NET | **Render** | Free tier, sleeps after 15 min inactivity |
| PostgreSQL | **Neon** | Free tier, 0.5 GB |

### Render — required environment variables

Set these in **Render dashboard → Environment**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string (`postgresql://...`) |
| `JWT_KEY` | Use "Generate value" in Render (auto-random) |
| `ALLOWED_ORIGINS` | Your Vercel URL, e.g. `https://claudepizza.vercel.app` |
| `Jwt__Issuer` | `ClaudePizza` |
| `Jwt__Audience` | `ClaudePizzaApp` |
| `Delivery__PizzariaLat` | Latitude of the pizzaria |
| `Delivery__PizzariaLng` | Longitude of the pizzaria |

### Vercel — required environment variable

Set in **Vercel dashboard → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Render service URL, e.g. `https://claudepizza-api.onrender.com` |

### Deploy order

1. Create Neon database → copy connection string
2. Create Render web service from `backend/Dockerfile` → set env vars → deploy (runs `db.Database.Migrate()` on startup)
3. Deploy frontend to Vercel → set `NEXT_PUBLIC_API_URL` → redeploy
4. Set `ALLOWED_ORIGINS` on Render to the Vercel URL → redeploy backend

## Architecture

### Backend (`backend/`)

```
Controllers/   AuthController, FlavorsController, ProductsController,
               PromotionsController, OrdersController, DeliveryController
Data/          AppDbContext (Identity + EF Core)
Hubs/          OrderHub (SignalR — emits OrderStatusChanged to order-{id} group)
Models/        AppUser, Flavor, Product, Promotion, Order, OrderItem
Services/      TokenService (JWT), DeliveryService (ViaCEP + Nominatim + Haversine)
DTOs/          Request/response records for each resource
```

Order status flow: `Preparando → Pronto → Entregue | Cancelado`

### Frontend (`frontend/src/`)

```
app/(auth)/login/          Login page (sets token + role cookies for middleware)
app/(customer)/            Sidebar layout with customer nav
  orders/new/              New order: size → flavor → extras → crust → cart
  orders/                  Order tracking with SignalR live updates
  checkout/                Pickup or Delivery (CEP lookup + address + fee)
app/(admin)/               Sidebar layout with admin nav
  admin/flavors/           CRUD table
  admin/promotions/        CRUD table
  admin/products/          CRUD table
components/ui/             Button, Input, Card, Badge
components/layout/         Sidebar, AppShell
components/admin/          DataTable (paginated, searchable, with edit/delete)
lib/api.ts                 Fetch wrapper (reads token from localStorage)
lib/signalr.ts             SignalR hub connection helper
lib/auth.ts                saveAuth / getAuth / clearAuth helpers
middleware.ts              Route protection by role (reads token/role cookies)
```

### Design Tokens (Dark mode only)

```css
--background: #111111    --card: #1A1A1A       --primary: #FF8400
--foreground: #FFFFFF    --muted: #2E2E2E      --border: #2E2E2E
--muted-foreground: #B8B9B6                    --destructive: #FF5C33
--sidebar: #18181b       --radius-m: 16px      --radius-pill: 999px
```
