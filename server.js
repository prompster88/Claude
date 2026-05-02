import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { higgsfield, config } from '@higgsfield/client/v2'

const app = express()
app.use(cors())
app.use(express.json())

const credentials = process.env.HF_CREDENTIALS
if (!credentials) {
  console.warn('[higgsfield] HF_CREDENTIALS not set — set it in .env as KEY_ID:KEY_SECRET')
} else {
  config({ credentials })
}

// Build a cinematic prompt from the player's game stats
function buildImagePrompt(score, solved, maxStreak) {
  const streakPhrase = maxStreak >= 5
    ? `a legendary ${maxStreak}-puzzle winning streak,`
    : maxStreak >= 3
    ? `a ${maxStreak}-puzzle streak,`
    : ''
  return [
    `Cinematic championship scene: a radiant golden trophy bathed in dramatic god rays,`,
    `the number ${score.toLocaleString()} glowing in bold championship lettering,`,
    `${solved} victories inscribed in light, ${streakPhrase}`,
    `floating particles, dark dramatic background, epic atmosphere, ultra photorealistic, 8K`
  ].join(' ')
}

// POST /api/generate-image
// Body: { score: number, solved: number, maxStreak: number }
// Returns: { url: string }
app.post('/api/generate-image', async (req, res) => {
  if (!credentials) {
    return res.status(503).json({ error: 'Higgsfield credentials not configured. Set HF_CREDENTIALS in .env.' })
  }

  const { score = 0, solved = 0, maxStreak = 0 } = req.body
  const prompt = buildImagePrompt(score, solved, maxStreak)

  try {
    const jobSet = await higgsfield.subscribe(
      'flux-pro/kontext/max/text-to-image',
      {
        input: { prompt, aspect_ratio: '9:16' },
        withPolling: true,
      }
    )

    const url = jobSet.jobs?.[0]?.results?.raw?.url
    if (jobSet.isCompleted && url) {
      return res.json({ url })
    }
    return res.status(500).json({ error: 'Image generation did not complete successfully.' })
  } catch (err) {
    console.error('[generate-image]', err.message)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/generate-video
// Body: { imageUrl: string }
// Returns: { url: string }
app.post('/api/generate-video', async (req, res) => {
  if (!credentials) {
    return res.status(503).json({ error: 'Higgsfield credentials not configured. Set HF_CREDENTIALS in .env.' })
  }

  const { imageUrl } = req.body
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required.' })
  }

  try {
    const jobSet = await higgsfield.subscribe(
      '/v1/image2video/dop',
      {
        input: {
          model: 'dop-turbo',
          prompt: 'Slow cinematic push-in, dramatic golden light flicker, floating particles, epic triumphant atmosphere',
          input_images: [{ type: 'image_url', image_url: imageUrl }],
        },
        withPolling: true,
      }
    )

    const url = jobSet.jobs?.[0]?.results?.raw?.url
    if (jobSet.isCompleted && url) {
      return res.json({ url })
    }
    return res.status(500).json({ error: 'Video generation did not complete successfully.' })
  } catch (err) {
    console.error('[generate-video]', err.message)
    return res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Higgsfield server running on http://localhost:${PORT}`)
})
