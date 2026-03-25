import { Landmark, FingerStatus, GestureSignature, HandFrame } from '../types';

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
     * Normalizes landmarks based on palm size (wrist to middle MCP)
     */
    normalizeLandmarks: (landmarks: Landmark[]): Landmark[] => {
        if (landmarks.length < 21) return landmarks;
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        const palmSize = Math.sqrt(Math.pow(middleMCP.x - wrist.x, 2) + Math.pow(middleMCP.y - wrist.y, 2) + Math.pow(middleMCP.z - wrist.z, 2)) || 1;

        return landmarks.map(l => ({
            x: (l.x - wrist.x) / palmSize,
            y: (l.y - wrist.y) / palmSize,
            z: (l.z - wrist.z) / palmSize
        }));
    },

    /**
     * Calculates Cosine Similarity between two feature vectors
     */
    calculateCosineSimilarity: (v1: number[], v2: number[]): number => {
        let dot = 0, mag1 = 0, mag2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            mag1 += v1[i] * v1[i];
            mag2 += v2[i] * v2[i];
        }
        return dot / (Math.sqrt(mag1) * Math.sqrt(mag2) || 1);
    },

    /**
     * Dynamic Time Warping (DTW) for sequence alignment
     */
    calculateDTW: (seq1: number[][], seq2: number[][]): number => {
        const n = seq1.length;
        const m = seq2.length;
        if (n === 0 || m === 0) return 1;

        const dtw = Array(n + 1).fill(0).map(() => Array(m + 1).fill(Infinity));
        dtw[0][0] = 0;

        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                const cost = 1 - gestureUtils.calculateCosineSimilarity(seq1[i - 1], seq2[j - 1]);
                dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
            }
        }
        return dtw[n][m] / Math.max(n, m);
    },

    extractFeatures: (landmarks: Landmark[]) => {
        if (landmarks.length < 21) return null;
        const normalized = gestureUtils.normalizeLandmarks(landmarks);
        const fingerRanges = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
        const angles: number[] = [];
        fingerRanges.forEach((range) => {
            angles.push(gestureUtils.calculateAngle(normalized[0], normalized[range[0]], normalized[range[1]]));
            angles.push(gestureUtils.calculateAngle(normalized[range[0]], normalized[range[1]], normalized[range[2]]));
            angles.push(gestureUtils.calculateAngle(normalized[range[1]], normalized[range[2]], normalized[range[3]]));
        });
        const tipDistances = [4, 8, 12, 16, 20].map(idx => {
            const tip = normalized[idx];
            return Math.sqrt(Math.pow(tip.x, 2) + Math.pow(tip.y, 2) + Math.pow(tip.z, 2));
        });
        return { angles, tipDistances, fullVector: [...angles, ...tipDistances] };
    },

    compareAgainstSignature: (
        currentHands: { landmarks: Landmark[]; label: string }[],
        signature: GestureSignature,
        currentSequence?: HandFrame[]
    ): { score: number, hint: string | null, behaviorMatch: number } => {
        if (currentHands.length === 0) return { score: 1, hint: 'กรุณาวางมือในกล้อง', behaviorMatch: 0 };

        const currHand = currentHands[0];
        const currFeatures = gestureUtils.extractFeatures(currHand.landmarks);
        if (!currFeatures) return { score: 1, hint: 'ไม่สามารถตรวจจับมือได้', behaviorMatch: 0 };

        let bestShapeScore = 0;
        let bestSequenceScore = 1;

        // 1. Shape Matching (Cosine Similarity)
        signature.captures.forEach(cap => {
            const lastFrame = cap[cap.length - 1];
            const sigFeatures = gestureUtils.extractFeatures(lastFrame.landmarks);
            if (sigFeatures) {
                const sim = gestureUtils.calculateCosineSimilarity(currFeatures.fullVector, sigFeatures.fullVector);
                if (sim > bestShapeScore) bestShapeScore = sim;
            }
        });

        // 2. Sequence Matching (DTW) - V9 PRO
        if (currentSequence && currentSequence.length > 5) {
            const currSeqVectors = currentSequence.map(f => gestureUtils.extractFeatures(f.landmarks)?.fullVector).filter(Boolean) as number[][];
            signature.captures.forEach(sigCap => {
                const sigSeqVectors = sigCap.map(f => gestureUtils.extractFeatures(f.landmarks)?.fullVector).filter(Boolean) as number[][];
                const dtwDist = gestureUtils.calculateDTW(currSeqVectors, sigSeqVectors);
                if (dtwDist < bestSequenceScore) bestSequenceScore = dtwDist;
            });
        }

        const shapeScore = 1 - bestShapeScore; // Convert to error distance
        const finalScore = (0.7 * shapeScore) + (0.3 * bestSequenceScore);

        return {
            score: finalScore,
            hint: finalScore > 0.4 ? 'ปรับท่าทางให้เหมือนตอนบันทึกครับ' : null,
            behaviorMatch: Math.max(0, 1 - (bestSequenceScore * 1.5))
        };
    },

    validateRule: (hands: { landmarks: Landmark[]; label: string }[], rules: FingerStatus[]): { valid: boolean, message: string | null } => {
        if (hands.length === 0) return { valid: false, message: 'กรุณาวางมือในกล้อง' };
        const fingerNames = ['นิ้วหัวแม่มือ', 'นิ้วชี้', 'นิ้วกลาง', 'นิ้วนาง', 'นิ้วก้อย'];
        for (const hand of hands) {
            const features = gestureUtils.extractFeatures(hand.landmarks);
            if (!features) continue;
            for (let i = 0; i < 5; i++) {
                const rule = rules[i];
                if (rule === 'ANY') continue;
                const isExtended = features.tipDistances[i] > 0.55;
                if (rule === 'EXTENDED' && !isExtended) return { valid: false, message: `กรุณากาง ${fingerNames[i]} ให้ถูกต้อง` };
                if (rule === 'FOLDED' && isExtended) return { valid: false, message: `กรุณาพับ ${fingerNames[i]} ให้ถูกต้อง` };
            }
        }
        return { valid: true, message: null };
    }
};
