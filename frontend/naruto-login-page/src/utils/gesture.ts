import { FingerStatus, Landmark } from '../types';

const SNAPSHOT_SIZE = 32;

const average = (values: number[]) => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type DetectedHand = { landmarks: Landmark[]; label: string };

export const gestureUtils = {
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

    calculateProportions: (landmarks: Landmark[]): number[] => {
        if (landmarks.length < 21) return [];

        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        const palmSize = Math.sqrt(
            Math.pow(middleMCP.x - wrist.x, 2) +
            Math.pow(middleMCP.y - wrist.y, 2) +
            Math.pow(middleMCP.z - wrist.z, 2)
        );

        const fingerTips = [4, 8, 12, 16, 20];
        return fingerTips.map((tipIdx) => {
            const tip = landmarks[tipIdx];
            const dist = Math.sqrt(
                Math.pow(tip.x - wrist.x, 2) +
                Math.pow(tip.y - wrist.y, 2) +
                Math.pow(tip.z - wrist.z, 2)
            );
            return dist / (palmSize || 1);
        });
    },

    extractFeatures: (landmarks: Landmark[]) => {
        if (landmarks.length < 21) return null;

        const fingerRanges = [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 16],
            [17, 18, 19, 20]
        ];

        const angles: number[] = [];

        fingerRanges.forEach((range) => {
            angles.push(gestureUtils.calculateAngle(landmarks[0], landmarks[range[0]], landmarks[range[1]]));
            angles.push(gestureUtils.calculateAngle(landmarks[range[0]], landmarks[range[1]], landmarks[range[2]]));
            angles.push(gestureUtils.calculateAngle(landmarks[range[1]], landmarks[range[2]], landmarks[range[3]]));
        });

        for (let i = 0; i < 4; i += 1) {
            angles.push(gestureUtils.calculateAngle(landmarks[fingerRanges[i][0]], landmarks[0], landmarks[fingerRanges[i + 1][0]]));
        }

        const tipIndices = [4, 8, 12, 16, 20];
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        const palmUnit = Math.sqrt(
            Math.pow(wrist.x - middleMCP.x, 2) +
            Math.pow(wrist.y - middleMCP.y, 2) +
            Math.pow(wrist.z - middleMCP.z, 2)
        );

        const tipDistances = tipIndices.map((index) => {
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

    extractHandSnapshot: (video: HTMLVideoElement | null, hands: DetectedHand[]): number[] | null => {
        if (!video || hands.length === 0 || !video.videoWidth || !video.videoHeight) {
            return null;
        }

        const allLandmarks = hands.flatMap((hand) => hand.landmarks);
        if (allLandmarks.length === 0) return null;

        let minX = 1;
        let minY = 1;
        let maxX = 0;
        let maxY = 0;

        allLandmarks.forEach((landmark) => {
            minX = Math.min(minX, landmark.x);
            minY = Math.min(minY, landmark.y);
            maxX = Math.max(maxX, landmark.x);
            maxY = Math.max(maxY, landmark.y);
        });

        const padding = 0.18;
        const paddedMinX = clamp(minX - padding, 0, 1);
        const paddedMinY = clamp(minY - padding, 0, 1);
        const paddedMaxX = clamp(maxX + padding, 0, 1);
        const paddedMaxY = clamp(maxY + padding, 0, 1);

        const sx = paddedMinX * video.videoWidth;
        const sy = paddedMinY * video.videoHeight;
        const sw = Math.max(1, (paddedMaxX - paddedMinX) * video.videoWidth);
        const sh = Math.max(1, (paddedMaxY - paddedMinY) * video.videoHeight);

        const canvas = document.createElement('canvas');
        canvas.width = SNAPSHOT_SIZE;
        canvas.height = SNAPSHOT_SIZE;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return null;

        context.drawImage(video, sx, sy, sw, sh, 0, 0, SNAPSHOT_SIZE, SNAPSHOT_SIZE);
        const imageData = context.getImageData(0, 0, SNAPSHOT_SIZE, SNAPSHOT_SIZE).data;
        const pixels: number[] = [];

        for (let index = 0; index < imageData.length; index += 4) {
            const r = imageData[index];
            const g = imageData[index + 1];
            const b = imageData[index + 2];
            const grayscale = ((0.299 * r) + (0.587 * g) + (0.114 * b)) / 255;
            pixels.push(grayscale);
        }

        const mean = average(pixels);
        const centered = pixels.map((pixel) => pixel - mean);
        const magnitude = Math.sqrt(centered.reduce((sum, value) => sum + (value * value), 0)) || 1;
        return centered.map((value) => value / magnitude);
    },

    compareImageSnapshots: (currentSnapshot: number[] | null, savedSnapshots: number[][]): number => {
        if (!currentSnapshot || savedSnapshots.length === 0) {
            return 999;
        }

        const template = currentSnapshot.map((_, index) => average(savedSnapshots.map((snapshot) => snapshot[index] ?? 0)));
        const diff = average(currentSnapshot.map((value, index) => Math.abs(value - (template[index] ?? value))));
        return diff;
    },

    compareAgainstSignature: (
        currentHands: DetectedHand[],
        signatureCaptures: DetectedHand[][]
    ): { score: number, hint: string | null } => {
        if (currentHands.length === 0 || signatureCaptures.length === 0) {
            return { score: 999, hint: null };
        }

        const captureScores = signatureCaptures
            .map((templateHands) => {
                let totalScore = 0;

                for (const templateHand of templateHands) {
                    let bestTemplateMatch = Number.POSITIVE_INFINITY;

                    currentHands.forEach((currentHand) => {
                        const currentFeatures = gestureUtils.extractFeatures(currentHand.landmarks);
                        const templateFeatures = gestureUtils.extractFeatures(templateHand.landmarks);
                        if (!currentFeatures || !templateFeatures) {
                            return;
                        }

                        const angleError = average(
                            currentFeatures.angles.map((angle, index) => Math.abs(angle - templateFeatures.angles[index]) / 180)
                        );
                        const distanceError = average(
                            currentFeatures.tipDistances.map((distance, index) => Math.abs(distance - templateFeatures.tipDistances[index]))
                        );
                        const currentProportions = gestureUtils.calculateProportions(currentHand.landmarks);
                        const templateProportions = gestureUtils.calculateProportions(templateHand.landmarks);
                        const proportionError = average(
                            currentProportions.map((value, index) => Math.abs(value - (templateProportions[index] ?? value)))
                        );

                        const combinedError = (angleError * 0.5) + (distanceError * 0.3) + (proportionError * 0.2);
                        bestTemplateMatch = Math.min(bestTemplateMatch, combinedError);
                    });

                    if (!Number.isFinite(bestTemplateMatch)) {
                        return Number.POSITIVE_INFINITY;
                    }

                    totalScore += bestTemplateMatch;
                }

                return totalScore / templateHands.length;
            })
            .filter((score) => Number.isFinite(score));

        if (captureScores.length === 0) {
            return { score: 999, hint: 'Show your saved gesture clearly in the camera frame.' };
        }

        return {
            score: average(captureScores),
            hint: null
        };
    },

    validateRule: (hands: DetectedHand[], rules: FingerStatus[]): { valid: boolean, message: string | null } => {
        if (hands.length === 0) return { valid: false, message: 'Please place your hand in the camera frame.' };

        const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

        for (const hand of hands) {
            const features = gestureUtils.extractFeatures(hand.landmarks);
            if (!features) continue;

            for (let index = 0; index < 5; index += 1) {
                const rule = rules[index];
                if (rule === 'ANY') continue;

                const isExtended = features.tipDistances[index] > 0.65;
                if (rule === 'EXTENDED' && !isExtended) {
                    return { valid: false, message: `Please extend your ${fingerNames[index]} finger.` };
                }
                if (rule === 'FOLDED' && isExtended) {
                    return { valid: false, message: `Please fold your ${fingerNames[index]} finger.` };
                }
            }
        }

        return { valid: true, message: null };
    }
};
