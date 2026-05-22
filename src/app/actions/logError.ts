"use server";

export async function logError(errorMsg: string, details?: any) {
  console.error("\n=================== SUPABASE ERROR ===================");
  console.error(`Message: ${errorMsg}`);
  if (details) {
    console.error("Details:", JSON.stringify(details, null, 2));
  }
  console.error("======================================================\n");
}
