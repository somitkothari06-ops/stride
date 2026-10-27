import type { Session } from "@supabase/supabase-js";
import { createAccountSession, deleteAccountSession, ownedWorkspace } from "./account-store";

// Both password and OAuth paths use the same verified identity and claim rules.
export function completeAccountSignIn(session: Session, guestToken?: string, previousAccountToken?: string) {
  const workspace = ownedWorkspace(session.user.id, guestToken);
  const token = createAccountSession(session.user.id, session.access_token, session.refresh_token, session.expires_at!);
  deleteAccountSession(previousAccountToken);
  return { token, claimed: workspace.claimed, next: workspace.state.profile.onboardingComplete ? "/workspace" : "/about-you" };
}
