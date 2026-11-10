"use client";

import { useMe } from "@/components/dashboard/shell";
import { Icon } from "@/components/icons";
import { Avatar, Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { toSquareAvatar } from "@/lib/client/image";
import { useEffect, useRef, useState } from "react";
import { Feedback, Msg } from "./settings-section";

export function ProfileForm() {
  const { me, reload } = useMe();
  const [name, setName] = useState(me.user.name);
  const [phone, setPhone] = useState(me.user.phone ?? "");
  // undefined = unverändert, null = entfernen, Blob = neues Bild
  const [image, setImage] = useState<Blob | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(me.user.avatarUrl);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () =>
      void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)),
    [preview],
  );

  async function pick(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    try {
      const blob = await toSquareAvatar(file);
      setImage(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setMsg({
        tone: "error",
        text: errorMessage(err, "Bild konnte nicht geladen werden."),
      });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      if (image instanceof Blob) {
        const form = new FormData();
        form.append(
          "file",
          image,
          image.type === "image/webp" ? "avatar.webp" : "avatar.jpg",
        );
        await api("/me/avatar", {
          method: "POST",
          body: form,
          timeoutMs: 60_000,
        });
      } else if (image === null) {
        await api("/me/avatar", { method: "DELETE" });
      }
      const patch: { name?: string; phone?: string | null } = {};
      if (name.trim() && name.trim() !== me.user.name) patch.name = name.trim();
      if (phone.trim() !== (me.user.phone ?? ""))
        patch.phone = phone.trim() || null;
      if (Object.keys(patch).length)
        await api("/me", { method: "PATCH", body: patch });
      setImage(undefined);
      setMsg({ tone: "success", text: "Profil gespeichert." });
      reload();
    } catch (err) {
      setMsg({
        tone: "error",
        text: errorMessage(err, "Speichern fehlgeschlagen."),
      });
    } finally {
      setPending(false);
    }
  }

  const dirty =
    image !== undefined ||
    (name.trim() !== "" && name.trim() !== me.user.name) ||
    phone.trim() !== (me.user.phone ?? "");

  return (
    <form onSubmit={save}>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="group relative rounded-full focus:ring-2 focus:ring-brand-ink focus:ring-offset-2 focus:ring-offset-bg focus:outline-none"
          aria-label="Foto auswählen"
        >
          <Avatar name={name || me.user.name} src={preview} size="3xl" />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/30 text-fg opacity-0 transition group-hover:opacity-100">
            <Icon name="camera" className="size-6" />
          </span>
        </button>
        <div className="text-center sm:text-left">
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="camera" className="size-4" />{" "}
              {preview ? "Foto ändern" : "Foto hochladen"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setImage(null);
                  setPreview(null);
                }}
              >
                Entfernen
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            JPEG, PNG oder WebP · wird quadratisch zugeschnitten.
          </p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            autoComplete="name"
          />
        </Field>
        <Field
          label="Telefon (optional)"
          hint={
            me.user.role === "client"
              ? "Sehen nur dein Trainer und dein Studio – z. B. für kurzfristige Terminänderungen."
              : "Sehen nur Personen, mit denen du zusammenarbeitest."
          }
        >
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            autoComplete="tel"
            placeholder="z. B. +49 170 1234567"
          />
        </Field>
      </div>
      <Feedback msg={msg} />
      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Speichern …" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
