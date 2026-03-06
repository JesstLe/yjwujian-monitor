import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

function checkPasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { score: 0, label: "", color: "", suggestions: [] };
  }

  // Length check
  if (password.length >= 8) {
    score++;
  } else {
    suggestions.push("At least 8 characters");
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    suggestions.push("Include uppercase letter");
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    suggestions.push("Include lowercase letter");
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    suggestions.push("Include number");
  }

  // Map score to label and color
  const strengthMap: Record<number, { label: string; color: string }> = {
    0: { label: "Very Weak", color: "bg-red-500" },
    1: { label: "Weak", color: "bg-red-400" },
    2: { label: "Fair", color: "bg-yellow-500" },
    3: { label: "Good", color: "bg-blue-500" },
    4: { label: "Strong", color: "bg-green-500" },
  };

  const { label, color } = strengthMap[score] || strengthMap[0];

  return { score, label, color, suggestions };
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordStrength = useMemo(
    () => checkPasswordStrength(password),
    [password]
  );

  const passwordsMatch = password === confirmPassword;
  const showConfirmError = confirmPassword.length > 0 && !passwordsMatch;

  const isFormValid =
    email.length > 0 &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFormValid) {
      setError("Please fill in all fields correctly");
      return;
    }

    setLoading(true);

    try {
      const result = await register(email, password, username || undefined);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Success state - show verification email sent message
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
        <div className="card max-w-md w-full p-8 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--color-success-glow)] flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[var(--color-success)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
            Verification Email Sent
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            We've sent a verification link to{" "}
            <span className="font-medium text-[var(--color-text-primary)]">
              {email}
            </span>
            . Please check your inbox and click the link to verify your account.
          </p>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
            Didn't receive the email? Check your spam folder or wait a few
            minutes.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[var(--color-accent-primary)] text-white font-medium hover:bg-[var(--color-accent-secondary)] transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4 py-8">
      <div className="card max-w-md w-full p-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
            Create Account
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Join to start monitoring item prices
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
            >
              Email <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:border-transparent transition-shadow"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Username (Optional) */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
            >
              Username{" "}
              <span className="text-[var(--color-text-tertiary)]">(optional)</span>
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:border-transparent transition-shadow"
              placeholder="Your display name"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
            >
              Password <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:border-transparent transition-shadow"
              placeholder="Create a password"
              required
              autoComplete="new-password"
            />

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                {/* Strength Bar */}
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        index < passwordStrength.score
                          ? passwordStrength.color
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>

                {/* Strength Label */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-tertiary)]">
                    Password strength
                  </span>
                  <span
                    className={`font-medium ${
                      passwordStrength.score >= 3
                        ? "text-[var(--color-success)]"
                        : passwordStrength.score >= 2
                          ? "text-[var(--color-warning)]"
                          : "text-[var(--color-error)]"
                    }`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>

                {/* Suggestions */}
                {passwordStrength.suggestions.length > 0 && (
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    Missing: {passwordStrength.suggestions.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
            >
              Confirm Password{" "}
              <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg border bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:border-transparent transition-shadow ${
                showConfirmError
                  ? "border-[var(--color-error)]"
                  : "border-[var(--color-border-default)]"
              }`}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
            />
            {showConfirmError && (
              <p className="mt-1.5 text-xs text-[var(--color-error)]">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-[var(--color-error-glow)] text-[var(--color-error)] text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`w-full py-2.5 rounded-lg font-medium text-white transition-colors ${
              loading || !isFormValid
                ? "bg-[var(--color-text-muted)] cursor-not-allowed"
                : "bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-secondary)]"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating Account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[var(--color-accent-primary)] font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
