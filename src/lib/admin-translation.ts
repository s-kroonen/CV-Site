import { parseProvided, saveTranslation, type SaveResult, type TEntity } from "@/lib/translations";

/**
 * After an admin form saves an item: store the translation typed in the form, or
 * (re)translate automatically when a translation service is configured.
 * Never throws - a failed translation must not lose the saved item.
 */
export async function saveAdminTranslation(
  entity: TEntity,
  id: string,
  row: object,
  json: unknown,
): Promise<SaveResult> {
  const raw = json && typeof json === "object" ? (json as Record<string, unknown>).translation : undefined;
  try {
    return await saveTranslation({ entity, id, row: row as Record<string, unknown>, provided: parseProvided(entity, raw) });
  } catch {
    return { status: "failed", message: "The translation could not be saved." };
  }
}
