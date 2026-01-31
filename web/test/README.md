# Testing Guide

This project uses **Vitest** for unit testing and **React Testing Library** for component testing.

## Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test File Naming

- Unit tests: `filename.test.ts`
- Component tests: `ComponentName.test.tsx`
- Integration tests: `feature.integration.test.ts`

## Testing Patterns

### 1. Pure Functions (Easiest)

Test pure utility functions with simple input → output assertions:

```typescript
// src/features/promo-codes/utils.test.ts
import { describe, it, expect } from "vitest";
import { calculateDiscount } from "./utils";

describe("calculateDiscount", () => {
  it("should calculate 50% discount correctly", () => {
    const result = calculateDiscount(100, "percent", 50);

    expect(result.discountedPrice).toBe(50);
    expect(result.discountAmount).toBe(50);
  });
});
```

### 2. UI Components

Test components using React Testing Library:

```typescript
// src/components/ui/badge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Badge } from './badge';

describe('Badge Component', () => {
  it('should render with text', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge).toHaveClass('bg-destructive');
  });
});
```

### 3. Hooks with User Interactions

Test custom hooks and user interactions:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';

describe('PromoCodeInput', () => {
  it('should call onApply when button clicked', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(<PromoCodeInput onApply={onApply} />);

    const input = screen.getByPlaceholderText('Enter promo code');
    const button = screen.getByRole('button', { name: /apply/i });

    await user.type(input, 'SAVE50');
    await user.click(button);

    expect(onApply).toHaveBeenCalledWith('SAVE50');
  });
});
```

### 4. Async Operations & API Calls

Mock API calls with vi.fn():

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import * as api from '@/features/promo-codes/api';

vi.mock('@/features/promo-codes/api');

describe('PromoCodeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display promo codes from API', async () => {
    const mockPromoCodes = [
      { id: '1', code: 'SAVE50', type: 'percent', amount: 50 },
    ];

    vi.mocked(api.getPromoCodes).mockResolvedValue(mockPromoCodes);

    render(<PromoCodeList />);

    await waitFor(() => {
      expect(screen.getByText('SAVE50')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

### ✅ DO

- **Test behavior, not implementation** - Focus on what users see/do
- **Use semantic queries** - `getByRole`, `getByLabelText`, `getByText`
- **Test user interactions** - Clicks, typing, form submissions
- **Mock external dependencies** - API calls, Supabase, Stripe
- **Write descriptive test names** - "should show error when promo code expired"
- **Keep tests isolated** - Each test should be independent

### ❌ DON'T

- **Don't test implementation details** - Avoid testing state/props directly
- **Don't use `getByTestId` as first choice** - Use semantic queries first
- **Don't make tests too brittle** - Avoid exact text matches when possible
- **Don't test third-party libraries** - Trust they work, test your usage
- **Don't write tests that are too complex** - If test is hard to write, refactor code

## Common Mocks

### Mock Supabase Client

```typescript
import { vi } from "vitest";

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
};

vi.mock("@/lib/supabase/client", () => ({
  supabase: mockSupabase,
}));
```

### Mock React Router

```typescript
import { vi } from "vitest";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: "test-id" }),
  };
});
```

## Test Coverage Goals

- **Critical business logic**: 80%+ coverage
- **UI components**: 60%+ coverage
- **Utility functions**: 90%+ coverage
- **Overall project**: 70%+ coverage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
