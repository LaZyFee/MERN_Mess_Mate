"use client";

import { useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Input from "@/components/shared/Input";

/** Input with a 44px show/hide toggle. Accepts every Input prop. */
export default function PasswordInput({ size = "lg", ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      size={size}
      {...props}
      type={shown ? "text" : "password"}
      rightElement={
        <button
          type="button"
          onClick={() => setShown((value) => !value)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="-mr-3 grid size-11 place-items-center rounded-full text-(--tm) transition-[var(--transition)] hover:text-(--p) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
        >
          {shown ? <LuEyeOff size={18} /> : <LuEye size={18} />}
        </button>
      }
    />
  );
}
