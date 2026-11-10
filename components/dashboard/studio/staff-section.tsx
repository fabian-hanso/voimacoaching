"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { toSquareAvatar } from "@/lib/client/image";
import type { StaffCategory, StudioStaffMember } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { SectionTitle } from "./section-title";

export const STAFF_CATEGORIES: { value: StaffCategory; label: string }[] = [
  { value: "management", label: "Leitung" },
  { value: "service", label: "Service & Empfang" },
  { value: "other", label: "Weitere" },
];

const categoryLabel = (c: StaffCategory) =>
  STAFF_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export function StaffSection({
  staff,
  reload,
}: {
  staff: StudioStaffMember[];
  reload: () => void;
}) {
  const [editing, setEditing] = useState<StudioStaffMember | "new" | null>(
    null,
  );
  const [deleting, setDeleting] = useState<StudioStaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoFor = useRef<string | null>(null);

  async function uploadPhoto(file: File) {
    const id = photoFor.current;
    if (!id) return;
    setError(null);
    try {
      const blob = await toSquareAvatar(file);
      const form = new FormData();
      form.append(
        "file",
        blob,
        blob.type === "image/webp" ? "foto.webp" : "foto.jpg",
      );
      await api(`/studio/staff/${id}/photo`, {
        method: "POST",
        body: form,
        timeoutMs: 60_000,
      });
      reload();
    } catch (err) {
      setError(errorMessage(err, "Foto konnte nicht gespeichert werden."));
    }
  }

  return (
    <section>
      <SectionTitle
        title="Weitere Mitarbeitende"
        subtitle="Leitung, Service & Empfang und Co. – ohne eigenes Konto, sichtbar auf deiner Studio-Seite."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing("new")}
          >
            <Icon name="plus" className="size-3.5" /> Mitarbeitende hinzufügen
          </Button>
        }
      />
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {!staff.length ? (
        <EmptyState
          title="Noch niemand eingetragen"
          text="Trage z. B. deine Studioleitung oder das Team am Empfang ein – deine Kunden sehen dann, wer für sie da ist."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((m) => (
            <Card key={m.id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    photoFor.current = m.id;
                    photoInput.current?.click();
                  }}
                  aria-label={`Foto von ${m.name} ${m.photoUrl ? "ändern" : "hinzufügen"}`}
                  title="Foto ändern"
                  className="group relative shrink-0 rounded-full"
                >
                  <Avatar name={m.name} src={m.photoUrl} size="xl" />
                  <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/50 text-white opacity-0 transition group-hover:opacity-100">
                    <Icon name="camera" className="size-4" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{m.name}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {m.position ?? categoryLabel(m.category)}
                  </p>
                  <div className="mt-1">
                    <Badge
                      tone={m.category === "management" ? "brand" : "neutral"}
                    >
                      {categoryLabel(m.category)}
                    </Badge>
                  </div>
                </div>
              </div>
              {m.bio && (
                <p className="mt-3 line-clamp-3 text-sm text-fg-muted">
                  {m.bio}
                </p>
              )}
              <div className="mt-4 flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(m)}
                >
                  Bearbeiten
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    photoFor.current = m.id;
                    photoInput.current?.click();
                  }}
                >
                  <Icon name="camera" className="size-3.5" /> Foto
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleting(m)}
                >
                  Löschen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void uploadPhoto(f);
        }}
      />

      {editing && (
        <StaffDialog
          member={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`${deleting.name} entfernen?`}
          description={
            <p>{deleting.name} wird von deiner Studio-Seite entfernt.</p>
          }
          confirmWord="löschen"
          confirmLabel="Entfernen"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/studio/staff/${deleting.id}`, { method: "DELETE" });
            setDeleting(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

function StaffDialog({
  member,
  onClose,
  onSaved,
}: {
  member: StudioStaffMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: member?.name ?? "",
    category: member?.category ?? ("management" as StaffCategory),
    position: member?.position ?? "",
    bio: member?.bio ?? "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Foto: undefined = unverändert, null = entfernen, Blob = neu
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(
    member?.photoUrl ?? null,
  );
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () =>
      void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)),
    [preview],
  );

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await toSquareAvatar(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setError(errorMessage(err, "Bild konnte nicht geladen werden."));
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const saved = member
        ? await api<StudioStaffMember>(`/studio/staff/${member.id}`, {
            method: "PATCH",
            body: f,
          })
        : await api<StudioStaffMember>("/studio/staff", { body: f });
      if (photo instanceof Blob) {
        const form = new FormData();
        form.append(
          "file",
          photo,
          photo.type === "image/webp" ? "foto.webp" : "foto.jpg",
        );
        try {
          await api(`/studio/staff/${saved.id}/photo`, {
            method: "POST",
            body: form,
            timeoutMs: 60_000,
          });
        } catch (err) {
          // Person ist gespeichert – nur das Foto fehlt: Dialog schließen und Hinweis geben
          onSaved();
          window.alert(
            `${saved.name} wurde gespeichert, das Foto aber nicht: ${errorMessage(err)}`,
          );
          return;
        }
      } else if (photo === null && member?.photoUrl) {
        await api(`/studio/staff/${saved.id}/photo`, { method: "DELETE" });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Speichern fehlgeschlagen."));
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mitarbeitende"
    >
      <button
        aria-label="Abbrechen"
        tabIndex={-1}
        onClick={() => !pending && onClose()}
        className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]"
      />
      <form
        onSubmit={save}
        className="relative w-full max-w-md space-y-4 rounded-box bg-surface p-6 shadow-2xl ring-1 ring-line-strong"
      >
        <h2 className="text-lg font-semibold text-fg">
          {member ? `${member.name} bearbeiten` : "Mitarbeitende hinzufügen"}
        </h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            aria-label="Foto wählen"
            className="group relative rounded-full focus:ring-2 focus:ring-brand-ink focus:ring-offset-2 focus:outline-none"
          >
            <Avatar name={f.name || "?"} src={preview} size="2xl" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/50 text-white opacity-0 transition group-hover:opacity-100">
              <Icon name="camera" className="size-5" />
            </span>
          </button>
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => photoInput.current?.click()}
            >
              <Icon name="camera" className="size-3.5" />{" "}
              {preview ? "Foto ändern" : "Foto wählen"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setPhoto(null);
                  setPreview(null);
                }}
              >
                Foto entfernen
              </Button>
            )}
            <span className="text-[11px] text-fg-subtle">
              JPEG, PNG oder WebP · wird quadratisch zugeschnitten
            </span>
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <Field label="Name">
          <Input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            maxLength={100}
            required
            autoFocus
          />
        </Field>
        <Field label="Bereich">
          <Select
            value={f.category}
            onChange={(e) =>
              setF({ ...f, category: e.target.value as StaffCategory })
            }
          >
            {STAFF_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Position (optional)"
          hint="z. B. Studioleitung, Rezeption, Ernährungsberatung"
        >
          <Input
            value={f.position}
            onChange={(e) => setF({ ...f, position: e.target.value })}
            maxLength={80}
          />
        </Field>
        <Field label="Kurze Info (optional)">
          <Textarea
            value={f.bio}
            onChange={(e) => setF({ ...f, bio: e.target.value })}
            rows={3}
            maxLength={300}
            placeholder="z. B. „Ansprechpartnerin für Verträge und Kurse.“"
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={pending || !f.name.trim()}>
            {pending ? "Speichern …" : member ? "Speichern" : "Hinzufügen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
