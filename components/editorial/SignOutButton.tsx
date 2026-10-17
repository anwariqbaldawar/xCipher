"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import BrandLoader from "@/components/common/BrandLoader";

export default function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSigningOut(true);
          signOut({ callbackUrl: "/admin/login" });
        }}
        className="btn-cs p-2 sm:px-3 sm:py-1.5 flex items-center justify-center gap-2"
        style={{ cursor: "pointer" }}
        title="Sign out"
      >
        <span className="hidden sm:inline">Sign out</span>
        <LogOut className="w-4 h-4 sm:hidden" />
      </button>
      {signingOut && <BrandLoader status="SIGNING OUT…" />}
    </>
  );
}
