import { Landmark } from '../types';

export const gestureUtils = {
    /**
     * Calculates the angle between 3 points in 3D space
     */
    calculateAngle: (p1: Landmark, p2: Landmark, p3: Landmark): number => {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };

        const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

        if (mag1 === 0 || mag2 === 0) return 0;
        const cosTheta = dotProduct / (mag1 * mag2);
        return Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI);
    },

    /**
     * Extracts "Hand Pose Features" (multi-joint angles + normalized distances)
     */
    extractFeatures: (landmarks: Landmark[]) => {
        if (landmarks.length < 21) return null;

        // Finger landmarks indices:
        // Thumb: [1, 2, 3, 4]
        // Index: [5, 6, 7, 8]
        // Middle: [9, 10, 11, 12]
        // Ring: [13, 14, 15, 16]
        // Pinky: [17, 18, 19, 20]

        const fingerIndices = [
            [2, 3, 4],    // Thumb (MCP-IP-Tip)
            [5, 6, 8],    // Index (MCP-PIP-Tip)
            [9, 10, 12],  // Middle
            [13, 14, 16], // Ring
            [17, 18, 20]  // Pinky
        ];

        const angles: number[] = fingerIndices.map(indices =>
            gestureUtils.calculateAngle(landmarks[indices[0]], landmarks[indices[1]], landmarks[indices[2]])
        );

        // Normalize scale using "Palm Unit" (Wrist to Middle MCP)
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        const palmUnit = Math.sqrt(
            Math.pow(wrist.x - middleMCP.x, 2) +
            Math.pow(wrist.y - middleMCP.y, 2) +
            Math.pow(wrist.z - middleMCP.z, 2)
        );

        const tipIndices = [4, 8, 12, 16, 20];
        const tipDistances: number[] = tipIndices.map(index => {
            const tip = landmarks[index];
            const dist = Math.sqrt(
                Math.pow(tip.x - wrist.x, 2) +
                Math.pow(tip.y - wrist.y, 2) +
                Math.pow(tip.z - wrist.z, 2)
            );
            return dist / (palmUnit || 1);
        });

        return { angles, tipDistances };
    },

    /**
     * Compares current hand landmarks against a set of signature hands
     * Returns a score and a helpful hint for improvement
     */
    compareAgainstSignature: (currentHands: Landmark[][], signatureHands: Landmark[][]): { score: number, hint: string | null } => {
        if (currentHands.length === 0 || signatureHands.length === 0) return { score: 999, hint: null };

        let totalBestScore = 0;
        let worstFingerHint: string | null = null;
        let maxDiff = 0;

        const fingerNames = ['นิ้วหัวแม่มือ', 'นิ้วชี้', 'นิ้วกลาง', 'นิ้วนาง', 'นิ้วก้อย'];

        // Foreach signature hand, find the best match in the current detection
        signatureHands.forEach(sigHand => {
            const sigFeatures = gestureUtils.extractFeatures(sigHand);
            if (!sigFeatures) return;

            let bestHandMatch = 999;
            let handHint: string | null = null;

            currentHands.forEach(currHand => {
                const currFeatures = gestureUtils.extractFeatures(currHand);
                if (!currFeatures) return;

                // 1. Angle Similarity
                let angleScore = 0;
                const weights = [1.0, 1.2, 1.2, 1.0, 1.0];

                currFeatures.angles.forEach((angle, i) => {
                    const diff = Math.abs(angle - sigFeatures.angles[i]);
                    angleScore += (diff / 180) * weights[i];

                    // Track which finger is most "wrong"
                    if (diff > maxDiff && diff > 25) { // Only hint if diff is significant (>25 deg)
                        maxDiff = diff;
                        const action = angle < sigFeatures.angles[i] ? 'กาง' : 'พับ';
                        handHint = `กรุณา${action}${fingerNames[i]}ให้มากขึ้น`;
                    }
                });
                angleScore /= weights.reduce((a, b) => a + b, 0);

                // 2. Distance Ratio Similarity
                let distScore = 0;
                currFeatures.tipDistances.forEach((dist, i) => {
                    const diff = Math.abs(dist - sigFeatures.tipDistances[i]);
                    distScore += Math.min(diff, 1.0) * weights[i];
                });
                distScore /= weights.reduce((a, b) => a + b, 0);

                const combined = (angleScore * 0.6) + (distScore * 0.4);
                if (combined < bestHandMatch) {
                    bestHandMatch = combined;
                    worstFingerHint = handHint;
                }
            });

            totalBestScore += bestHandMatch;
        });

        return {
            score: totalBestScore / signatureHands.length,
            hint: worstFingerHint
        };
    }
};
