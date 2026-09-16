import { BookingCounter } from "@/models/BookingCounter";

const COUNTER_KEY = "booking:number:v2";
const DEFAULT_START = 5000;

function getStartNumber() {
  const parsed = Number(process.env.BOOKING_NUMBER_START || DEFAULT_START);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_START;
  }
  return parsed;
}

async function nextSequence() {
  const startNumber = getStartNumber();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const counter = await BookingCounter.findOneAndUpdate(
        { key: COUNTER_KEY },
        [
          {
            $set: {
              key: { $ifNull: ["$key", COUNTER_KEY] },
              seq: {
                $add: [
                  { $ifNull: ["$seq", startNumber - 1] },
                  1,
                ],
              },
            },
          },
        ],
        {
          upsert: true,
          new: true,
          updatePipeline: true,
        },
      )
        .lean()
        .exec();

      const sequence = Number(counter?.seq || 0);
      if (!Number.isInteger(sequence) || sequence < startNumber) {
        continue;
      }
      return sequence;
    } catch (error) {
      // First-write races can throw duplicate key; retry is safe.
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Could not generate unique booking number.");
}

export async function generateReadableBookingNumber() {
  const sequence = await nextSequence();
  return String(sequence);
}
