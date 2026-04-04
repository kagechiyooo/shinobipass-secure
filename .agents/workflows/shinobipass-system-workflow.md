---
description: ShinobiPass — System Workflow: Feature Extraction, Scoring, Storage & Hashing
---

# ShinobiPass — System Workflow

ระบบ ShinobiPass ใช้ gesture ของมือเป็น factor ที่ 2 หลังจากตรวจสอบรหัสผ่านแล้ว
โปรแกรมมี 2 phase หลัก: **Registration (บันทึก)** และ **Verification (ตรวจสอบ)**

---

## 1. การ Extract Feature ของมือ

> ใช้ **MediaPipe Hands** (WebAssembly) ผ่าน component `HandMarkers`
> ซึ่ง detect มือจาก webcam และส่งพิกัด landmark 21 จุด ต่อมือ (x, y, z normalized)

### Feature 3 ชนิดที่ดึงออกมาจาก `gesture.ts`

| Feature | Function | คำอธิบาย |
|---|---|---|
| **Joint Angles** | `calculateAngle()` | มุมที่ข้อนิ้วแต่ละข้อ คำนวณจาก dot-product ของ 2 vectors (ได้องศา 0–180°) — **15 มุมภายในนิ้ว + 4 มุมระหว่างนิ้ว (รวม 19 ค่า)** |
| **Tip Distances** | `extractFeatures()` | ระยะห่างจาก wrist ถึงปลายนิ้วทั้ง 5 หน่วยเป็น palm unit (normalized ด้วยระยะ wrist→middleMCP) |
| **Proportions** | `calculateProportions()` | สัดส่วนกายวิภาค (biometric ratio) ระยะปลายนิ้ว→wrist หารด้วย palm size |
| **Image Snapshot** | `extractHandSnapshot()` | crop มือจากวิดีโอ → resize เป็น 32×32 px → แปลงเป็น grayscale → normalize (mean-centered / unit-norm) → array of 1024 floats |

```
extractFeatures(landmarks) → { angles: number[19], tipDistances: number[5] }
extractHandSnapshot(video, hands) → number[1024]   // normalized 32×32 grayscale
calculateProportions(landmarks) → number[5]
```

---

## 2. การเก็บข้อมูล (Storage)

### ขั้นตอน Registration
1. ผู้ใช้ **เลือก gesture 4 แบบ** (slot 1–4)
2. แต่ละ slot **บันทึก 2 รอบ** (repetitions) → `autoSaveProgress` timer 1 วินาที
3. แต่ละรอบเก็บ:
   - `landmark_template` — raw landmarks (21 จุด x,y,z) ของทุกมือที่ตรวจเจอ
   - `snapshot_template` — float array[1024] (normalized grayscale 32×32)

4. ส่งไป backend `POST /register` แล้วบันทึกลง **Supabase** ตาราง `gesture_templates`

```
gesture_templates
├── user_id
├── slot_number (1–4)
├── landmark_template   ← raw landmarks JSON
└── snapshot_template   ← number[1024] array หรือ null
```

5. รหัสผ่านถูก hash ด้วย **Argon2** แล้วเก็บใน `users.password_hash`

### Frontend State (ก่อนส่ง backend)
```typescript
GestureSignature {
  signId: string
  captures: DetectedHand[][]   // [repetition][hand] → landmarks
  snapshots?: number[][]       // [repetition] → float[1024]
}
```

---

## 3. Flow การ Verify (Login)

```
POST /login (username + password)
  → argon2.verify() ตรวจรหัสผ่าน
  → สร้าง auth_challenge (sequence สุ่ม 4 ขั้น, TTL 10 นาที)
  → ส่ง challengeToken (JWT) + sequence + gesture_templates กลับมา

Frontend:
  ทุก 200ms (setInterval):
    1. ดึง landmark จาก buffer (5 frames ล่าสุด)
    2. extractHandSnapshot() → currentSnapshot
    3. คำนวณ score กับทุก signature → เรียงลำดับ
    4. ถ้า score ผ่าน threshold → holdProgress + progressStep
    5. ถ้า holdProgress ≥ 100 → POST /verify-gesture-step

POST /verify-gesture-step (bearing challengeToken)
  → ตรวจ expectedSlot vs detected_slot
  → อัปเดต current_step ใน auth_challenges
  → ถ้าครบ 4 ขั้น → ออก accessToken (JWT)
```

---

## 4. Scoring Algorithm

### Score รวมต่อ gesture (ยิ่งต่ำยิ่งดี — error distance)

```
getSignatureScore(signature, hands, snapshot):
  landmarkScore = compareAgainstSignature(hands, captures).score
  imageScore    = compareImageSnapshots(snapshot, snapshots)

  ถ้าไม่มี snapshots → return landmarkScore
  ถ้ามี snapshots     → (landmarkScore × 0.8) + (imageScore × 0.2)
```

#### `compareAgainstSignature` — Landmark Score

```
สำหรับแต่ละ repetition (template):
  สำหรับแต่ละ hand ใน template:
    เทียบกับทุก hand ที่ detect ได้ตอนนี้:
      angleError      = avg |currentAngle − templateAngle| / 180
      distanceError   = avg |currentTipDist − templateTipDist|
      proportionError = avg |currentProp − templateProp|
      combinedError   = (angleError × 0.5) + (distanceError × 0.3) + (proportionError × 0.2)
  
  ← avg ของ combinedError จากแต่ละ hand

ตอบ: avg ของทุก repetition (เอาค่าต่ำสุดต่อ hand ก่อน)
```

