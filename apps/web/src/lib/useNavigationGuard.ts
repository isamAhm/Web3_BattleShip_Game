"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

interface NavigationGuardOptions {
  shouldBlock: boolean;
  message?: string;
  onNavigateAway?: () => void | Promise<void>;
  matchId?: string | null;
}

/**
 * Hook to prevent accidental navigation away from the current page
 * Shows confirmation dialog when user tries to navigate
 */
export function useNavigationGuard({
  shouldBlock,
  message = "You have an active match. Leaving will forfeit the game. Are you sure?",
  onNavigateAway,
  matchId,
}: NavigationGuardOptions) {
  const pathname = usePathname();
  const blockingRef = useRef(false);
  const messageRef = useRef(message);
  const onNavigateAwayRef = useRef(onNavigateAway);

  // Update refs
  useEffect(() => {
    blockingRef.current = shouldBlock;
    messageRef.current = message;
    onNavigateAwayRef.current = onNavigateAway;
  }, [shouldBlock, message, onNavigateAway]);

  // Save match state to localStorage when blocking is enabled
  useEffect(() => {
    if (shouldBlock && matchId) {
      localStorage.setItem("wba_active_match", matchId);
      console.log("[NavGuard] Active match saved:", matchId);
    } else if (!shouldBlock) {
      localStorage.removeItem("wba_active_match");
      console.log("[NavGuard] Active match cleared");
    }
  }, [shouldBlock, matchId]);

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (blockingRef.current) {
        console.log("[NavGuard] Blocking beforeunload");
        e.preventDefault();
        e.returnValue = messageRef.current;
        return messageRef.current;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    let isBlocking = false;

    const handlePopState = async (e: PopStateEvent) => {
      if (!blockingRef.current || isBlocking) return;

      console.log("[NavGuard] Blocking popstate");
      isBlocking = true;

      const shouldLeave = window.confirm(messageRef.current);

      if (shouldLeave) {
        console.log("[NavGuard] User confirmed navigation - forfeiting match");
        blockingRef.current = false; // Disable guard

        // Forfeit and clear match state
        await onNavigateAwayRef.current?.();
        localStorage.removeItem("wba_active_match");
        console.log("[NavGuard] Match forfeited and cleared from storage");

        // Navigation will proceed
      } else {
        console.log("[NavGuard] User cancelled navigation");
        // Re-push state to prevent navigation
        window.history.pushState(null, "", pathname);
      }

      isBlocking = false;
    };

    // Push initial state
    if (blockingRef.current) {
      window.history.pushState(null, "", pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [pathname]);

  // Intercept all link clicks
  useEffect(() => {
    const handleClick = async (e: MouseEvent) => {
      if (!blockingRef.current) return;

      // Find if click target is or contains a link
      let target = e.target as HTMLElement | null;
      let link: HTMLAnchorElement | null = null;

      while (target && target !== document.body) {
        if (target.tagName === "A") {
          link = target as HTMLAnchorElement;
          break;
        }
        target = target.parentElement;
      }

      if (!link) return;

      // Check if it's an internal navigation link
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("//")) {
        return; // External or hash link, allow it
      }

      // Check if navigating away from current page
      const currentPath = pathname;
      const isLeavingPage = !href.startsWith(currentPath);

      if (isLeavingPage) {
        console.log("[NavGuard] Intercepting link click to:", href);
        e.preventDefault();
        e.stopPropagation();

        const confirmed = window.confirm(messageRef.current);
        if (confirmed) {
          console.log("[NavGuard] User confirmed - forfeiting match and navigating");
          blockingRef.current = false; // Disable guard

          // Forfeit match and clear storage
          await onNavigateAwayRef.current?.();
          localStorage.removeItem("wba_active_match");
          console.log("[NavGuard] Match forfeited and cleared from storage");

          // Navigate manually
          window.location.href = href;
        } else {
          console.log("[NavGuard] User cancelled navigation");
        }
      }
    };

    // Capture phase to catch events before React
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  const navigateWithConfirmation = useCallback(
    async (url: string) => {
      if (blockingRef.current) {
        const shouldLeave = window.confirm(messageRef.current);
        if (!shouldLeave) {
          return false;
        }
        blockingRef.current = false;
        await onNavigateAwayRef.current?.();
        localStorage.removeItem("wba_active_match");
      }
      window.location.href = url;
      return true;
    },
    []
  );

  return { navigateWithConfirmation };
}

/**
 * Utility to check if there's an active match
 */
export function getActiveMatch(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("wba_active_match");
}

/**
 * Utility to clear active match
 */
export function clearActiveMatch(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("wba_active_match");
  console.log("[NavGuard] Active match cleared via utility");
}
