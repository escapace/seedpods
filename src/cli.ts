import { parseArgs } from 'node:util'
import { deriveKey } from './utilities/derive-key'

const help = () =>
  console.log(`Usage:
  seedpods --secret <secret>

Repository:
  https://github.com/escapace/seedpods

Options:
  --secret     [secret]       [string] string for encryption and decryption (required)
  --iterations [iterations]   [number] number of PBKDF2 iterations (default: 600000)
  --salt       [port]         [string] string that is added to the secret (default: 3000)
  -h, --help                  Display this message
`)

try {
  const { values } = parseArgs({
    options: {
      help: {
        short: 'h',
        type: 'boolean'
      },
      iterations: {
        type: 'string'
      },
      salt: {
        type: 'string'
      },
      secret: {
        type: 'string'
      }
    },
    strict: true
  })

  if (values.help === true) {
    help()
    process.exit(0)
  }

  if (typeof values.secret !== 'string') {
    help()
    process.exit(1)
  }

  if (!['string', 'undefined'].includes(typeof values.salt)) {
    help()
    process.exit(1)
  }

  let iterations: number | undefined

  if (!['string', 'undefined'].includes(typeof values.iterations)) {
    if (typeof values.iterations === 'string') {
      const number = parseInt(values.iterations, 10)

      if (isNaN(number)) {
        help()
        process.exit(1)
      } else {
        iterations = number
      }
    }

    help()
    process.exit(1)
  }

  const key = await deriveKey(values.secret, { iterations, salt: values.salt })

  console.log(key.toString('base64'))
} catch (_) {
  help()
  process.exit(1)
}
