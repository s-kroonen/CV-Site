"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileModel, PrivateContactModel } from "@/generated/prisma/models";
import { asSocialLinks } from "@/lib/json";

export function ProfileForm({
  profile,
  privateContact,
}: {
  profile: ProfileModel | null;
  privateContact: PrivateContactModel | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const socialLinksText = profile
    ? asSocialLinks(profile.socialLinks)
        .map((l) => `${l.label}|${l.url}`)
        .join("\n")
    : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);

    const socialLinks = String(data.get("socialLinks") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, url] = line.split("|").map((s) => s.trim());
        return { label, url };
      });

    const profilePayload = {
      name: data.get("name"),
      tagline: data.get("tagline"),
      bio: data.get("bio"),
      publicEmail: data.get("publicEmail"),
      location: data.get("location"),
      socialLinks,
    };

    const contactPayload = {
      email: data.get("privateEmail"),
      phone: data.get("privatePhone"),
    };

    const [profileRes, contactRes] = await Promise.all([
      fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      }),
      fetch("/api/admin/private-contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactPayload),
      }),
    ]);

    if (!profileRes.ok || !contactRes.ok) {
      setSaving(false);
      setError("Could not save. Check the fields and try again.");
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name" name="name" defaultValue={profile?.name} required />
      <Field label="Tagline" name="tagline" defaultValue={profile?.tagline} required />
      <TextArea label="Bio" name="bio" defaultValue={profile?.bio} required rows={6} />
      <Field label="Public email (always visible)" name="publicEmail" defaultValue={profile?.publicEmail} required />
      <Field label="Location" name="location" defaultValue={profile?.location} required />
      <TextArea
        label="Social links (one per line, format: Label|https://url)"
        name="socialLinks"
        defaultValue={socialLinksText}
        rows={4}
      />

      <div className="mt-4 border-t border-current/10 pt-4">
        <p className="mb-3 text-sm opacity-70">
          Hidden from bots/scrapers - only shown to visitors who click &quot;reveal&quot; on the public page.
        </p>
        <div className="flex flex-col gap-4">
          <Field label="Private email" name="privateEmail" defaultValue={privateContact?.email} required />
          <Field label="Phone" name="privatePhone" defaultValue={privateContact?.phone} required />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-md bg-current px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="opacity-70">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded-md border border-current/20 bg-transparent px-3 py-2"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  required,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="opacity-70">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        rows={rows}
        className="rounded-md border border-current/20 bg-transparent px-3 py-2"
      />
    </label>
  );
}
