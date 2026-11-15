import { describe, expect, it, vi } from "vitest";

// If the server ever tried to save a registration, these would blow up.
const dbTouched = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("the database must not be touched while registration is closed");
  }),
);
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: dbTouched }));
vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/delegates-view", () => ({ fetchDelegateRegistrations: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { submitDelegateRegistration, type SubmitDelegateInput } from "../lib/actions/delegates";
import { DELEGATE_CLOSED_MESSAGE, DELEGATE_REGISTRATION_OPEN } from "../lib/submission-config";

const base: SubmitDelegateInput = {
  registrationType: "government", guestCode: "", volunteerSupport: "", fullName: "Test Person", officialEmail: "test@example.com",
  preferredEmail: "", organization: "Dubai Municipality", sectionDepartment: "", designation: "Officer", mobileNumber: "0500000000", nationality: "UAE",
};

describe("delegate registration is closed", () => {
  it("is switched off", () => expect(DELEGATE_REGISTRATION_OPEN).toBe(false));

  for (const type of ["government", "guest", "online", "volunteer"] as const) {
    it(`rejects a ${type} registration without touching the database`, async () => {
      // Even with the correct joining codes, nothing gets through.
      const result = await submitDelegateRegistration({ ...base, registrationType: type, guestCode: type === "guest" ? "20@difsc" : type === "online" ? "iafp" : "" });
      expect(result).toEqual({ ok: false, error: DELEGATE_CLOSED_MESSAGE });
      expect(dbTouched).not.toHaveBeenCalled();
    });
  }
});
