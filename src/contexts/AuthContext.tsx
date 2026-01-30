import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => void;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  photoOption: "upload" | "later";
  referralCode?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateReferralCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("avatar_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock login - in production, this would call an API
    const storedUsers = JSON.parse(localStorage.getItem("avatar_users") || "[]");
    const foundUser = storedUsers.find(
      (u: User & { password: string }) => u.email === email && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("avatar_user", JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  };

  const signup = async (data: SignupData): Promise<boolean> => {
    // Mock signup - in production, this would call an API
    const storedUsers = JSON.parse(localStorage.getItem("avatar_users") || "[]");
    
    // Check if email already exists
    if (storedUsers.some((u: User) => u.email === data.email)) {
      return false;
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      password: data.password,
      referralCode: generateReferralCode(),
      referredBy: data.referralCode,
      createdAt: new Date().toISOString(),
    };

    storedUsers.push(newUser);
    localStorage.setItem("avatar_users", JSON.stringify(storedUsers));

    // If user was referred, add to referrals list
    if (data.referralCode) {
      const referrals = JSON.parse(localStorage.getItem("avatar_referrals") || "[]");
      referrals.push({
        id: crypto.randomUUID(),
        referrerCode: data.referralCode,
        referredUserId: newUser.id,
        referredEmail: newUser.email,
        referredName: `${newUser.firstName} ${newUser.lastName}`,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("avatar_referrals", JSON.stringify(referrals));
    }

    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    localStorage.setItem("avatar_user", JSON.stringify(userWithoutPassword));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("avatar_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
