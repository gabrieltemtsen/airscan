"use client";

import Link from "next/link";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function NavAuthButtons() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <Button asChild variant="gold" size="sm">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm">Sign in</Button>
      </SignInButton>
      <SignInButton mode="modal">
        <Button variant="gold" size="sm">Get started free</Button>
      </SignInButton>
    </div>
  );
}

export function HeroAuthButton() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <Button asChild variant="gold" size="lg" className="text-base px-8">
        <Link href="/dashboard">Go to Dashboard →</Link>
      </Button>
    );
  }

  return (
    <SignInButton mode="modal">
      <Button variant="gold" size="lg" className="text-base px-8">
        Start Free Trial →
      </Button>
    </SignInButton>
  );
}
