import type { Metadata } from "next";
import DelegateRegistrationForm from "@/components/DelegateRegistrationForm";
import RegistrationClosed from "@/components/RegistrationClosed";
import { DELEGATE_REGISTRATION_OPEN } from "@/lib/submission-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delegate Registration",
};

export default function RegisterPage() {
  if (!DELEGATE_REGISTRATION_OPEN) return <RegistrationClosed />;
  return <DelegateRegistrationForm />;
}
