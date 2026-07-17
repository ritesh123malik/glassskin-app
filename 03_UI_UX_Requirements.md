# UI/UX Requirements

# UI/UX Requirements

## Design System

The application strictly adheres to the **Glass Skincare Design System**, replacing the legacy dark theme. This system is defined by a monochromatic, editorial palette with a single iridescent champagne bronze accent.

**Binding Specification:** `docs/DESIGN_SYSTEM.md` is the single source of truth for all tokens.

### Color Palette
- **Surfaces**: Porcelain (`#F6F2EE`), Sand (`#EFE8E1`)
- **Text**: Ink (`#0B0B0C`), Ink Light (`#1A1A1D`), Muted (`#6B6660`)
- **Accent**: Champagne Bronze (`#8E5D34`), Soft Accent (`#D9B79A`), Accent Glow (`rgba(176,122,74,.22)`)
- **Borders/Lines**: Muted Line (`rgba(11,11,12,.08)`)

### Typography
- **Wordmark & Display**: `Raleway` (Weights: 200, 300, 800)
- **Body & Eyebrow**: `Inter` (Weights: 300, 400, 500, 600)
- **Italic**: `Playfair Display` (Italic: 400, 500, 600)
- **Type Scale Presets**: `wordmark`, `display`, `eyebrow`, `italic` (defined in `src/theme/typography.ts`)

### Glassmorphism Implementation
- **Glass Surfaces**: `rgba(255,255,255,.42)` and `rgba(255,255,255,.62)`
- **Glass Edge**: `rgba(255,255,255,.7)`
- **Glass Shadow**: Custom depth recipe via NativeWind
- **Native Rendering**: iOS/Web uses native blur filters; Android degrades gracefully to semi-opaque tints when `< API 31` (RenderEffect unsupported).

## Core Screens

### 1. Onboarding Flow
- Welcome screen with brand messaging
- Feature highlights (3 screens max)
- Login/Signup prompt

### 2. Home Screen
- Sticky header with search bar
- Hero banner carousel for promotions
- Category quick-access grid
- Featured products section
- Newsletter signup section

### 3. Product Listing Screen
- Filter button with count badge
- Sort dropdown (Price: Low-High, High-Low, Newest, Rating)
- Grid view toggle (2-column, 4-column)
- Loading skeletons for performance

### 4. Product Detail Screen
- Image gallery with zoom capability
- Product title and price header
- Description and usage instructions
- Ingredients list with expandable sections
- Quantity selector and Add to Cart button
- Wishlist toggle
- Related products section

### 5. Cart Screen
- Empty state illustration
- Cart item cards with image, name, price, quantity
- Quantity adjustment with +/- buttons
- Item removal with confirmation
- Cart total and tax display
- Proceed to Checkout button

### 6. Wishlist Screen
- Empty state with illustration
- Product grid layout
- Quick view and add to cart options
- Remove from wishlist functionality

### 7. Checkout Flow (Multi-step)
- Step 1: Shipping Address (map integration for location)
- Step 2: Payment Method (saved cards, new card form, PayPal)
- Step 3: Order Review (items, totals, shipping, taxes)
- Progress indicator showing current step

### 8. Order Confirmation Screen
- Order number display
- Estimated delivery date
- Next steps information
- Continue shopping button

### 9. Order Tracking Screen
- Visual timeline of order status
- Shipment tracking information
- Estimated delivery countdown
- Contact support option

### 10. User Profile Screen
- Profile header with avatar and name
- Menu items: Orders, Wishlist, Addresses, Payment Methods, Settings, Logout
- Notification settings toggle
- App version display

### 11. Login/Signup Screens
- Email and password fields with validation
- Social login buttons (Google, Apple)
- Terms and conditions agreement
- Error state handling

## Responsive Design
- Support for screen sizes: 320px (iPhone SE) to 430px (iPhone Pro Max)
- Adaptive layouts for portrait and landscape orientations
- Dynamic type scaling for accessibility
- Consistent 16px horizontal padding on all screens

## Accessibility Requirements
- Minimum touch target size: 44x44px
- Color contrast ratio: 4.5:1 for normal text, 3:1 for large text
- VoiceOver/TalkBack support for all interactive elements
- Alternative text for all images
- Focus management for keyboard navigation
- Reduced motion option for animations

## Motion & Interactions
- Smooth transitions between screens (300ms ease-in-out)
- Button press animations with ripple effects
- Pull-to-refresh functionality on scrollable lists
- Swipe-to-delete for cart items
- Haptic feedback for key interactions