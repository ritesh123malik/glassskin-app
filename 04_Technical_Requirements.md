# Technical Requirements

# Technical Requirements

## Architecture Overview
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Buttons, inputs, cards
│   ├── layout/          # Headers, navigation, tab bars
│   └── product/         # Product-specific components
├── screens/             # Screen-level components
│   ├── auth/            # Login, signup, onboarding
│   ├── home/            # Home, search, product listing
│   ├── cart/            # Cart, checkout screens
│   ├── orders/          # Order tracking, history
│   └── profile/         # User profile, settings
├── navigation/          # React Navigation configuration
├── services/            # API services, Supabase client
├── store/               # Zustand or Context for state management
├── hooks/               # Custom React hooks
├── utils/               # Helper functions, constants
├── assets/              # Images, icons, fonts
└── types/               # TypeScript type definitions
```

## Frontend Stack

### Core Libraries
- **React Native**: 0.73+ (latest stable)
- **React Navigation**: v6.x with Stack and Tab navigators
- **TypeScript**: 5.x for type safety
- **Zustand**: State management (lightweight alternative to Redux)
- **React Hook Form**: Form validation and management
- **Yup**: Schema validation for forms

### UI & Styling
- **NativeWind**: TailwindCSS for React Native
- **React Native SVG**: SVG icon support
- **React Native Fast Image**: Optimized image loading
- **React Native Gesture Handler**: Gesture-based interactions
- **React Native Reanimated**: Smooth animations

### Device & Platform
- **Expo**: Development and build tooling
- **Expo Notifications**: Push notification handling
- **Expo Image Picker**: Product review image uploads
- **Expo SQLite**: Local caching for offline support

## Backend Stack (Supabase)

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  category TEXT,
  tags TEXT[],
  images TEXT[],
  stock_quantity INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cart items table
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wishlist table
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  shipping_address JSONB NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[],
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key API Endpoints (Supabase Functions)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/products` - Fetch products with filtering and pagination
- `GET /api/products/{id}` - Fetch single product
- `POST /api/cart` - Add item to cart
- `GET /api/cart` - Get user cart
- `POST /api/checkout` - Create order and process payment
- `GET /api/orders` - Get user orders
- `GET /api/orders/{id}` - Get order details

### Supabase Services
- **Authentication**: Email/password and OAuth providers
- **Database**: PostgreSQL with Row Level Security
- **Storage**: Product images and user-generated content
- **Functions**: Edge functions for checkout processing
- **Realtime**: Order status updates via Realtime channels

## External Integrations

### Payment Processing
- **Stripe**: Credit/debit card processing
- **PayPal**: Alternative payment method
- Webhook handling for payment status updates

### Push Notifications
- **Expo Notifications**: Cross-platform notification service
- Firebase Cloud Messaging (FCM) for Android
- Apple Push Notification Service (APNs) for iOS

### Analytics
- **Expo Analytics**: Built-in analytics tracking
- **Sentry**: Error tracking and performance monitoring

## Development Environment

### Local Development
- **Node.js**: 18.x LTS
- **Yarn**: Package manager
- **Expo CLI**: Development server
- **Supabase CLI**: Local development environment
- **VS Code**: Recommended IDE with React Native extensions

### Testing Strategy
- **Jest**: Unit testing for utilities and hooks
- **React Native Testing Library**: Component testing
- **Detox**: End-to-end testing for critical flows
- **ESLint**: Code quality and consistency

### Build & Deployment
- **Expo Application Services (EAS)**: Build and submit to app stores
- **GitHub Actions**: CI/CD pipeline
- **App Store Connect**: iOS distribution
- **Google Play Console**: Android distribution

## Performance Requirements
- Initial load time: < 3 seconds on 4G
- Image loading: < 2 seconds with placeholder
- API response time: < 500ms for read operations
- Offline support: 7-day cache for product catalog
- Memory usage: < 200MB during normal operation

## Security Requirements
- All API communications over HTTPS
- JWT tokens for authentication with 24-hour expiry
- Row Level Security policies in Supabase
- Input validation and sanitization
- PCI-DSS compliance for payment processing
- Secure storage for sensitive user data