**Weight ภายใน landmark score:**
| Component | น้ำหนัก |
|---|---|
| Joint angles | **50%** |
| Tip distances | **30%** |
| Proportions (biometric) | **20%** |

#### `compareImageSnapshots` — Image Score

```
สร้าง template pixel-wise average จากทุก snapshot ที่บันทึกไว้
diff = avg |currentPixel − templatePixel|  (pixel-by-pixel absolute diff)
```

---

## 5. Threshold และเกณฑ์การตัดสิน

| ค่าคงที่ | Normal Mode | Strict Mode | ความหมาย |
|---|---|---|---|
| `MATCH_THRESHOLD` | **0.48** | 0.38 | score ≤ นี้ → ถือว่า gesture ตรง |
| `FAIL_THRESHOLD` | **0.78** | 0.68 | score ≤ นี้ + เป็น best match → ถือว่า gesture **ผิด** ชัดเจน |
| `BEST_MARGIN` | **0.03** | 0.06 | margin ที่ best match ต้องชนะ 2nd best ถึงเชื่อได้ |
| `TARGET_MARGIN` | **0.04** | 0.02 | target gesture ยอมเป็นรอง best match ได้ไม่เกินนี้ |
| `PROGRESS_STEP` | **40** | 25 | เพิ่ม holdProgress ต่อ tick (ต้องถึง 100) |
| `FAIL_STEP` | **12** | 16 | เพิ่ม failProgress ต่อ tick (ถึง 100 = fail attempt) |

**Finger extended/folded rule** (ใช้ใน `validateRule`):
```
tipDistance > 0.65  → EXTENDED
tipDistance ≤ 0.65  → FOLDED
```

### Logic การตัดสิน (ทุก 200ms)

```
isConfidentTargetMatch = targetScore ≤ MATCH_THRESHOLD
                         AND (เป็น best match OR targetScore − bestScore ≤ TARGET_MARGIN)

isConfidentWrongMatch  = !isConfidentTargetMatch
                         AND ไม่ใช่ target เป็น best match
                         AND bestScore ≤ FAIL_THRESHOLD
                         AND margin ≥ BEST_MARGIN
```

- `isConfidentTargetMatch` → holdProgress เพิ่ม (ถึง 100 = ผ่านขั้นนั้น)
- `isConfidentWrongMatch` → failProgress เพิ่ม (ถึง 100 = fail attempt)
- อื่นๆ → ค่อยๆ ลด holdProgress และ failProgress

---

## 6. ระบบความปลอดภัยและการ Lock

| กลไก | เงื่อนไข | ผลลัพธ์ |
|---|---|---|
| **Password brute-force lock** | attempts ≥ 3 | lock 5 วินาที (users.lock_until) |
| **Frontend gesture attempts** | 3 ครั้ง fail consecutively | cooldown 5 วินาที, reset เป็น step 1 |
| **Backend gesture sequence** | wrong slot 3 ครั้ง | lock_until 5 วินาที ใน auth_challenges, reset current_step → 0 |
| **Challenge TTL** | สร้างแล้ว 10 นาที | challenge หมดอายุ |
| **Rate limiting** | 10 req/min ต่อ IP | ทำได้ที่ /register, /login, /reset-password |

---

## 7. การ Hash รหัสผ่าน

ใช้ **Argon2** (`argon2` npm package) — algorithm ที่ชนะ Password Hashing Competition 2015

```typescript
// Registration / Reset password
const passwordHash = await argon2.hash(password);
// → เก็บใน users.password_hash

// Login verification
const isValid = await argon2.verify(user.password_hash, password);
```

Argon2 ใช้ default ของ library ซึ่งเป็น **Argon2id** (hybrid) พร้อม:
- Memory-hard (ป้องกัน GPU/ASIC attack)
- Salt แบบสุ่มอัตโนมัติในทุก hash
- ไม่ต้องใส่ salt เองเพราะ library จัดการให้

---

## 8. JWT Tokens

| Token | สร้างจาก | ใช้เพื่อ |
|---|---|---|
| **challengeToken** | `signChallengeToken({ userId, username, challengeId })` | แนบใน header ทุก `/verify-gesture-step` request |
| **accessToken** | `signAccessToken({ userId, username })` | ใช้หลัง gesture ครบ 4 ขั้น เพื่อเข้าถึง protected routes |

---

## 9. Diagram ภาพรวม

```
[Camera] → MediaPipe Hands → 21 Landmarks (x,y,z) per hand
                                    │
                    ┌───────────────┼─────────────────┐
                    ↓               ↓                   ↓
              Joint Angles    Tip Distances       Image Snapshot
              (19 values)      (5 values)        (32×32 grayscale
               via dot-        palm-unit          mean-centered
               product)       normalized)         unit-normed)
                    │               │                   │
                    └───────────────┴─────────────────┘
                                    │
                          [REGISTRATION]
                          บันทึก 2 รอบ/slot × 4 slots
                          → Supabase: gesture_templates
                          รหัสผ่าน → Argon2 hash → users

                          [VERIFICATION] (ทุก 200ms)
                          Score = landmark(80%) + image(20%)
                          ภายใน landmark:
                            angles(50%) + tipDist(30%) + prop(20%)
                          ─────────────────────────────────────
                          score ≤ 0.48 → holdProgress +40
                          holdProgress ≥ 100 → POST /verify-gesture-step
                          ครบ 4 ขั้น → issueAccessToken (JWT)
```
