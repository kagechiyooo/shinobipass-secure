import { Landmark } from '../types';

export const gestureUtils = {
    // Normalize landmarks: center at wrist and scale
    normalize: (landmarks: Landmark[]): Landmark[] => {
        if (landmarks.length === 0) return [];

        const wrist = landmarks[0];

        // Translate so wrist is at origin
        let normalized = landmarks.map(l => ({
            x: l.x - wrist.x,
            y: l.y - wrist.y,
            z: l.z - wrist.z
        }));

        // Scale based on distance from wrist to middle finger base (landmark 9)
        const mcp = normalized[9];
        const scale = Math.sqrt(mcp.x ** 2 + mcp.y ** 2 + mcp.z ** 2) || 1;

        return normalized.map(l => ({
            x: l.x / scale,
            y: l.y / scale,
            z: l.z / scale
        }));
    },

    // Calculate similarity between two sets of landmarks (lower is better)
    compare: (set1: Landmark[], set2: Landmark[]): number => {
        if (set1.length !== set2.length) return Infinity;

        const norm1 = gestureUtils.normalize(set1);
        const norm2 = gestureUtils.normalize(set2);

        let totalDistance = 0;
        for (let i = 0; i < norm1.length; i++) {
            const dx = norm1[i].x - norm2[i].x;
            const dy = norm1[i].y - norm2[i].y;
            const dz = norm1[i].z - norm2[i].z;
            totalDistance += Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
        }

        return totalDistance / norm1.length;
    },

    // Compare against a signature (multiple repetitions)
    compareAgainstSignature: (current: Landmark[], signatureLandmarks: Landmark[][]): number => {
        if (signatureLandmarks.length === 0) return Infinity;

        // Find the best match among repetitions
        const scores = signatureLandmarks.map(rep => gestureUtils.compare(current, rep));
        return Math.min(...scores);
    }
};
