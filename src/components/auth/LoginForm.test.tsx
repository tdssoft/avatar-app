import React from "react";
import { MemoryRouter } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import LoginForm from "@/components/auth/LoginForm";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue({ success: true }),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) })),
        })),
      })),
    })),
  },
}));

describe("LoginForm", () => {
  it("renders key auth controls", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    expect(html).toContain("Witamy w Avatar!");
    expect(html).toContain("Zapisz moje dane");
    expect(html).toContain("Zapomniałeś hasła?");
  });
});

