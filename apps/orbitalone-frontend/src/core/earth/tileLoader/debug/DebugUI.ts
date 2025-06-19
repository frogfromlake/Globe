// tileLoader/debug/DebugUI.ts
export interface DebugFeature {
  key: keyof Window;
  label: string;
  type: "checkbox";
  default: boolean;
  section?: string;
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
    // container.style.border = "2px solid #0ff"; // uncomment to debug UI visibility
    document.body.appendChild(container);
  }
  container.innerHTML = "";

  // Add title
  const titleElem = document.createElement("strong");
  titleElem.textContent = title;
  container.appendChild(titleElem);
  container.appendChild(document.createElement("br"));

  // Group features by section
  const sections: Record<string, DebugFeature[]> = {};
  features.forEach((f) => {
    const section = f.section || "Core";
    if (!sections[section]) sections[section] = [];
    sections[section].push(f);
  });

  // Render feature checkboxes
  Object.entries(sections).forEach(([section, feats], sectionIdx) => {
    // Separate sections vertically, except for the first
    if (sectionIdx > 0) {
      const spacer = document.createElement("div");
      spacer.style.height = "14px";
      container.appendChild(spacer);
    }

    // Section header (only if NOT "Core")
    if (section !== "Core") {
      const sectionHeader = document.createElement("div");
      sectionHeader.textContent = section;
      sectionHeader.style.margin = "0 0 5px 0";
      sectionHeader.style.fontWeight = "bold";
      sectionHeader.style.fontSize = "13px";
      sectionHeader.style.opacity = "0.85";
      sectionHeader.style.borderTop = "1px solid #444";
      sectionHeader.style.paddingTop = "6px";
      container.appendChild(sectionHeader);
    }

    feats.forEach((feature) => {
      if (typeof windowAny[feature.key] === "undefined") {
        windowAny[feature.key] = feature.default;
      }
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.marginBottom = "4px";
      label.style.marginLeft = section !== "Core" ? "8px" : "0px"; // indent debug views

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
  });

  // --- FPS / Stats Section ---
  const statsSection = document.createElement("div");
  statsSection.style.marginTop = "10px";
  statsSection.style.padding = "8px";
  statsSection.style.background = "rgba(20,20,30,0.85)";
  statsSection.style.borderRadius = "6px";
  statsSection.style.fontFamily = "monospace";
  statsSection.style.fontSize = "11px";
  statsSection.style.opacity = "0.96";
  container.appendChild(statsSection);

  // Section header
  const statsHeader = document.createElement("div");
  statsHeader.textContent = "Stats";
  statsHeader.style.fontWeight = "bold";
  statsHeader.style.marginBottom = "5px";
  statsSection.appendChild(statsHeader);

  // Stats content (will be updated)
  const statsContent = document.createElement("div");
  statsContent.style.whiteSpace = "pre";
  statsSection.appendChild(statsContent);

  // Live stats updater (FPS, Zoom Distance, Current Z, Tile Count)
  let lastFrame = performance.now();
  function updateStatsOverlay() {
    const now = performance.now();
    const delta = now - lastFrame;
    lastFrame = now;
    const fps = 1000 / delta;

    const dtm = (window as any).dynamicTileManager;
    const camera = dtm?.camera;
    const scene = dtm?.scene;
    const currentZoom = dtm?.currentZoom;
    const zoomDistance =
      camera && camera.position
        ? Math.sqrt(
            camera.position.x * camera.position.x +
              camera.position.y * camera.position.y +
              camera.position.z * camera.position.z
          ).toFixed(1)
        : "-";
    // Try several tile counts: group count, total mesh count, etc
    let tileCount = "-";
    if (scene?.children) {
      // Grouped meshes (e.g., each TileGroup_Z*)
      const groupChildren = scene.children.filter((c: any) =>
        c.name?.startsWith("TileGroup_Z")
      );
      // Sum meshes inside groups, or fallback to group count
      let totalTiles = 0;
      groupChildren.forEach((g: any) => {
        totalTiles += g.children?.length ?? 0;
      });
      tileCount = totalTiles > 0 ? totalTiles : groupChildren.length;
    }

    statsContent.textContent = `FPS: ${fps.toFixed(
      1
    )}\nZoom Distance: ${zoomDistance}\nCurrent Z: ${
      currentZoom ?? "-"
    }\nTiles: ${tileCount}`;
    requestAnimationFrame(updateStatsOverlay);
  }
  updateStatsOverlay();
}
