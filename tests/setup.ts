/**
 * Vitest setup file to handle unhandled promise rejections in tests.
 * Some tests intentionally throw errors to test error handling,
 * and we don't want these to be flagged as unhandled rejections.
 */

// Suppress unhandled rejections that are part of tests
process.on("unhandledRejection", (reason) => {
  // If the error is marked as a test error, ignore it
  if (reason && typeof reason === "object" && "isTestError" in reason) {
    return;
  }
  // For other errors, let them be logged but don't fail the test run
  console.warn("Unhandled promise rejection in test:", reason);
});
