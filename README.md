# HHOS - Hotel & Hospitality Operating System

A production-ready, revenue-driven SaaS platform for hotels. Built to increase revenue, reduce operational costs, eliminate leakage, and improve guest experience.

## Why HHOS?

**For Hotels:**
- Save 15-30% in OTA commissions with direct booking
- Real-time revenue and occupancy tracking
- Operational efficiency through automation
- Guest data ownership and loyalty building

**For Platform Owner:**
- SaaS subscription revenue
- Performance-based fees on bookings
- Marketplace commissions
- Enterprise licensing opportunities

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB with Mongoose
- **Deployment:** Vercel

## Project Structure

```
hotels/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand state stores
│   │   ├── lib/            # Utilities and API client
│   │   └── App.tsx         # Main router
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation, errors
│   │   └── utils/          # Helpers
│   └── package.json
├── vercel.json             # Deployment config
└── package.json            # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
cd hotels
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

2. **Configure environment:**
```bash
# Copy example env file
cp server/.env.example server/.env

# Edit server/.env with your MongoDB URI and other settings
```

3. **Start development servers:**
```bash
npm run dev
```

This starts:
- Backend API: http://localhost:5000
- Frontend: http://localhost:5173

### Environment Variables

**Server (.env):**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hhos_dev
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:5173
```

## Core Features (Phase 1 MVP)

### Authentication & Multi-tenancy
- [x] User registration with hotel creation
- [x] JWT authentication with refresh tokens
- [x] Role-based access (owner, admin, manager, receptionist, etc.)
- [x] Multi-hotel support per user

### Room Management
- [x] Room types with pricing
- [x] Individual room tracking
- [x] Room status management (available, occupied, cleaning, etc.)
- [x] Visual room grid by floor

### Booking Engine
- [x] Availability checking
- [x] Direct booking creation
- [x] Guest management
- [x] Check-in / check-out workflow
- [x] Payment recording
- [x] Booking channel tracking

### Dashboard & Analytics
- [x] Today's operations (arrivals, departures, in-house)
- [x] Occupancy metrics
- [x] Revenue overview (daily, weekly, monthly)
- [x] Channel performance comparison
- [x] Guest insights

### Public Booking Widget
- [x] Embeddable booking form
- [x] Date selection
- [x] Room availability display
- [x] Guest information capture
- [x] Booking confirmation

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - Register with hotel
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get profile

### Hotels
- `GET /api/v1/hotels` - List user's hotels
- `GET /api/v1/hotels/:id` - Get hotel details
- `PUT /api/v1/hotels/:id` - Update hotel
- `GET /api/v1/hotels/:id/staff` - List staff
- `POST /api/v1/hotels/:id/staff` - Add staff

### Rooms
- `GET /api/v1/rooms?hotelId=` - List rooms
- `POST /api/v1/rooms` - Create room
- `GET /api/v1/rooms/types` - List room types
- `POST /api/v1/rooms/types` - Create room type
- `PATCH /api/v1/rooms/:id/status` - Update room status

### Bookings
- `GET /api/v1/bookings/availability` - Check availability (public)
- `POST /api/v1/bookings/public` - Create booking (public)
- `GET /api/v1/bookings?hotelId=` - List bookings
- `POST /api/v1/bookings` - Create booking (staff)
- `POST /api/v1/bookings/:id/check-in` - Check in guest
- `POST /api/v1/bookings/:id/check-out` - Check out guest
- `POST /api/v1/bookings/:id/payment` - Record payment

### Dashboard
- `GET /api/v1/dashboard/summary` - Dashboard overview
- `GET /api/v1/dashboard/revenue` - Revenue report
- `GET /api/v1/dashboard/occupancy` - Occupancy trend
- `GET /api/v1/dashboard/channels` - Channel performance

## Deployment to Vercel

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Set environment variables in Vercel dashboard**
4. **Deploy**

The `vercel.json` is configured to:
- Build both client and server
- Route `/api/*` to serverless functions
- Serve React app for all other routes

## Roadmap

### Phase 2 - Operations & Control
- [ ] Digital check-in / check-out
- [ ] Housekeeping task management
- [ ] Maintenance ticketing
- [ ] Staff attendance tracking
- [ ] Activity logs

### Phase 3 - Financial & Leakage Control
- [ ] Detailed revenue tracking
- [ ] Cost center management
- [ ] Inventory tracking
- [ ] Fraud detection rules
- [ ] Daily financial summaries

### Phase 4 - CRM & Marketing
- [ ] Guest profiles and history
- [ ] Guest segmentation
- [ ] Loyalty points system
- [ ] Marketing campaigns
- [ ] Review management

### Phase 5 - Advanced Revenue
- [ ] Dynamic pricing engine
- [ ] Upsell automation
- [ ] OTA channel manager integration
- [ ] Corporate/group bookings
- [ ] Marketplace for services

## Monetization Model

1. **Subscription SaaS:**
   - Starter: $49/month (10 rooms)
   - Professional: $149/month (50 rooms)
   - Enterprise: $399/month (unlimited)

2. **Performance Fees:**
   - 1.5% on direct bookings
   - 2.5% on other channels

3. **Services:**
   - Setup and onboarding fees
   - Training
   - Custom development

## Contributing

This is a commercial project. Contact for licensing.

## License

Proprietary - All rights reserved.
