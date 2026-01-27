/**
 * Utility function to generate video names.
 * Pure function - no side effects.
 *
 * Naming convention:
 * - Text version: "{ScriptName} - {Format} - {EditorName}"
 * - No Text version: "{ScriptName} - {Format} - {EditorName} - No Text"
 * - Scrollstopper with text: "{ScriptName} - {Format} - {EditorName} - SS{N}"
 * - Scrollstopper no text: "{ScriptName} - {Format} - {EditorName} - SS{N} - No Text"
 *
 * Script name already contains: "{Product} - Script NNNN - {Author}"
 * So full name becomes: "GhostWing - Script 1001 - Nick - Vertical - Waqar"
 * Or with scrollstopper: "GhostWing - Script 1001 - Nick - Vertical - Waqar - SS2"
 */
export function generateVideoName(
  scriptName: string,
  format: string,
  editorName: string,
  hasText: boolean,
  scrollstopperNumber?: number
): string {
  let name = `${scriptName} - ${format} - ${editorName}`;

  // Add scrollstopper suffix if provided (SS2, SS3, etc.)
  // Note: Original videos don't have a scrollstopper number (implicitly SS1)
  if (scrollstopperNumber !== undefined && scrollstopperNumber >= 2) {
    name = `${name} - SS${scrollstopperNumber}`;
  }

  // Add "No Text" suffix last
  if (!hasText) {
    name = `${name} - No Text`;
  }

  return name;
}
