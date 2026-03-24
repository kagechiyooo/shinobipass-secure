import { Landmark } from '../types';

export const gestureUtils = {
    normalizeLandmarks: (landmarks: Landmark[]): Landmark[] => {
        if (landmarks.length === 0) return [];
        const wrist = landmarks[0];
        return landmarks.map(lm => ({
            x: lm.x - wrist.x,
            y: lm.y - wrist.y,
            z: lm.z - wrist.z
        }));
    },

    calculateDistance: (l1: Landmark[], l2: Landmark[]): number => {
        if (l1.length !== l2.length) return 999;
        let total = 0;
        for (let i = 0; i < l1.length; i++) {
            const dx = l1[i].x - l2[i].x;
            const dy = l1[i].y - l2[i].y;
            const dz = l1[i].z - l2[i].z;
            total += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return total / l1.length;
    },

    compareAgainstSignature: (currentLandmarksSet: Landmark[][], signatureLandmarks: Landmark[][]): number => {
        if (currentLandmarksSet.length === 0 || signatureLandmarks.length === 0) return 1.0;

        let minScore = 1.0;

        signatureLandmarks.forEach(sigHand => {
            const normalizedSig = gestureUtils.normalizeLandmarks(sigHand);
            currentLandmarksSet.forEach(currHand => {
                const normalizedCurr = gestureUtils.normalizeLandmarks(currHand);
                const score = gestureUtils.calculateDistance(normalizedCurr, normalizedSig);
                if (score < minScore) minScore = score;
            });
        });

        return minScore;
    }
};
