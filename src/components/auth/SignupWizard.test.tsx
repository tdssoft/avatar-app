import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignupWizard from "@/components/auth/SignupWizard";

const navigateMock = vi.fn();
const signupMock = vi.fn();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signup: signupMock,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("SignupWizard", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signupMock.mockReset();
  });

  it("requires first name and last name on step 3", async () => {
    render(
      <MemoryRouter>
        <SignupWizard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Wgraj zdjęcie później"));
    fireEvent.click(screen.getByRole("button", { name: "Dalej ->" }));

    expect(await screen.findByText("Ustaw login i hasło")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rejestracja" }));

    expect(await screen.findByText("Imię musi mieć minimum 2 znaki")).toBeInTheDocument();
    expect(await screen.findByText("Nazwisko musi mieć minimum 2 znaki")).toBeInTheDocument();
    expect(signupMock).not.toHaveBeenCalled();
  });

  it("passes firstName and lastName to signup", async () => {
    signupMock.mockResolvedValue({ success: true, nextRoute: "/dashboard" });

    render(
      <MemoryRouter>
        <SignupWizard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Wgraj zdjęcie później"));
    fireEvent.click(screen.getByRole("button", { name: "Dalej ->" }));

    expect(await screen.findByText("Ustaw login i hasło")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Imię"), { target: { value: "Jan" } });
    fireEvent.change(screen.getByLabelText("Nazwisko"), { target: { value: "Kowalski" } });
    fireEvent.change(screen.getByLabelText("Numer Telefonu"), { target: { value: "123456789" } });
    fireEvent.change(screen.getByLabelText("Adres E-mail"), { target: { value: "jan.kowalski@example.com" } });
    fireEvent.change(screen.getByLabelText("Hasło"), { target: { value: "Test1234" } });
    fireEvent.change(screen.getByLabelText("Powtórz Hasło"), { target: { value: "Test1234" } });

    fireEvent.click(screen.getByRole("button", { name: "Rejestracja" }));

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Jan",
          lastName: "Kowalski",
        }),
      );
    });
  });
});
