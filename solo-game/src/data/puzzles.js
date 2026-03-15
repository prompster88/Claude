// SOLO — Find The One
// Each puzzle: [clue1, clue2, clue3] → answer
// The ANSWER word combines with each clue to form a real compound word / common phrase
// All verified for the Israeli tech audience
export const PUZZLES = [
  { id: 1,  clues: ['NET',     'FIRE',     'FRAME'],    answer: 'WORK',    hint: 'what makes things run'  },
  // network · firework · framework
  { id: 2,  clues: ['SUN',     'MOON',     'STAR'],     answer: 'LIGHT',   hint: 'it travels at 300,000 km/s' },
  // sunlight · moonlight · starlight
  { id: 3,  clues: ['THUNDER', 'BRAIN',    'SNOW'],     answer: 'STORM',   hint: 'nature at full force'  },
  // thunderstorm · brainstorm · snowstorm
  { id: 4,  clues: ['FREE',    'SOFT',     'HARD'],     answer: 'WARE',    hint: 'you use it every day'  },
  // freeware · software · hardware
  { id: 5,  clues: ['BLUE',    'BLACK',    'STRAW'],    answer: 'BERRY',   hint: 'from the garden'  },
  // blueberry · blackberry · strawberry
  { id: 6,  clues: ['OVER',    'BROAD',    'FORE'],     answer: 'CAST',    hint: 'predicting the future'  },
  // overcast · broadcast · forecast
  { id: 7,  clues: ['BREAK',   'WALK',     'RUN'],      answer: 'THROUGH', hint: 'crossing a boundary'  },
  // breakthrough · walkthrough · run-through
  { id: 8,  clues: ['PASS',    'CODE',     'CROSS'],    answer: 'WORD',    hint: 'language at its most essential'  },
  // password · codeword · crossword
  { id: 9,  clues: ['OPEN',    'OUT',      'CROWD'],    answer: 'SOURCE',  hint: 'where it all comes from'  },
  // open source · outsource · crowdsource
  { id: 10, clues: ['BIG',     'META',     'CLOUD'],    answer: 'DATA',    hint: 'the new oil'  },
  // big data · metadata · cloud data
  { id: 11, clues: ['PULL',    'MERGE',    'FEATURE'],  answer: 'REQUEST', hint: 'ask and you shall receive'  },
  // pull request · merge request · feature request
  { id: 12, clues: ['OVER',    'TO',       'ALL'],      answer: 'NIGHT',   hint: 'when the city really wakes up'  },
  // overnight · tonight · all-night
  { id: 13, clues: ['WORK',    'FIRE',     'BIRTH'],    answer: 'PLACE',   hint: 'location is everything'  },
  // workplace · fireplace · birthplace
  { id: 14, clues: ['TRADE',   'BOOK',     'POST'],     answer: 'MARK',    hint: 'leaving your signature'  },
  // trademark · bookmark · postmark
  { id: 15, clues: ['MIND',    'WAR',      'VIDEO'],    answer: 'GAME',    hint: 'all in your head'  },
  // mind game · war game · video game
  { id: 16, clues: ['SELF',    'SCREEN',   'STRESS'],   answer: 'TEST',    hint: 'know before you ship'  },
  // self-test · screen test · stress test
  { id: 17, clues: ['DEAD',    'HAIR',     'GUIDE'],    answer: 'LINE',    hint: 'thin and defining'  },
  // deadline · hairline · guideline
  { id: 18, clues: ['LIFE',    'FREE',     'HAIR'],     answer: 'STYLE',   hint: 'how you carry yourself'  },
  // lifestyle · freestyle · hairstyle
  { id: 19, clues: ['HARD',    'SOFT',     'UNDER'],    answer: 'COVER',   hint: 'what lies beneath'  },
  // hardcover · softcover · undercover
  { id: 20, clues: ['HEAD',    'EAR',      'MICRO'],    answer: 'PHONE',   hint: 'your voice, amplified'  },
  // headphone · earphone · microphone
  { id: 21, clues: ['BLACK',   'CARD',     'SKATE'],    answer: 'BOARD',   hint: 'flat surfaces of power'  },
  // blackboard · cardboard · skateboard
  { id: 22, clues: ['BATTLE',  'AIR',      'MINE'],     answer: 'FIELD',   hint: 'terrain of consequence'  },
  // battlefield · airfield · minefield
  { id: 23, clues: ['DOWN',    'UP',       'WORK'],     answer: 'LOAD',    hint: 'carrying the weight'  },
  // download · upload · workload
  { id: 24, clues: ['NOTE',    'TEXT',     'AUDIO'],    answer: 'BOOK',    hint: 'knowledge in a form'  },
  // notebook · textbook · audiobook
  { id: 25, clues: ['COME',    'DRAW',     'SET'],      answer: 'BACK',    hint: 'returning to where you started'  },
  // comeback · drawback · setback
  { id: 26, clues: ['DIGITAL', 'SOCIAL',   'PRINT'],    answer: 'MEDIA',   hint: 'the message is the medium'  },
  // digital media · social media · print media
  { id: 27, clues: ['SEED',    'ANGEL',    'SERIES'],   answer: 'ROUND',   hint: 'how startups grow'  },
  // seed round · angel round · series round
  { id: 28, clues: ['ABOUT',   'POKER',    'STRAIGHT'], answer: 'FACE',    hint: 'what you show the world'  },
  // about face · poker face · straight face
  { id: 29, clues: ['SILVER',  'BIG',      'TOUCH'],    answer: 'SCREEN',  hint: 'where all eyes go'  },
  // silver screen · big screen · touchscreen
  { id: 30, clues: ['SUN',     'WALL',     'WILD'],     answer: 'FLOWER',  hint: 'beauty without asking'  },
  // sunflower · wallflower · wildflower
]

// Returns today's puzzle deterministically
export function getTodaysPuzzle() {
  const epoch = new Date('2025-01-01T00:00:00Z')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today - epoch) / (1000 * 60 * 60 * 24))
  return PUZZLES[Math.abs(diffDays) % PUZZLES.length]
}

// Returns today's date string as YYYY-MM-DD for localStorage keying
export function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}
