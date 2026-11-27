import * as StoreReview from 'expo-store-review';

/**
 * Opens the system rating prompt (App Store or Google Play). The system decides whether it is shown (Apple allows it
 * a few times a year and never in TestFlight), so this only reports whether the prompt could be asked for.
 */
export async function askStoreReview(): Promise<boolean> {
  try {
    if (!(await StoreReview.isAvailableAsync())) return false;
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}

export async function storeReviewAvailable(): Promise<boolean> {
  try {
    return await StoreReview.isAvailableAsync();
  } catch {
    return false;
  }
}
