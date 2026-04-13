"use server";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "workspace";

export type FileItem = {
  name: string;
  id: string | null;
  size: number;
  mimetype: string;
  created_at: string;
  updated_at: string;
  isFolder: boolean;
  path: string;
};

/** Get the user's org ID */
async function getOrgId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new Error("No organization found");
  return membership.organization_id as string;
}

/** List files and folders at a given path */
export async function listFiles(folder: string = ""): Promise<{
  files: FileItem[];
  breadcrumbs: { name: string; path: string }[];
}> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const prefix = folder ? `${orgId}/${folder}` : orgId;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, {
      limit: 200,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) throw new Error(error.message);

  const files: FileItem[] = (data || []).map((item) => ({
    name: item.name,
    id: item.id,
    size: item.metadata?.size || 0,
    mimetype: item.metadata?.mimetype || "",
    created_at: item.created_at || "",
    updated_at: item.updated_at || "",
    isFolder: !item.id && !item.metadata,
    path: folder ? `${folder}/${item.name}` : item.name,
  }));

  // Build breadcrumbs
  const parts = folder ? folder.split("/").filter(Boolean) : [];
  const breadcrumbs = [
    { name: "Files", path: "" },
    ...parts.map((part, i) => ({
      name: part,
      path: parts.slice(0, i + 1).join("/"),
    })),
  ];

  return { files, breadcrumbs };
}

/** Upload files */
export async function uploadFiles(
  folder: string,
  formData: FormData
): Promise<{ uploaded: number; errors: string[] }> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const files = formData.getAll("files") as File[];
  const errors: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    const path = folder
      ? `${orgId}/${folder}/${file.name}`
      : `${orgId}/${file.name}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (error) {
      errors.push(`${file.name}: ${error.message}`);
    } else {
      uploaded++;
    }
  }

  return { uploaded, errors };
}

/** Create a folder (upload empty .keep file) */
export async function createFolder(
  parentFolder: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const path = parentFolder
    ? `${orgId}/${parentFolder}/${name}/.keep`
    : `${orgId}/${name}/.keep`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([""]), { upsert: true });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Delete a file or folder */
export async function deleteFile(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const fullPath = `${orgId}/${filePath}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([fullPath]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Delete multiple files */
export async function deleteFiles(
  filePaths: string[]
): Promise<{ deleted: number; errors: string[] }> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const fullPaths = filePaths.map((p) => `${orgId}/${p}`);
  const errors: string[] = [];

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove(fullPaths);

  if (error) {
    return { deleted: 0, errors: [error.message] };
  }

  return { deleted: fullPaths.length, errors };
}

/** Get a signed download URL */
export async function getDownloadUrl(
  filePath: string
): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const fullPath = `${orgId}/${filePath}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(fullPath, 3600); // 1 hour expiry

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl };
}

/** Rename / move a file */
export async function renameFile(
  oldPath: string,
  newPath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const { error } = await supabase.storage
    .from(BUCKET)
    .move(`${orgId}/${oldPath}`, `${orgId}/${newPath}`);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Get storage usage stats */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
}> {
  const supabase = await createClient();
  const orgId = await getOrgId();

  const { data } = await supabase.storage
    .from(BUCKET)
    .list(orgId, { limit: 1000 });

  const files = (data || []).filter((f) => f.id);
  const totalSize = files.reduce(
    (sum, f) => sum + (f.metadata?.size || 0),
    0
  );

  return { totalFiles: files.length, totalSize };
}
