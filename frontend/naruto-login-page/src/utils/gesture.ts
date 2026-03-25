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
     * V2: High fidelity multi-joint analysis
     */
    extractFeatures: (landmarks: Landmark[]) => {
        if (landmarks.length < 21) return null;

        /**
         * Joint Angles (MCP-PIP-DIP-Tip)
         * Each finger has 4 segments (3 joints)
         */
        const fingerRanges = [
            [1, 2, 3, 4],    // Thumb
            [5, 6, 7, 8],    // Index
            [9, 10, 11, 12], // Middle
            [13, 14, 15, 16],// Ring
            [17, 18, 19, 20] // Pinky
        ];

        const angles: number[] = [];

        fingerRanges.forEach((range, fIdx) => {
            // Joint 1 (MCP / CMC for thumb)
            angles.push(gestureUtils.calculateAngle(landmarks[0], landmarks[range[0]], landmarks[range[1]]));
            // Joint 2 (PIP / MCP for thumb)
            angles.push(gestureUtils.calculateAngle(landmarks[range[0]], landmarks[range[1]], landmarks[range[2]]));
            // Joint 3 (DIP / IP for thumb)
            angles.push(gestureUtils.calculateAngle(landmarks[range[1]], landmarks[range[2]], landmarks[range[3]]));
        });

        // 2. Spread Angles (Angle between MCPs relative to wrist)
        for (let i = 0; i < 4; i++) {
            angles.push(gestureUtils.calculateAngle(landmarks[fingerRanges[i][0]], landmarks[0], landmarks[fingerRanges[i + 1][0]]));
        }

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
     * V4: Per-Finger Strict matching
     */
    compareAgainstSignature: (
        currentHands: { landmarks: Landmark[]; label: string }[],
        signatureHands: { landmarks: Landmark[]; label: string }[]
    ): { score: number, hint: string | null } => {
        if (currentHands.length === 0 || signatureHands.length === 0) return { score: 999, hint: null };

        let totalScoreSum = 0;
        let worstFingerHint: string | null = null;
        const fingerNames = ['นิ้วหัวแม่มือ', 'นิ้วชี้', 'นิ้วกลาง', 'นิ้วนาง', 'นิ้วก้อย'];

        signatureHands.forEach(sigHand => {
            const sigFeatures = gestureUtils.extractFeatures(sigHand.landmarks);
            if (!sigFeatures) return;

            let bestHandMatchScore = 999;
            let currentHandHint: string | null = null;

            currentHands.forEach(currHand => {
                // 0. Handedness Check (Mandatory)
                if (currHand.label !== sigHand.label) {
                    return;
                }

                const currFeatures = gestureUtils.extractFeatures(currHand.landmarks);
                if (!currFeatures) return;

                // 1. Calculate Per-Finger Error
                let maxFingerError = 0;
                let fingerWithMaxError = -1;
                let absoluteJointFail = false;

                // There are 5 fingers, each has 3 joint angles
                for (let fIdx = 0; fIdx < 5; fIdx++) {
                    let fingerAngleDiff = 0;
                    for (let jIdx = 0; jIdx < 3; jIdx++) {
                        const idx = fIdx * 3 + jIdx;
                        const diff = Math.abs(currFeatures.angles[idx] - sigFeatures.angles[idx]);

                        // User-Friendly cutoff (relaxed from 40 to 50)
                        if (diff > 50) absoluteJointFail = true;

                        // Squared penalty (relaxed from cubic)
                        fingerAngleDiff += Math.pow(diff / 90, 2);
                    }
                    fingerAngleDiff /= 3;

                    // Distance error for this finger
                    const distDiff = Math.abs(currFeatures.tipDistances[fIdx] - sigFeatures.tipDistances[fIdx]);
                    const fingerTotalError = (fingerAngleDiff * 0.9) + (Math.pow(distDiff, 1.1) * 0.1);

                    if (fingerTotalError > maxFingerError) {
                        maxFingerError = fingerTotalError;
                        fingerWithMaxError = fIdx;
                    }
                }

                // 2. Global Spread Match
                let spreadError = 0;
                for (let i = 15; i < 19; i++) {
                    const diff = Math.abs(currFeatures.angles[i] - sigFeatures.angles[i]);
                    spreadError += Math.pow(diff / 30, 2);
                }
                spreadError /= 4;

                // 3. Final Score
                let handCombinedScore = (maxFingerError * 0.8) + (spreadError * 0.2);
                if (absoluteJointFail) handCombinedScore += 0.25; // Light penalty (relaxed)

                if (handCombinedScore < bestHandMatchScore) {
                    bestHandMatchScore = handCombinedScore;

                    if (maxFingerError > 0.05) {
                        const midJointIdx = fingerWithMaxError * 3 + 1;
                        const action = currFeatures.angles[midJointIdx] < sigFeatures.angles[midJointIdx] ? 'กาง' : 'พับ';
                        currentHandHint = `[Security] ท่าทาง${fingerNames[fingerWithMaxError]} ผิดท่า (กาง/พับ ผิดปกติ)`;
                    }
                }
            });

            // If no hand matched the handedness
            if (bestHandMatchScore >= 999) {
                const targetSide = sigHand.label === 'Left' ? 'มือซ้าย' : 'มือขวา';
                currentHandHint = `กรุณาใช้${targetSide}ตามที่บันทึกไว้ครับ`;
            }

            totalScoreSum += bestHandMatchScore;
            worstFingerHint = currentHandHint;
        });

        return {
            score: totalScoreSum / signatureHands.length,
            hint: worstFingerHint
        };
    }
};
