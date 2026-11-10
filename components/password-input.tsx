"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "./icons";
import { Input } from "./ui";

/** Passwortfeld mit Augen-Button zum Ein- und Ausblenden der Eingabe. */
export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={`pr-10 ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
        aria-pressed={visible}
        title={visible ? "Passwort verbergen" : "Passwort anzeigen"}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-control text-fg-subtle transition hover:text-fg focus-visible:text-fg focus-visible:outline-none"
      >
        <Icon name={visible ? "eyeOff" : "eye"} className="size-4" />
      </button>
    </div>
  );
}
