import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";

// Define the type for our authentication context
type AuthContextType = {
  user: SelectUser | null;
  isAdmin: boolean; // Added isAdmin flag
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<SelectUser, "password">, Error, RegisterData>;
};

// Login data type (username and password only)
type LoginData = {
  username: string;
  password: string;
};

// Registration data type (extends the insert user schema)
const registerSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterData = z.infer<typeof registerSchema>;

// Create a context for authentication
// Create auth context with default values
const defaultContext: AuthContextType = {
  user: null,
  isAdmin: false,
  isLoading: false,
  error: null,
  loginMutation: {
    mutate: () => {},
    isLoading: false,
    isPending: false,
    error: null,
    data: undefined,
    reset: () => {},
    mutateAsync: async () => ({} as any),
    variables: undefined,
    isError: false,
    isIdle: true,
    isSuccess: false,
    isPaused: false,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    status: 'idle',
    context: undefined
  } as unknown as UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>,
  logoutMutation: {
    mutate: () => {},
    isLoading: false,
    isPending: false,
    error: null,
    data: undefined,
    reset: () => {},
    mutateAsync: async () => {},
    variables: undefined,
    isError: false,
    isIdle: true,
    isSuccess: false,
    isPaused: false,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    status: 'idle',
    context: undefined
  } as unknown as UseMutationResult<void, Error, void>,
  registerMutation: {
    mutate: () => {},
    isLoading: false,
    isPending: false,
    error: null,
    data: undefined,
    reset: () => {},
    mutateAsync: async () => ({} as any),
    variables: undefined,
    isError: false,
    isIdle: true,
    isSuccess: false,
    isPaused: false,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    status: 'idle',
    context: undefined
  } as unknown as UseMutationResult<Omit<SelectUser, "password">, Error, RegisterData>
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

// Provider component to wrap the app with authentication context
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Query for the current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Simple authentication that works
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Try simple endpoint that bypasses rate limiting
      const simpleRes = await apiRequest("POST", "/api/login-simple", credentials);
      
      if (!simpleRes.ok) {
        const errorData = await simpleRes.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || `Login failed: ${simpleRes.status}`);
      }
      
      const simpleData = await simpleRes.json();
      
      // Store JWT tokens if provided
      if (simpleData.accessToken && simpleData.refreshToken) {
        localStorage.setItem('accessToken', simpleData.accessToken);
        localStorage.setItem('refreshToken', simpleData.refreshToken);
      }
      
      return simpleData.user || simpleData;
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      queryClient.setQueryData(["/api/me"], userData);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.displayName || userData.username}!`,
      });
      // Use router navigation instead of window.location to avoid full page reload
      navigate('/home');
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for registration
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      // Remove confirmPassword as it's not needed by the API
      const { confirmPassword, ...registerData } = userData;
      const res = await apiRequest("POST", "/api/register", registerData);
      const responseData = await res.json();
      return responseData;
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      queryClient.setQueryData(["/api/me"], userData);
      toast({
        title: "Registration successful",
        description: `Welcome to FamFlix, ${userData.displayName || userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enhanced logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Clear JWT tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Also logout from session
      try {
        await apiRequest("POST", "/api/logout");
      } catch (error) {
        console.warn('Session logout failed, but JWT tokens cleared');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/me"], null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      // Use router navigation instead of window.location
      navigate('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Determine if the user is an admin
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isAdmin,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}