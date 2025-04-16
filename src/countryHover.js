// countryHover.js
let countryIdMapCanvas = null;
let countryIdCtx = null;
let imageLoaded = false;
let currentHoveredId = -1;
let countryNameLookup = {};

export async function loadCountryIdMapTexture() {
  await Promise.all([
    new Promise((resolve) => {
      const image = new Image();
      image.src = "/country_id_map_8k_rgb.png";
      image.onload = () => {
        countryIdMapCanvas = document.createElement("canvas");
        countryIdMapCanvas.width = image.width;
        countryIdMapCanvas.height = image.height;
        countryIdCtx = countryIdMapCanvas.getContext("2d");
        countryIdCtx.drawImage(image, 0, 0);
        imageLoaded = true;
        resolve();
      };
    }),
    fetch("/country_names_by_id.json")
      .then((res) => res.json())
      .then((data) => {
        countryNameLookup = data;
      }),
  ]);
}

export function updateHoveredCountry(
  raycaster,
  pointer,
  camera,
  globe,
  globeMaterial
) {
  if (!imageLoaded) return -1;

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(globe)[0];
  if (!hit || !hit.uv) return -1;

  const uv = hit.uv;
  const x = Math.floor(uv.x * countryIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * countryIdMapCanvas.height);
  const pixel = countryIdCtx.getImageData(x, y, 1, 1).data;
  const countryId = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];

  globeMaterial.uniforms.hoveredCountryId.value = countryId;

  if (countryId !== currentHoveredId) {
    const name = countryNameLookup[countryId] || "(unknown)";
    console.log(`Hovering country ID: ${countryId} (${name})`);
  }

  return countryId;
}
