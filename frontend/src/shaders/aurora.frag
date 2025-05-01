precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec3 vLocalRayOrigin;
varying vec3 vLocalRayDir;
uniform vec3 lightDirection;

uniform vec3 uMagneticNorth;
uniform vec3 uMagneticSouth;

mat2 mm2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, s, -s, c);
}
mat2 m2 = mat2(0.95534, 0.29552, -0.29552, 0.95534);

float tri(float x) {
    return clamp(abs(fract(x) - 0.5), 0.01, 0.49);
}
vec2 tri2(vec2 p) {
    return vec2(tri(p.x) + tri(p.y), tri(p.y + tri(p.x)));
}

float triNoise2d(vec2 p, float spd) {
    float z = 1.8;
    float z2 = 2.5;
    float rz = 0.0;
    p *= mm2(p.x * 0.06);
    vec2 bp = p;

    for (float i = 0.0; i < 5.0; i++) {
        vec2 dg = tri2(bp * 1.85) * 0.75;
        dg *= mm2(uTime * spd);
        p -= dg / z2;

        bp *= 1.3;
        z2 *= 0.45;
        z *= 0.42;
        p *= 1.21 + (rz - 1.0) * 0.02;

        rz += tri(p.x + tri(p.y)) * z;
        p *= -m2;
    }

    return clamp(1.0 / pow(rz * 29.0, 1.3), 0.0, 0.55);
}

float hash21(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

vec4 aurora(vec3 ro, vec3 rd) {
    vec4 col = vec4(0.0);
    vec4 avgCol = vec4(0.0);

    vec3 surfaceNormal = normalize(rd);
    float intensity = dot(surfaceNormal, normalize(lightDirection));
    float normalized = intensity * 0.5 + 0.5;
    float nightFactor = 1.0 - smoothstep(0.42, 0.58, normalized); // 1 = full night

    for (float i = 0.0; i < 60.0; i++) {
        float of = 0.006 * hash21(gl_FragCoord.xy) * smoothstep(0.0, 10.0, i);
        float pt = ((0.75 + pow(i, 1.4) * 0.002) - ro.y) / (rd.y * 2.0 + 0.4);
        pt -= of;

        vec3 bpos = ro + pt * rd;
        bpos += -normalize(bpos) * (0.08 + i * 0.0015); // extended height, softened compression

        // --- Magnetic proximity fade ---
        float distNorth = distance(normalize(bpos), normalize(uMagneticNorth));
        float distSouth = distance(normalize(bpos), normalize(uMagneticSouth));
        float magneticFade = 1.0 - smoothstep(0.18, 0.8, min(distNorth, distSouth));

        // --- Local day/night filter at this point ---
        float sunIntensity = dot(normalize(bpos), normalize(lightDirection));
        float sunNorm = sunIntensity * 0.5 + 0.5;
        float localNight = 1.0 - smoothstep(0.42, 0.58, sunNorm);

        // --- Additional dimming on daylight South Pole auroras ---
        if (bpos.y < 0.0 && sunNorm > 0.5) {
            localNight *= 0.4; // strong dimming
        }

        // --- Aurora flicker/shape ---
        float rzt = triNoise2d(bpos.xz * vec2(26.0, 18.0), 0.07) * magneticFade * localNight * 1.8;

        vec4 col2 = vec4(0.0);
        col2.rgb = (sin(1.0 - vec3(2.15, -0.5, 1.2) + (i * 1.25) * 0.043) * 0.5 + 0.5) * rzt;
        col2.a = rzt;

        avgCol = mix(avgCol, col2, 0.5);
        col += avgCol * exp2(-i * 0.065 - 2.5) * smoothstep(0.0, 5.0, i);
    }

    return col * 0.6 * mix(0.0, 0.80, nightFactor); // global night dimming
}

void main() {
    vec3 ro = vLocalRayOrigin;
    vec3 rd = normalize(vLocalRayDir);
    vec4 aur = aurora(ro, rd);
    gl_FragColor = vec4(aur.rgb, aur.a);
}
