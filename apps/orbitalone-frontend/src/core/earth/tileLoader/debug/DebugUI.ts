// tileLoader/debug/DebugUI.ts
export interface DebugFeature {
  key: keyof Window; // Enforces usage of declared window keys
  label: string;
  type: "checkbox";
  default: boolean;
}

export interface DebugUIOptions {
  features: DebugFeature[];
  containerId?: string;
  title?: string;
}

export function createDebugUI({
  features,
  containerId = "tile-debug-ui",
  title = "Tile Debug UI",
}: DebugUIOptions) {
  // Type assertion: use window as any for dynamic property access
  const windowAny = window as any;

  // Create or find container
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "fixed";
    container.style.top = "10px";
    container.style.left = "10px";
    container.style.background = "rgba(0,0,0,0.8)";
    container.style.color = "white";
    container.style.padding = "10px";
    container.style.fontFamily = "sans-serif";
    container.style.fontSize = "12px";
    container.style.borderRadius = "8px";
    container.style.zIndex = "10000";
    document.body.appendChild(container);
  }
  container.innerHTML = "";

  // Add title
  const titleElem = document.createElement("strong");
  titleElem.textContent = title;
  container.appendChild(titleElem);
  container.appendChild(document.createElement("br"));

  // Add each feature as a checkbox
  features.forEach((feature) => {
    // Set default on window (if not already set)
    if (typeof windowAny[feature.key] === "undefined") {
      windowAny[feature.key] = feature.default;
    }
    const label = document.createElement("label");
    label.style.display = "block";
    label.style.marginBottom = "4px";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(windowAny[feature.key]);
    input.style.marginRight = "5px";
    input.addEventListener("change", () => {
      windowAny[feature.key] = input.checked;
      console.log(`[DebugUI] ${feature.key} set to`, input.checked);
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode(feature.label));
    container.appendChild(label);
  });
}
